---
layout: post
published: true
title: 'Overlapping Recursive Storage Struct Copy Corruption Bug'
date: '2026-11-19'
author: Solidity Team
category: Security Alerts
---

On April 22, 2026, [cyberthirst](https://x.com/cyberthirst) reported a bug in the Solidity code generator through the Ethereum Foundation's bug bounty program.
The bug could corrupt storage when a recursive struct was copied up the hierarchy, onto another struct containing it.
The copy would overwrite the source's own storage before all of it had been read, resulting in silent corruption.

The initial report and proof of concept covered struct-to-struct copies.
During our investigation, we found that array-to-array copies of such structs were affected as well.

Consider the following simple recursive struct definition:

```solidity
struct Node {
    Node[] children;
    uint256 data;
}
Node root;
Node[] roots;
```

Both the struct-to-struct (`root = root.children[i]`) and array-to-array (`roots = roots[i].children`) copies would corrupt the copied value.

We assign this bug a severity of _medium_ on our internal scale.
The bug affected both the evmasm and the IR pipelines.

All versions from 0.4.9 through 0.8.38 were affected (see [Affected versions](#affected-versions) below for more detail).
The bug is fixed in Solidity 0.8.39, and it is tracked in the [list of known bugs](https://docs.soliditylang.org/en/v0.8.39/bugs.html).

## Which Contracts Are Affected?

A contract is affected if **all** of the following hold:

1. it contains a [_recursive struct definition_](https://docs.soliditylang.org/en/v0.8.39/types.html#copying-recursive-structs) that refers back to its own type through a dynamic array (like the `Node` type defined in the example earlier),
2. it copies a value of that type, either the struct itself or an array of it, from one place in **storage** to another,
3. the copy's **target contains the source**, nested inside it through the recursive array (for example `root` contains `root.children[i]`), and
4. the corrupted value reaches an observable outcome, such as being read back, compared, or transferred.

The array can hold the struct's own type directly, as in the above example, or indirectly through another struct that leads back to it (mutual recursion):

```solidity
struct NodeA {
    NodeB[] items;
}
struct NodeB {
    NodeA inner;
}
```

Both are affected.
A storage struct can only refer back to its own type through a dynamic array or a mapping: it cannot hold a pointer to a struct, and a static array of its own type would be infinite in size (static arrays are encoded in place).
Of the two, only the dynamic array can be copied (mappings cannot), so it is the only path that leads to this bug.

The bug is triggered by either of these two assignment patterns:

```solidity
root = root.children[i];        // copying a descendant onto an ancestor
```
```solidity
roots = roots[i].children;      // copying a nested array onto its enclosing array
```

The overlap is not always visible in the assignment, for example when the source is reached through a storage pointer, a mapping key or an array index.

The source and the target do not have to be the exact same type, only implicitly convertible.
For example, a static array of these structs copied onto a longer one that contains it is affected in the same way.

A `push()` cannot trigger this bug, because it copies in the opposite, source-contains-target direction.
It appends a new element and copies the argument into it, and a fresh element cannot contain the source.
In `root.children.push(root)`, the source `root` contains the new element, not the other way around.

**If your contract has no recursive struct, it is not affected.**
The corrupting copy is always storage-to-storage, and does not depend on the optimizer or the target EVM version.

## Technical Details

### Affected versions

The problem is present since version 0.4.9.
Both the struct and the array case have existed for as long as recursive structs compile, and 0.4.9 is the first version that accepts them.
The IR pipeline (`--via-ir`) is affected since 0.8.13, the first release where it was no longer experimental.
The bug was already present on the experimental pipeline before then, but we do not count it as affected.
All affected types of copy are fixed in 0.8.39.

### Root cause

Consider the following example:

```solidity
struct Node {
    Node[] children;
    uint256 data;
}
Node root;
```

In an assignment, the target is the location being written to and the source is the value being read.
A copy of such a struct can overlap in two ways, and they behave differently:

- The **target contains the source** (`root = root.children[i]`): this was the bug. The copy corrupted the value.
- The **source contains the target** (`root.children[i] = root`): This is not part of this bug. The copy is unsupported and its behavior is undefined. It may revert.

The rest of this section focuses on the first case.

A storage-to-storage copy walks a struct member by member, and an array element by element.
In this case, one of the members of a recursive struct is a dynamic array, and copying a dynamic array resizes the target array and overwrites the area that holds its elements.

When source and target overlapped, copying the `children` array corrupted the value.
In the example below, copying `root.children[0]` first copies its empty `root.children[0].children` array over the one belonging to `root`.
This shrinks the target array, zeroing all of its elements.
Because the source lives there, it gets cleared while we are still not done reading it.
The `data` field, which is copied next, comes back as `0`.

Note that this behavior is specific to storage, which uses a hash-based layout.
A dynamic array occupies only a single slot within a struct, containing its length, and its elements sit at `keccak256(p)`, where `p` is the address of the length slot.
Unlike in other locations, where an array is really a reference and can be rebound to an arbitrary offset, in storage `root.children` can only be updated by overwriting its content.

With the array first, `data` was read after the overwrite and came back as zero:

```solidity
struct Node {
    Node[] children;
    uint256 data;     // after the array: lost
}
```

With `data` first, it was copied before the overwrite and kept its value:

```solidity
struct Node {
    uint256 data;     // before the array: survives
    Node[] children;
}
```

This does not make a data-first layout safe.
The `children` array is still copied over the area that holds the source, so values nested deeper in the source can still be lost.
Which values are lost depends on the shape of the copied subtree, which is only known at runtime.

The array-to-array copy (`roots = roots[0].children`) failed the same way: rewriting the target array `roots` overwrote the source elements nested inside it.

The lost data was not limited to `uint256`.
A member of any type, whether a value type, another struct, or a nested array, was cleared the same way.

## Example

```solidity
contract C {
    struct Node {
        Node[] children;
        uint256 data;
    }

    Node root;

    function f() external returns (uint256) {
        root.children.push();
        root.children[0].data = 1;

        root = root.children[0];   // source (root.children[0]) overlaps target (root)

        return root.data;
    }
}
```

On an affected compiler version, `f()` returned `0`: copying `root.children[0].children` overwrote `root.children`, which physically held the source, before `data` was read.
On 0.8.39 it returns `1`.

## Severity Assessment

A source field read after the array copy, such as a balance, a permission flag, or a value used in a comparison, would come back zeroed, which could turn a restrictive check into an unconditional pass.
Because the copy would raise no error, such a change could go unnoticed.

In practice we think the likelihood is low.
The corrupting copy has to be present in the contract's own source, and the operation does not seem common, probably because it is inherently expensive.
A scan of all contracts on [Sourcify](https://sourcify.dev) found none performing such a copy in storage.
The contracts using recursive structs we found either build them only in memory, or never perform storage copies in the target-contains-source direction.
While it can be useful to contracts that maintain a tree-like structure in storage and sometimes move whole subtrees up in the hierarchy, a less rigid structure that connects nodes using some kind of reference scheme that can be cheaply rebound is more reasonable for anything that involves moving more than leaves.
We therefore rate the bug _medium_, a low likelihood of potentially serious consequences.

## The Fix

The fix adds a runtime check to each storage-to-storage copy of a recursive struct.
Before copying, it walks the target's subtree to determine whether it contains the source.
If it does, the source is first snapshotted into memory and the copy reads from that snapshot, so the source and the target no longer overlap during the write and the copy produces the correct value.
If the target does not contain the source, the copy proceeds directly.

The check runs on every storage-to-storage copy of a recursive struct, even when the source and target do not overlap.
This is a deliberate trade-off: the goal was to avoid an unreasonable cost increase for ordinary non-overlapping copies, which we expect to be far more common, and to pay for a snapshot only when one is actually needed.
The check costs extra gas, and the cost grows linearly with the number of nested structs the target holds.
The check also uses stack space while it walks the target.
Copies into deeply nested targets can therefore run out of stack space at a smaller depth than before, and fail.
In one example compiled with `--via-ir` and the optimizer, the maximum depth dropped from 252 to 126 levels.

The opposite direction, where the source contains the target (`root.children[0] = root`), remains unsupported and has undefined behavior, which the fix does not change.
It may revert and should be avoided.
The fix does not check for overlap in that direction.
It could in principle be given defined behavior by snapshotting there as well, but we chose not to, given the extra cost and its limited usefulness.

## Recommended Actions

If a contract performed any of the affected copies on a recursive struct, review the affected storage for possible corruption after upgrading to Solidity 0.8.39 or later.

## Acknowledgements

Thanks to [cyberthirst](https://x.com/cyberthirst) for reporting this bug through the Ethereum Foundation's bug bounty program.
