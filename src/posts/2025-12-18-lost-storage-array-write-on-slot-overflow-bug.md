---
layout: post
published: true
title: 'Lost Storage Array Write on Slot Overflow Bug'
date: '2025-12-18'
author: Solidity Team
category: Security Alerts
---


On November 10, 2024, a bug in the Solidity code generator was found by [@Audittens](https://twitter.com/Audittens).
The bug was initially reported to affect deletion and partial assignment operations on fixed-length storage arrays that cross the `2**256`-slot boundary.
Two instances were reported: one in the IR pipeline and one in the evmasm pipeline.
During our further investigation, we discovered a third instance affecting copying from arrays placed at the storage boundary.
The effect of the bug is that such storage cleanup or copy operations may not be performed at all.

All three instances represent the same kind of mistake in the code generation logic: incorrect implementation of comparison between storage pointers that may wrap around the `2**256`-slot boundary.
The occurrences in both compilation pipelines are related, as the utility functions in the IR pipeline were written with access to (and sometimes directly translated from) the ones in the evmasm pipeline.

We initially classified this as a case of undefined behavior, based on the fact that an affected array would typically have to clash with contract's declared state variables and that the compiler already warns the user about the risk of defining extremely large arrays.
However, upon further consideration, we acknowledge that this kind of layout, while unusual, may be sound when the contract has no declared state variables and is generally compatible with the storage model used by the compiler.
As such, the problem, while unlikely to affect real-life contracts, still warranted a fix.

We assign this bug a severity of *low* on our internal scale.
While the potential impact is high if triggered, the practical security risk to deployed contracts is minimal due to the extremely low likelihood of occurrence.

## Background

### Storage as a Circular Space

Solidity's storage can be conceptualized as a ring buffer with `2**256` slots.
Static arrays are stored contiguously.
Therefore, when arrays are positioned near the storage boundary, they can wrap around the end of the address space (i.e., slot `2**256-1`), continuing from the beginning (slot `0`).

For example, an array beginning at slot `2**256 - 5` with 10 `uint256` items would occupy these slots:

```solidity
[2**256-5, 2**256-4, 2**256-3, 2**256-2, 2**256-1, 0, 1, 2, 3, 4]
```

Since the EVM uses 256-bit integer arithmetic, this wrapping behavior is well-defined and most operations on such arrays work correctly.
For example, reading or writing individual elements is unaffected: when computing a slot address, any overflow wraps around exactly as the storage space does.

Note that, while this model applies to memory and calldata as well, for all practical purposes the possibility of an overflow in those address spaces can be ignored, because placing an array at the end is virtually impossible due to gas constraints.

### Layout of Static and Dynamic Types in Storage

In Solidity, the [layout of each type in storage](https://docs.soliditylang.org/en/v0.8.32/internals/layout_in_storage.html) has a static and a dynamic component to it.
The static component is always contiguous and consists of at least one slot.
For types that have a fixed size (value types, static arrays, structs), it stores all of the data in place.
For dynamic arrays and mappings, its main purpose is to reserve a slot that can be used to derive unique hash-based addresses for the dynamic component, which contains the elements.
The resulting location of the dynamic component is effectively random in the vast `2**256`-slot address space, which ensures that dynamic types can expand without overlapping other storage variables.

The above scheme is applied recursively to each element of a composite type (array, struct, mapping), so a deeply nested structure can have multiple dynamic components at each nesting level.
For example `struct S { uint x; uint[][] y; mapping (uint => uint) z; }` uses 3 slots in its static component.
`y`'s slot stores the array size and the static components of its elements are laid out contiguously, starting at `keccak256(y.slot)`.
Each element is a dynamic array and therefore has its own dynamic component.
`z`'s slot remains empty while each value gets a different position, derived from `z.slot` and the key.

The topmost static components of all storage variables declared in a contract form the static part of the storage layout.

Solidity includes safeguards that make unintentionally positioning an array at the storage boundary extremely unlikely:
- *Static layout validation*: The compiler checks the total size of the static portion of storage layout and will not allow it to extend past the storage boundary.
    This check also applies to custom storage layouts, so using a layout is not a way to bypass it.
- *Hash-based dynamic allocation*: For any variable small enough to be copied or cleared without running out of gas, it is a probabilistic impossibility for its data area to land anywhere near the edge of storage.

### Array Cleanup and Copying

There are essentially two situations in which solc emits bytecode that loops over storage: cleanup (filling slots with zeros) and copy (copying elements to/from arrays).

At the language level, a cleanup loop may be a part of the code generated for:

- *Deletion*: Using `delete` on an array clears all its elements.
- *Static Array Assignment*: When assigning one static array to another, the target array's elements are overwritten.
    In the *partial assignment* case, where the target array is longer than the source, the remaining elements must be cleared.
    For example, assigning an `uint[3]` array to `uint[10]` array overwrites the first 3 elements and clears the remaining 7.
- *Dynamic Assignment*: When assigning a shorter dynamic array to a longer one, cleanup must be performed on the excess elements.
- *Element removal*: Calling `<array>.pop()` removes the last element and clears its storage.
    For complex types containing nested arrays this triggers the cleanup loop.


A copy loop is a part of:

- *Assignment*: The source array's content is copied to the target.
- *Element insertion*: Calling `<array>.push(value)` with an array argument copies the value to the new slot.
    For nested arrays, this triggers the copy loop.

A single high-level operation may perform both copy and cleanup.
For example, a partial assignment involves first copying over the elements, then clearing unused part of the array.
When this happens for an array that crosses the storage boundary, only one of the loops will actually iterate over the boundary and wrap around.

## The Cause of the Bug

The root cause lies in incorrect comparison logic in the generated code for storage cleanup and some of the copy loops (the ones used for copying *from* storage).
These loops used pointer-based comparisons (e.g., `start_slot < end_slot`) to determine when to stop iterating.
This works correctly when array elements occupy monotonically increasing slot addresses, but fails when an array crosses the storage boundary: the start address is high (near `2**256 - 1`) while the end address is low (near `0`), causing the comparison to immediately evaluate as false and skip the loop entirely.

The fix replaces pointer-based comparisons with index-based iteration, which correctly handles wraparound.

## Which Contracts Are Affected?

You may be affected if your contract uses an array that crosses the `2**256`-slot boundary.
More specifically, *both* of the following conditions must be met for the bug to be triggered:

1. An array in storage is positioned in such a way that its first slot is at a higher address than its last slot.
1. One of the following operations is performed on the whole array or a fragment that overlaps the boundary:
    - Cleanup (i.e., filling the area with zeros).
    - Copying content into another array.

Since Solidity does not allow storage layouts whose static portion would overlap the storage boundary, such an array has to be intentionally created in a way that bypasses the check:
- Through the manipulation of the start slot of a static storage array using inline assembly.
- Through the declaration of a dynamic storage array or mapping whose items are so large that the data area extends past the end of storage and contain a small static array that can be easily predicted to be placed exactly at the edge.

The bug affects cleanup operations in both the IR and evmasm pipelines, as well as copy operations in the evmasm pipeline.
The bug is independent of the use of the optimizer.
See the Technical Details section for specifics.

We are not aware of any deployed contracts that meet these conditions.

The bug already existed in the very first version of the compiler (0.1.0).
All versions prior to 0.8.32 are affected.

## Technical Details

### The Bug in the IR Codegen

In the IR pipeline all the affected code paths execute `YulUtilFunctions::clearStorageRangeFunction()`, which uses storage pointer comparison in its loop termination condition, emitting the rough equivalent of the following code:
```yul
function clear_storage_range(startSlot, endSlot) {
    for {} lt(startSlot, endSlot) { startSlot := add(startSlot, 1) } {
        sstore(startSlot, 0)
    }
}
```

This code works on the assumption that the array has no items at addresses lower than `startSlot`.
When an array wraps around, this assumption is not true.
For example when the array starts at a high address such as `2**256 - 5` and is long enough for `endSlot` to overflow into a small number such as `5`, the condition `lt(startSlot, endSlot)` evaluates to `false` immediately, causing the loop to never execute.
This leaves storage uncleared.

The fix is to switch from pointer-based to index-based iteration.
This makes overflow impossible, even in the wrap-around case, because array indices can never exceed `2**256 - 1`:
```yul
function clear_storage_range(startSlot, slotCount) {
    for { let i := 0 } lt(i, slotCount) { i := add(i, 1) } {
        sstore(add(startSlot, i), 0)
    }
}
```

### The Bug in the Evmasm Codegen

The evmasm code generator had similar issues in `ArrayUtils::clearStorageLoop()` and `ArrayUtils::copyArrayToStorage()` functions:
```
// Inputs: stack[0]=pos, stack[1]=end
DUP1
DUP3
GT
ISZERO // Equivalent to: pos >= end
PUSH <loop end tag>
JUMPI
```

This comparison prematurely terminates the loop if `pos` starts at a high address (near `2**256`) and `end` overflows into a low address (near zero).
The fix is conceptually the same as in the IR case.

## Examples

### Example 1: Array Placement Using Inline Assembly

The following example uses inline assembly to place an array at a storage slot near the boundary (`2**256 - 5`).
Because the position is computed at runtime, the compiler cannot detect that the array will cross the storage boundary:

```solidity
contract C {
    function boundaryArray() internal pure returns (uint256[10][1] storage arr) {
        assembly {
            arr.slot := sub(0, 5)  // Slot = 2**256 - 5
        }
    }

    function normalArray() internal pure returns (uint256[10][1] storage arr) {
        assembly {
            arr.slot := 5  // Place after boundaryArray
        }
    }

    function testDelete() public {
        boundaryArray()[0] = [uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10];
        delete boundaryArray()[0];
        for (uint i = 0; i < 10; ++i) {
            assert(boundaryArray()[0][i] == 0);
        }
    }

    function testPartialAssignment() public {
        boundaryArray()[0] = [uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10];
        boundaryArray()[0] = [uint256(11), 12, 13];
        assert(boundaryArray()[0][0] == 11 && boundaryArray()[0][1] == 12 && boundaryArray()[0][2] == 13);
        for (uint i = 3; i < 10; ++i) {
            assert(boundaryArray()[0][i] == 0);
        }
    }

    function testCopyFromStorage() public {
        boundaryArray()[0] = [uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10];
        normalArray()[0] = boundaryArray()[0];
        for (uint i = 0; i < 10; ++i) {
            assert(normalArray()[0][i] == i + 1);
        }
    }

    function testCopyToStorage() public {
        normalArray()[0] = [uint256(11), 12, 13, 14, 15, 16, 17, 18, 19, 20];
        boundaryArray()[0] = normalArray()[0];
        for (uint i = 0; i < 10; ++i) {
            assert(boundaryArray()[0][i] == i + 11);
        }
    }
}
```

On affected compiler versions:
- In the evmasm pipeline, the assertions in `testDelete()`, `testPartialAssignment()`, and `testCopyFromStorage()` do not hold, while `testCopyToStorage()` passes.
- In the IR pipeline, `testDelete()` and `testPartialAssignment()` fail, while `testCopyFromStorage()` and `testCopyToStorage()` pass.

### Example 2: Triggering Without Inline Assembly

The following example, based on the original submission, demonstrates that the bug can be triggered even without the use of inline assembly.
By putting an extremely large array inside a mapping, we can guarantee that one specific array element will overlap the storage boundary despite the location being hash-based.

Note that this is a hypothetical contract with an unrealistic design: anyone can mint or burn any account's balance without access control.
Additionally, the `_VERSION` string (`"v 2.2.3"`) was specifically crafted to produce a mapping hash that, combined with the extremely large array size (`2**248` slots, i.e. `1/256` of the whole address space), places the `balances` array close enough to the storage boundary that one account's balance array crosses it:

```solidity
struct Data {
    uint256[256][2**240] balances;
}

contract Vault {
    string private constant _VERSION = "v 2.2.3";
    mapping(string => Data) data;

    function mint(uint240 account, uint8 tokenIndex, uint256 amount) external {
        data[_VERSION].balances[account][tokenIndex] += amount;
    }

    function burn(uint240 account) external {
        delete data[_VERSION].balances[account];
    }

    function balance(uint240 account, uint8 tokenIndex) external view returns (uint256) {
        return data[_VERSION].balances[account][tokenIndex];
    }
}

contract Attacker {
    // Mirrors Vault's storage layout to calculate slot positions.
    // This lets us find out which account's balance array crosses the storage boundary.
    mapping(string => Data) data;

    function findVulnerableAccount() internal view returns (uint240 account, uint8 boundaryIndex) {
        uint256[256][2**240] storage balances = data["v 2.2.3"].balances;
        uint256 balancesSlot;
        assembly {
            balancesSlot := balances.slot
        }
        account = uint240((type(uint256).max - balancesSlot) / 256);

        // Using unchecked because these calculations intentionally wrap around 2**256 and
        // since Solidity 0.8.0, all arithmetic operations revert on overflow by default
        uint256 firstSlot;
        unchecked {
            firstSlot = balancesSlot + uint256(account) * 256;
        }
        boundaryIndex = uint8(type(uint256).max - firstSlot + 1);
    }

    function testBug() external {
        Vault vault = new Vault();
        (uint240 account, ) = findVulnerableAccount();

        vault.mint(account, 0, 100);
        assert(vault.balance(account, 0) == 100);

        vault.burn(account);
        assert(vault.balance(account, 0) == 0);
    }
}
```

Due to the astronomically large array (`2**240` accounts × 256 token slots), it is feasible to find a value of `_VERSION` that makes `balances` reach the storage boundary and include an element that overlaps it.
Since the boundary is a single point between slot `2**256-1` and slot `0`, only one 256-slot array can straddle it.

For `_VERSION = "v 2.2.3"`, the vulnerable account's balance array has the following layout:
- `account`: `0x24c0e260ab14f4afed6ca3d793af7ba62c7ebfa2d961fe3ea0b13d7d9124`
- `boundaryIndex`: `65`
- `firstSlot`: `0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffbf`, i.e. `2**256 - boundaryIndex`
- `firstSlot + 255`: `190` (overflow)

On affected compiler versions the assertion in `testBug()` does not hold.

## Severity Assessment

If the bug is actually triggered, the **potential impact is high**.
Straightforward operations like `delete` or array assignments not storing the right values represents a serious issue in terms of code generation correctness, and could lead to storage corruption and possible loss of funds in affected contracts.

However, from a security standpoint, the **likelihood of exploitation is extremely low**.
Running into this issue accidentally is highly unlikely because it depends on the same property that makes mappings secure: the storage address space is so enormous (`2**256` slots) that it's nearly impossible to hit a specific address without deliberate manipulation.

### Why Intentional Attacks Are Unlikely

While an intentional attack is technically possible, several factors severely limit its usefulness to a potential attacker:

1. **Difficult to hide from auditors**: The code required to exploit this bug should look suspicious to an experienced auditor, because it must be combined with other suspicious patterns:
   - **Deliberate boundary placement**: An array that wraps around at the storage boundary must be deliberately placed at that specific location.
       Positioning an array at slot `2**256 - N` is a clear red flag, especially since it would typically overlap with the contract's state variables (which by default start at slot 0).
   - **Arbitrary array element access**: To make the attack less conspicuous, one could place the boundary-crossing array within a large collection of arrays.
       However, the attacker would then need to provide users access to that specific array element.
       Contracts that allow users to access arbitrary array elements are themselves a security risk (as they enable variable overwrites) and should be flagged during audits.

2. **Hash collision dependency**: Natural occurrence via hash collisions has vanishing probability.

3. **Requires control over contract's implementation**: A plausible attack scenario essentially relies on the contract belonging to the attacker.
    Already deployed, well-established applications are very unlikely to be vulnerable.
    The bug would need to be introduced during initial development or upgrades.
    However, a malicious owner with, for example, upgrade rights has far simpler attack options (simple backdoor function, direct fund drain, etc.).

## Acknowledgements

We would like to thank [@Audittens](https://twitter.com/Audittens) for their perceptiveness in discovering this long-standing bug, which had gone unnoticed since the earliest versions of the compiler.
