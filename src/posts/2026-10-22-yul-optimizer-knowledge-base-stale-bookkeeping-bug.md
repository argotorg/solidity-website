---
layout: post
published: true
title: "Yul Optimizer Knowledge Base Stale Bookkeeping Bug"
date: "2026-10-22"
author: Solidity Team
category: Security Alerts
---

[//]: # "TODO: double-check the publication date (2026-10-22) in the front matter, the file name, and the link in docs/bugs.json of the compiler repo."

On August 17, 2026, [Daniel Boye](https://github.com/DanielBoye) reported a bug in the Yul optimizer through the Ethereum Foundation's bug bounty program.
Because of the bug, the optimizer can consider two memory or storage locations distinct even though they coincide at runtime.
As a result, a load can be replaced with an outdated value, or a store that is needed can be removed.
A second report by [Surya Prakash Akula](https://x.com/d4r3_d3v1l_), received on September 28, 2026, showed that the bug can be triggered from plain Solidity code, without any inline assembly.

We assign this bug a severity of _low_ on our internal scale.
Only code compiled with the Yul optimizer enabled is affected.
With `--via-ir` (`settings.viaIR` in Standard JSON), any code may be affected, including code without inline assembly.
The same applies to Yul compiled directly with `--strict-assembly` (`"language": "Yul"` in Standard JSON).
With the default evmasm pipeline, only compiler-generated Yul utility functions and inline assembly blocks that do not refer to any Solidity variables or functions may be affected.

The bug was introduced in Solidity 0.8.19.
All versions from 0.8.19 through 0.8.37 are affected.
The bug is fixed in Solidity 0.8.38.

We scanned the [Sourcify](https://sourcify.dev/) database with a development build of the compiler, once with and once without the fix.
This covered roughly 283,000 verified compilations with `--via-ir` and 607,000 with the evmasm pipeline.
None of them produced different bytecode.
This gives us confidence that the bug is very rare, but it does not rule out that a contract is affected.

## Which Contracts Are Affected?

A contract is only affected if **all** of the following conditions are met:

1. The Yul optimizer is enabled.
   This is the case with `--optimize` or `--optimize-yul` (`settings.optimizer.enabled` or `settings.optimizer.details.yul` in Standard JSON).
2. The optimizer step sequence contains `LoadResolver` (`L`) or `EqualStoreEliminator` (`E`).
   The default sequence contains both.
3. In the intermediate code that is the input to the `LoadResolver` and `EqualStoreEliminator` steps, a variable used to compute memory or storage addresses is reassigned.
   One address is derived from its value before the reassignment and another from its value after it, using different constant offsets.
4. At runtime, the two addresses point to the same location.

Conditions 3 and 4 cannot be reliably checked based on the source code alone.
In particular, the intermediate code that feeds into the affected optimizer steps depends on the compiler version, the optimizer sequence, and the surrounding code.
All reproducers we know of that use the default optimizer sequence follow the same pattern.
A local variable used to compute addresses is modified in a loop or branch, both before and after the first address is derived from it.
A different value is then stored to the same location through an address derived from the new value.

The target EVM version does not affect whether the bug manifests.

**If your contract is compiled with the Yul optimizer disabled, it is not affected.**

## Technical Details

This section describes the compiler internals behind the bug for readers interested in the implementation-level root cause.

### Tracking memory and storage contents

`LoadResolver` replaces `mload`, `sload`, and `keccak256` calls with values it already knows.
For example, it can reuse the value written by an earlier store to the same location.
`EqualStoreEliminator` removes stores of a value that the location is already known to contain.
Both rely on the same bookkeeping of the known contents of memory and storage.

Sometimes the optimizer cannot determine exactly which location a store writes to.
It then has to forget what it knows about every location the store might overwrite.
To decide which locations those are, it consults the `KnowledgeBase`, a component that answers questions about relations between variables.

### Addresses as offsets from a base variable

The `KnowledgeBase` represents a variable symbolically as a constant offset from a base variable.
If the value of the variable is a constant, the base is zero.
If the value is unknown or cannot be expressed as a constant offset, the variable is its own base with offset zero.
For example, after `let base := calldataload(0)` and `let ptr := add(base, 2)`, `base` is its own base and `ptr` is represented as `base + 2`.

Two addresses with the same base are known to be distinct if their offsets differ (for storage) or are at least 32 bytes apart (for memory).
The optimizer then does not invalidate what it knows about one of the two locations when the other is written to.

These representations are cached per variable.
The cache was introduced in Solidity 0.8.19.
Before that, the `KnowledgeBase` computed offsets on the fly from the current values of the variables.

### Stale cache entries

A cached entry becomes outdated when the value of its variable changes.
The cache was invalidated lazily.
Whenever the `KnowledgeBase` looked up a variable, it compared the variable's current value expression with the one it had seen last time.
If the two differed, it reset the cached entry.
This check could miss a reassignment in two ways:

- The value of the variable could be unknown both before and after the reassignment.
  This happens, for example, when it was assigned in a branch or loop and control flow had since joined.
  There was then no expression to compare, and no reset happened.
- The reset only happened when the reassigned variable itself was looked up.
  By then, the optimizer could already have retrieved the cached representation of an address derived from it, for the same comparison.

In both cases, two addresses were represented as offsets from the same base variable.
However, one was derived from the base's value before the reassignment and the other from its value after it.
The optimizer treated both offsets as relative to one and the same value.
It concluded that the two locations were distinct and kept what it knew about one of them across a store to the other.
If the two locations coincided at runtime, a later load from the first location was replaced with the outdated value.
Similarly, a later store of the outdated value to that location could be removed.
A `keccak256` over the location could be replaced with the hash of outdated data.

## Example

The following contract demonstrates the bug without any inline assembly.
It is affected when compiled with `--via-ir` and the optimizer enabled.

```solidity
contract C {
    struct S { uint256 v; }
    S[20] public a;

    function g(uint256 n1, uint256 n2, uint256 v, uint256 w) external returns (uint256) {
        uint256 i;
        for (uint256 j; j < n1; j++) i++;
        uint256 k = i + 2;
        a[k].v = v;
        for (uint256 j; j < n2; j++) i++;
        a[i].v = w;
        return a[k].v;
    }
}
```

`a` is a static array whose data starts at storage slot 0.
Since `S` has a single member, every element occupies one slot, so the slot of an element equals its index.
For `g(0, 2, 0xaaaa, 0xbbbb)`, the first loop does not run, so `k = 2`, and `0xaaaa` is written to `a[2].v`.
The second loop runs twice, so `i = 2`, and `0xbbbb` is written to the same location.
So `g` should return `0xbbbb`.

**Observed behavior:**

```solidity
C target = new C();
target.g(0, 2, 0xaaaa, 0xbbbb);
// expected: 0xbbbb
// actual:   0xaaaa
```

The slot of `a[k].v` is derived from `i` before the second loop, and the slot of `a[i].v` from `i` after it.
The value of `i` is unknown at both points, so the optimizer treats `i` as its own base and represents the two slots as `i + 2` and `i`.
It concludes that they are two slots apart and keeps the known contents of `a[k].v` across the store to `a[i].v`.
The final load from `a[k].v` is then replaced with the parameter `v`, and the function returns `0xaaaa`.

## Severity Assessment

The compiler emits no warning, and the generated code does not necessarily revert at runtime.
When the bug is triggered, a load returns an outdated value or a write to memory or storage is lost.

In practice the likelihood is very low.
The conditions on the intermediate code are fragile, and the two affected locations also have to coincide at runtime.
When the addresses are computed from call arguments, however, a caller may be able to choose inputs that make them coincide.

The [Sourcify](https://sourcify.dev/) scan found no indication of affected contracts.
It compared bytecode produced by a development build of the compiler with and without the fix.
It did not use the compiler versions that the contracts were originally compiled with.
Since the optimizer steps that run before the affected ones have changed between versions, the scan is not an absolute guarantee.

## The Fix

The fix replaces the lazy invalidation with explicit versioning of variables.
Every variable in the `KnowledgeBase` now carries a version, which is incremented whenever the optimizer records a change to the variable's value.
Cached representations are stored per variable and version.
After a reassignment, the variable is treated as a new one, so existing cache entries never go stale.

## Recommended Actions

- Upgrade to Solidity 0.8.38 or later before deploying contracts compiled with the Yul optimizer enabled.
- For deployed contracts compiled with versions 0.8.19 to 0.8.37 and the Yul optimizer enabled, the following checks are available, in increasing order of effort.
  1. **Compare bytecode produced with and without the fix.**
     [Build the compiler from source](https://docs.soliditylang.org/en/latest/installing-solidity.html#building-from-source) at commit [`ce5702db`](https://github.com/argotorg/solidity/commit/ce5702dbdd57d9577154e09ab73b639bccaa8605), the last commit before the fix, and at commit [`00d5ee65`](https://github.com/argotorg/solidity/commit/00d5ee65698ccc9eeeeb6b1c29f9fe694c869139), which merged the fix.
     Compile your sources with both builds and the settings you deployed with.
     If both produce identical bytecode, ignoring the metadata hash, the fix did not change anything for your code.
     The closest ready-made builds are the nightly builds `0.8.38-nightly.2026.10.13+commit.ce5702db` and `0.8.38-nightly.2026.10.14+commit.8bff1c3a` on [binaries.soliditylang.org](https://binaries.soliditylang.org/).
     They are only available as Emscripten builds (`soljson.js`).
     Builds for other platforms can be obtained from our CI.
     As with our Sourcify scan, this uses the current optimizer rather than the version you deployed with.
     A match is therefore a strong indication rather than a guarantee, and a difference is a reason to investigate rather than proof of a problem.
  2. **Compare against a build that cannot trigger the bug.**
     Compile with the same compiler version you deployed with, but remove every `L` and `E` from that version's default optimizer step sequence (see the [optimizer documentation](https://docs.soliditylang.org/en/latest/internals/optimizer.html#selecting-optimizations)).
     Without these two steps, the bug cannot occur.
     Unlike a fully unoptimized build, this build is unlikely to fail with "Stack too deep".
     Run your test suite against this build and against your original build.
     A difference in results indicates the bug.
     The comparison can only reveal it for inputs under which the two locations coincide, however, so it cannot rule the bug out.
  3. **Check the exact compiler version you deployed with.**
     For a definitive answer, apply the fix to the release you deployed with and compare the bytecode it produces against the release build, ignoring the metadata hash.
     The fix ([argotorg/solidity#17116](https://github.com/argotorg/solidity/pull/17116)) is confined to `libyul/optimiser/KnowledgeBase.h`, `libyul/optimiser/KnowledgeBase.cpp`, `libyul/optimiser/DataFlowAnalyzer.h` and `libyul/optimiser/DataFlowAnalyzer.cpp`.
     Identical bytecode means the deployed code is not affected.
     Alternatively, a symbolic equivalence checker such as [hevm](https://hevm.dev/) can compare the deployed bytecode against the build from check 2.
     It covers all inputs rather than only those exercised by tests, but it may not scale to large contracts.

## Acknowledgements

We would like to thank [Daniel Boye](https://github.com/DanielBoye) for reporting the bug through the Ethereum Foundation's bug bounty program.
We would also like to thank [Surya Prakash Akula](https://x.com/d4r3_d3v1l_) for the second report through the Ethereum Foundation's bug bounty program, which showed that the bug is reachable from plain Solidity code.
