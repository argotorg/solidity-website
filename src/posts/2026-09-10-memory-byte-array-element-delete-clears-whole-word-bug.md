---
layout: post
published: true
title: "Memory Byte Array Element Delete Clears Whole Word Bug"
date: "2026-09-10"
author: Solidity Team
category: Security Alerts
---

On August 14, 2026, [shaheenfazim](https://github.com/shaheenfazim) reported a bug in the Solidity code generator through the Ethereum Foundation's bug bounty program.
When `delete` is applied to an element of a `bytes` array located in memory, the generated code writes 32 zero bytes starting at that element instead of clearing only the element.
This also clears up to 31 of the bytes that follow it, either elsewhere in the same array or, when the deleted element sits near the end of the array, in whatever comes after it.
The equivalent assignment `b[i] = 0` is not affected and clears exactly one byte.

We assign this bug a severity of _low/medium_ on our internal scale.
The bug only affects the default, evmasm pipeline; the IR pipeline is not affected.
The use of the optimizer is not necessary to trigger it.

The affected code path predates the first released version of Solidity.
All versions up to and including 0.8.36 are affected.
The bug is fixed in Solidity 0.8.37.

We scanned the [Sourcify](https://sourcify.dev/) database of roughly 870,000 verified compilations for the triggering source pattern.
The pattern appears in 17 compilations, which contain only two distinct functions, neither of which is actually affected (see [Severity Assessment](#severity-assessment)).
No deployed contract is known to be affected.

## Which Contracts Are Affected?

A contract is only affected if **all** of the following conditions are met:

1. it is compiled with the evmasm pipeline, i.e., without `--via-ir` (or `settings.viaIR` in Standard JSON),
2. it applies `delete` to an element of a `bytes` value located in memory, e.g., `delete b[i]`, and
3. the 31 bytes that follow the deleted element are not irrelevant to the contract's behavior.

Conditions 1 and 2 can be checked in the compiler settings and the sources.
Condition 3 requires reasoning about the memory layout the compiler produces, so if the first two hold, treat the contract as affected rather than trying to rule out the third.

**If your contract never applies `delete` to an element of a `bytes` or `string` value in memory, it is not affected.**

Neither the optimizer nor the target EVM version changes whether the bug manifests: the defect is in the code emitted by the codegen stage, and the optimizer preserves its faulty semantics.

Condition 2 requires three clarifications.
First, only _element_ deletes are affected: `delete b` on the whole array takes a different code path and works correctly.
Second, the array must be in memory.
Byte arrays in storage are handled by a separate code path and are unaffected, and `delete` cannot be applied to calldata at all.
Arrays whose elements each occupy a full word in memory, such as `bytes1[] memory`, are unaffected as well; only `bytes` and `string` pack their elements.
Third, `string` values are affected as well.
While `delete s[i]` does not compile for a `string memory s`, strings can be converted to `bytes` and `delete bytes(s)[i]` triggers the same bug.

How far the corruption reaches depends on where in the array the deleted element sits and on how the array was allocated (see [Technical Details](#technical-details) below).
Deleting one of the last 31 elements can reach past the array into whatever is allocated after it.

## Technical Details

This section describes the compiler internals behind the bug for readers interested in the implementation-level root cause.

### Byte arrays in memory

Most values in memory occupy full 32-byte words.
The notable exception is `bytes`: a byte array in memory consists of a 32-byte length field followed by its data, packed back to back without gaps.

Solidity allocates memory by advancing the free memory pointer: every allocation starts where the previous one ended.
Consecutive allocations therefore sit flush against each other (apart from padding), and a write that runs past the end of one lands directly in the next.

In most cases, e.g., for arrays created with `new bytes(n)` or from literals, the data is followed by up to 31 zero bytes of padding, so that the next allocation begins on a word boundary.
We call these _padded_ arrays.
The evmasm pipeline does not pad the results of `bytes.concat`, `string.concat`, and the `abi.encode*` functions (`abi.encode`, `abi.encodePacked`, `abi.encodeWithSelector`, `abi.encodeWithSignature`, and `abi.encodeCall`): their data ends exactly where the next allocation begins.
We call these _unpadded_ arrays.
Whether an allocation is padded is an implementation detail of the current evmasm pipeline: the IR pipeline behaves differently, the behavior may change in any future version, and code must never rely on it.
Inline assembly that touches the padding violates the [memory safety](https://docs.soliditylang.org/en/v0.8.36/assembly.html#memory-safety) rules.

When a value in memory is narrower than its word, its position within the word depends on its type.
Left-aligned values, such as `bytesN` types, start at the first byte of the word.
Right-aligned values, such as integers, addresses, memory pointers, and the length field of a dynamic array, sit at the end of the word with zero bytes in front.

Strings use the same representation as `bytes`, but hold variable-length UTF-8 characters, which is why they do not support index access.
Converting a string to `bytes` does not create a copy: `bytes(s)` refers to the same memory, so `delete bytes(s)[i]` modifies the string's data in place.
`bytesNN` values, on the other hand, are unaffected by the bug: indexing them yields a copy of the byte, not a reference into the underlying data.

Because their elements are single bytes, byte arrays are the one situation in which storing a value to memory is not equivalent to storing a full word.
The compiler handles this with a single-byte store (`mstore8`) wherever it knows the element width, with one exception, described in [The delete path](#the-delete-path) below.

### The delete path

`delete x` assigns the zero value of `x`'s type, so `delete b[i]` should behave exactly like `b[i] = 0`.
Both operations end in a store to the element's location, but in the evmasm pipeline they do not share the store implementation:

- The _assignment_ path knows that a byte-array element is one byte wide and emits the single-byte store, writing exactly that byte.
- The _delete_ path hands the value to a generic memory-store helper.
  The helper was written for encoding several values in memory one after another, where any surplus bytes are overwritten by the next value or end up outside the final allocation, so it always stores a full 32-byte word.
  It receives the element width, but only uses it to compute where the next value would start, not to narrow the store.

The result is a 32-byte write of zeroes beginning at the deleted element and extending forward.
Since the write starts at the element rather than at a word boundary, it is not confined to the word containing the element.

The length field sits before the data and is never touched, so the array keeps its original length, and anything computed from its contents, such as `keccak256`, ABI encoding, or simply returning the value, uses the corrupted bytes.

The IR pipeline uses the same store for `delete b[i]` as for the assignment and is unaffected by the bug.

### How far the write reaches

The diagram below shows an array of length 40 together with two separate writes: deleting the element at index 10, where the write stays within the array's allocation, and deleting the element at index 39, where it runs 7 bytes into the next allocation.

![Memory layout of a bytes array of length 40 and the 32-byte zero write issued by delete b[i] for two different indices](/img/2026/09/memory-byte-array-element-delete-diagram.png)

### Corruption inside the array

Every element after the deleted one, up to 31 of them, is cleared as well.
Unless the array happens to be all-zero beyond the deleted element, this alone changes the array's contents, and it requires no circumstances beyond executing the delete.

### Corruption beyond the array

For padded arrays, the padding absorbs part of the write: only deletes of the trailing elements reach past the array, and by no more than 31 bytes minus the padding.
How many elements that is depends on the array's length: none for lengths 1, 33, 65, and so on, where the padding is a full 31 bytes, and up to the last 31 elements for lengths that are a multiple of 32, where there is no padding.
In the diagram above, the array of length 40 has 24 bytes of padding, so only deletes of its last 7 elements reach past it, by at most 7 bytes.

What gets overwritten is the beginning of the next allocation.
For left-aligned values the most significant bytes are cleared.
For right-aligned values the write clears the leading bytes of the word, so whether the value survives depends on the size of the write and the width of the value.
A write of up to 12 bytes leaves an address intact, while the maximal write of 31 bytes clears everything above 255.

### Unpadded arrays

For unpadded arrays, deleting any of the last 31 elements reaches the next allocation, whatever the length of the array.
For arrays of at most 31 bytes that is every index, including the first.

## Example

The following contract demonstrates both kinds of corruption.
It relies on consecutive declarations being allocated adjacently, which is how the compiler allocates memory.

```solidity
contract C {
    struct S { uint256 x; }

    // Corruption inside the array.
    function clearElement() public pure returns (bytes memory) {
        bytes memory d = hex"0102030405";
        delete d[0];
        return d;
    }

    // Corruption beyond the array.
    function clearLastElement() public pure returns (uint256) {
        bytes memory b = new bytes(32);
        S memory s = S(type(uint256).max);
        delete b[31];
        return s.x;
    }
}
```

Compiled with default settings, i.e., with the evmasm pipeline, the two functions return corrupted data.

**Observed behavior:**

```solidity
C target = new C();

target.clearElement();
// expected: hex"0002030405" (only d[0] cleared)
// actual:   hex"0000000000" (d[1] to d[4] cleared as well)

target.clearLastElement();
// expected: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff (2**256 - 1)
// actual:   0x00000000000000000000000000000000000000000000000000000000000000ff (the 31 most significant bytes of s.x were cleared)
```

In `clearElement`, the five-byte array occupies part of a single padded word, and the delete clears that word from index 0 onward, taking the remaining four bytes of the array with it.
In `clearLastElement`, the array occupies exactly one word with no padding, so deleting the last element writes 31 zero bytes into `s`, which sits immediately after it.
Integers are stored with their most significant byte first, so the 31 overwritten bytes are the most significant ones.
All 32 bytes of `type(uint256).max` are `0xff`, only the lowest one is left, and the function returns 255.

Replacing the deletes with assignments (`d[0] = 0` and `b[31] = 0`) produces the expected results on the same compiler versions.

## Severity Assessment

The compiler emits no warning, and the generated code does not revert at runtime.
The corruption manifests as an unexpected result rather than as a failure, which can make it difficult to diagnose.
However, corruption inside the array, which is the more common of the two cases, is likely to be observed by a test that exercises the affected code path with the evmasm pipeline and checks the resulting array.

This bug can be triggered without inline assembly.

In practice the likelihood is low.
The bug went unnoticed for as long as the language has existed, and the [Sourcify](https://sourcify.dev/) scan found the triggering pattern in only two distinct deployed functions, neither of which is actually affected.
In both, the bytes cleared inside the array are discarded or deleted anyway, so only the memory after the array matters.
In one, that is an array length that provably never grows large enough to reach the overwritten bytes.
In the other, nothing is allocated there when the deletes run, so the write lands in unused memory.

## The Fix

The fix makes the delete path consult the element width the same way the assignment path already does.
When the element being cleared is a packed byte-array element, the compiler now emits the single-byte store instead of a full-word store, so `delete b[i]` and `b[i] = 0` behave identically on both pipelines.

## Recommended Actions

- Upgrade to Solidity 0.8.37 or later before deploying contracts compiled with the evmasm pipeline, which is the default.
- Search your sources, including libraries and dependencies, for `delete` applied to elements of `bytes` values in memory (or `string` values converted to `bytes`).
  As an interim workaround on older compilers, replace `delete b[i]` with the equivalent assignment `b[i] = 0`, which is not affected.

## Acknowledgements

We would like to thank [shaheenfazim](https://github.com/shaheenfazim) for reporting the bug through the Ethereum Foundation's bug bounty program and providing a reproducer.
