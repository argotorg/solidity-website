---
layout: post
published: true
title: 'Misordered Named Parameters in require with Custom Errors Bug'
date: '2026-09-10'
author: Solidity Team
category: Security Alerts
---

On February 4, 2026, a bug in the IR-based code generator was reported by Carl from
[Spearbit](https://spearbit.com/) through the Ethereum Foundation bug bounty program. The
bug causes the arguments of a custom error passed to `require` using named-parameter syntax
to be placed on the stack in call-site order rather than declaration order before they are
ABI-encoded.

The bug was introduced in Solidity 0.8.26, which added support for passing custom errors as
the second argument to `require`.
[Solidity 0.8.37](https://github.com/ethereum/solidity/releases/tag/v0.8.37) provides a fix.

We assigned the bug a severity of "very low", therefore, the fix was not prioritized for an
expedited release.
The affected code is the construction of revert data for a transaction that is already going
to revert, so it has no impact on a contract's state.
Triggering the bug additionally requires a fairly specific pattern - a custom error passed to
`require` and instantiated with named arguments in a non-declaration order - and only affects
the IR based pipeline.

## Which Contracts Are Affected?

A contract is affected when **all** of the following conditions hold:

1. The contract is compiled with the IR-based pipeline (`--via-ir` on the command line or
   `viaIR: true` in Standard JSON). The evmasm pipeline is unaffected.
2. The contract uses `require(condition, ErrorName({...}))` where `ErrorName` is a user-defined
   error.
3. At least two arguments appear in an order differing from the declaration.
4. At least one of the reordered arguments is not a string literal.

Other language constructs that take similar code paths are **not** affected. As part of the due
diligence for the fix, all of them were checked and covered with tests.

## Technical Details

A custom error declaration specifies the order of its parameters, and that order determines its
ABI signature and the layout of its encoded payload:

```solidity
error NamedArgsError(uint256 a, uint256 b);
```

Solidity allows the caller to pass arguments by name, optionally in a different order
from the declaration:

```solidity
require(false, NamedArgsError({b: 7, a: 2}));
```

The compiler binds named arguments to parameters *by name*, so any permutation that mentions
every parameter exactly once is accepted by the type checker. The type system does not
require the call-site order to match the declaration. As a result, the bug could be triggered
by any reordering. This includes swaps of two arguments of the same type - a case where
nothing can catch the mistake, since there is no type mismatch for the compiler or a decoder
to detect. Perhaps more surprisingly, the compiler would also silently encode reorderings of
arguments of *different* types, without any error during compilation.

To see where the bug lives, it helps to follow the arguments from the call to the revert data.
The compiler emits code that evaluates the arguments and pushes them onto the stack in
declaration order. The ABI encoder then walks the error's parameter list and, for each
parameter, takes the next slots from the stack and appends their encoding to the revert data.
Most types occupy a single slot, holding either the value itself or a reference to it in
memory, storage or calldata. A few need more: external function pointers use two slots, and
dynamic `calldata` arrays carry an extra slot for their length. String literals use none,
since the value is part of the type and gets hard-coded into the encoder. The stack itself is
just a sequence of untyped slots, and nothing marks where one argument ends and the next begins.

In the IR-based code generator, the lowering of `require` with a custom error skipped the
reordering step: it pushed the arguments in the order they appeared at the call site, while
the encoder still consumed them in declaration order. With the snippet above, the contract
reverted with a payload whose first word held the value of `b` (`7`) and whose second word
held the value of `a` (`2`), so off-chain decoders would read `a = 7, b = 2` instead of the
intended `a = 2, b = 7`.

Standalone `revert ErrorName({...})` statements go through a different code path that
reorders arguments before encoding, and so were not affected. The bug was specific to the
`require`-with-custom-error path introduced in 0.8.26.

### Misinterpreted Values

Reordering parameters of *different* types that occupy the same number of stack slots
(say, a `uint256` and an `address`) also produced no misalignment: each value simply landed
in the other parameter's position and was encoded as if it had the other type. The payload
stayed structurally valid and simply contained the wrong values.

The same happened with reference types. Swapping a `uint256` with a memory array made the
encoder treat the integer as a memory offset and encode whatever it found there as the array's
contents, while the array's offset was encoded as the integer. Likewise for two references of
different kinds, such as a memory array and a storage array, or two structs with different
fields.

### Misalignment With Multi-Slot Arguments

The consequences went further when the reordered arguments occupied different numbers of stack
slots. Each argument's slots still arrived at the encoder grouped together, but since the
encoder split the stack according to the declaration, the boundaries between arguments no
longer lined up, and a parameter could be handed slots that belonged to a different argument.
String literals, occupying no slots at all, could not shift anything, which is why reordering
only them does not trigger the bug.

Consider:

```solidity
error StringAndUint(string a, uint256 b);

contract C {
    function f(string calldata s) external pure {
        require(false, StringAndUint({b: 42, a: s}));
    }
}
```

The encoding helper for `StringAndUint` expects to first receive the two slots that describe
`a` (the calldata string's offset and length), followed by the single slot that holds `b`.
With the bug it received `b`'s single slot first, followed by `a`'s two slots, and then
encoded them assuming the first two slots belonged to the dynamic-type parameter. The offset
field was therefore read from a value-type slot (`42`), the length field from what was actually
the string's calldata offset, and `b` ended up holding the string's length. The string data was
thus copied from an unrelated calldata offset, with a length that had nothing to do with the
string.

Depending on the actual values, the encoding could abort with an EVM-level error, which still
caused the transaction to revert - but with no decodable error data - rather than producing
the intended custom-error revert. Alternatively, the contract reverted with a payload that
still matched the error's ABI signature and decoded successfully: the misplaced words are
just numbers, and a small integer can easily pass for a valid offset. This case is
arguably worse - a consumer that matches on the error selector and decodes the fields
observes plausible-looking values that have no relation to the source-level arguments.

## Severity Assessment

Because the bug affects only the construction of revert data for transactions that are
already going to revert, it does not modify storage, return values, or external calls in the
reverting transaction itself. Revert data can, however, be observed on-chain: a caller may
intercept it with `try`/`catch` or as a result of a low-level `CALL` and branch on its contents, although doing
so is uncommon. The primary consequence is misleading consumers of revert data - block
explorers, indexers, error-decoding libraries, and test frameworks - that decode the payload
as if the values had been placed correctly, observing swapped or type-confused values. In
the stack-misalignment cases the failure is more visible: an encoding-level revert can
replace the intended custom-error revert, so code that distinguishes specific custom errors
from generic reverts may take a different branch than expected.

For exmaple, [ERC-3668 (CCIP Read)](https://eips.ethereum.org/EIPS/eip-3668) relies on clients decoding
the `OffchainLookup` custom error to drive off-chain data retrieval. While ERC-3668 includes
mechanisms that protect against forged revert errors, they do not help when an honest
contract emits mis-encoded revert data due to a compiler bug. Since `OffchainLookup` mixes
dynamic and value types, a misordering in an affected `require` would produce a payload that
decodes cleanly but carries the wrong values, breaking the lookup flow in a way that is not
necessarily easy to detect. Standards like this, which make revert data part of a contract's
interface, factored into our severity assessment.

There is no meaningful avenue for third-party exploitation. An attacker cannot introduce the
mis-encoding into a correctly written contract - the misordered named arguments must already
be present in the contract's own source code - and an attacker who merely wants to present
misleading revert data to a consumer can already do so trivially by deploying a contract that
reverts with arbitrary bytes. The harm is therefore limited to contracts unknowingly
emitting wrong data to consumers that trust them.

Named-argument syntax is uncommon in `require` calls in practice, and the bug remained
undetected for almost two years. The narrow trigger conditions, the read-only nature of the
affected code path, and the lack of any exploitation avenue together place this bug in the
"very low" severity tier.

## Recommended Actions

- Upgrade to Solidity 0.8.37 or later before deploying contracts compiled via IR, particularly
  if they use named parameters in custom errors.
- Until then, the bug can be avoided by writing the named arguments in declaration order, or by
  using positional arguments.
