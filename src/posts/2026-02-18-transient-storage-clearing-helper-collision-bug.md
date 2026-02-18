---
layout: post
published: true
title: 'Transient Storage Clearing Helper Collision Bug'
date: '2026-02-18'
author: Solidity Team
category: Security Alerts
---

On 2026-02-11, a bug in the Solidity code generator was reported by [Hexens](https://hexens.io/).
The bug affects compiler versions 0.8.28 through 0.8.33 when using the IR pipeline.
When a contract clears both a persistent and a transient storage variable of the same type, the compiler will emit the wrong opcode (`sstore` instead of `tstore`, or vice versa) for one of these operations, because the generated Yul helper functions share the same name and one overwrites the other.

We assign this bug a severity of _high_ on our internal scale.
Only three deployed contracts matching the affected pattern have been identified across all EVM-compatible chains.
The respective teams have been notified and measures have been taken to mitigate potential impact.
Any contract compiled with `--via-ir` that uses `delete` on transient storage should be reviewed.

The bug only affects the IR pipeline; the legacy evmasm pipeline is not affected.

The `--via-ir` flag is not enabled by default, so projects that have not explicitly opted into it are not affected.

The bug is fixed in Solidity 0.8.34.
All versions from 0.8.28 through 0.8.33 are affected.

## Which Contracts Are Affected?

A contract is only affected if **all** of the following conditions are met:

1. It is compiled with `--via-ir` (or `settings.viaIR` in Standard JSON).
2. It uses [`delete`](https://docs.soliditylang.org/en/v0.8.34/types.html#delete) on a [transient](https://docs.soliditylang.org/en/v0.8.34/contracts.html#transient-storage) state variable.
3. The same compilation unit (the contract and its inherited contracts) also contains a clearing operation on persistent storage that involves a matching value type (see details below).

**If your code does not use `delete` on a transient state variable, your contract is not affected.**

Note that explicitly assigning the zero value (e.g., `_lock = 0`) does **not** involve the use of the clearing helper and therefore does not trigger the bug.

### How types are matched

The collision occurs when two clearing operations - one transient, one persistent - produce the same internal helper function.
This happens when both operations clear the same Solidity value type.
The persistent variable does not need to be declared as the same type as the transient variable; it is sufficient for a matching value type to be nested within it, for example as a struct member or array element.

### The transient side

There is exactly one code path that produces the `tstore` variant: a `delete` on a transient state variable.
Since transient arrays, mappings, and structs are not yet supported in Solidity, this is always a `delete` on a value type.

### The persistent side

Any operation that clears persistent storage of a matching value type can produce the `sstore` variant:

- **Direct deletes**: `delete <value-type>`.
  This includes values nested in more complex types, e.g. `delete mapping[key]` or `delete array[index]` where the element is a value type.
- **Array shrinking**: `.pop()`, `delete <array>`, shrinking dynamic arrays by assigning a shorter memory/calldata array, assigning `new T[](0)`
- **Struct clearing**: `delete <struct>` (recurses into each member)

### Cross-type collisions via array clearing

Clearing operations on arrays are generally performed at slot granularity, treating every slot as `uint256` rather than clearing each element individually.
This means operations such as `delete <bool[] var>`, `delete <address[5] var>`, or `delete <uint8[10][20] var>` all use the same clearing helper as `delete <uint256 var>`, regardless of the actual element type.
A contract with `bool[] _flags` and `uint256 transient _temp` will therefore have a collision between array clearing and transient deletion, even though the declared types are `bool` and `uint256`.

This slot-granularity expansion does **not** apply to `.pop()` (which uses the actual element type) or to struct member clearing for members smaller than 32 bytes (which uses a direct `sstore(slot, 0)` that bypasses the shared helper entirely).

### Inheritance and external helpers

The two sides of the collision do not need to be in the same contract.
A base contract containing a transient variable and a derived contract with a persistent variable or mapping with a value of the same type are sufficient to trigger the bug.
Similarly, clearing operations in free functions or library functions used by the contract can also contribute to the collision.

### Creation code vs deployed code

Both clearing operations must be present within the same Yul object.
A `delete` that appears only in creation code (e.g., inside a constructor) and a `delete` that appears only in the deployed runtime code do not interact, because the compiler generates these as separate Yul objects with independent helper function sets.

## The Bug

The IR pipeline generates reusable Yul helper functions during code generation.
These helpers are deduplicated by name: there can only be one Yul function with a given name, so the name must fully encode the function's behavior.

The helper responsible for clearing a storage slot (used by `delete` and related operations) derives its name from the Solidity type being cleared - for example, `storage_set_to_zero_t_address` for type `address` in storage.
However, the name does not include the storage kind: persistent and transient storage produce the same function name for the same type.

Since there can only be one function with this name, whichever clearing operation the compiler encounters first determines the implementation.
If a persistent clearing operation is encountered first, the generated function uses `sstore`.
If a transient `delete` is encountered first, it uses `tstore`.
The second operation reuses the existing function with the wrong opcode.

Which clearing operation is encountered first depends on the order in which the compiler processes function bodies and the statements within them, which is determined primarily by the order of function selectors and the structure of the syntax tree.
This ordering is not affected by the use of the optimizer, since it is a distinct stage of the pipeline, performed after code generation.

The fix introduces proper distinction between data locations in the clearing helper's function name.
This produces two distinct Yul functions - `storage_set_to_zero_t_address` for persistent and `transient_storage_set_to_zero_t_address` for transient - ensuring each uses the correct opcode.

## Examples

The following simplified contracts demonstrate the bug in both directions.

### Example 1: Persistent Clearing Operation Encountered First

In this contract, the persistent `delete delegates[id]` is processed first and generates `storage_set_to_zero_t_address` with `sstore`.
When `delete _lock` (a transient variable) is subsequently compiled, it reuses that same function, emitting `sstore` to persistent slot 0 instead of generating a new one for `tstore`.
This overwrites the `owner` state variable with zero.

```solidity
contract OverwriteStorage {
    // ---- persistent storage ----
    address public owner;
    mapping(uint256 => address) public delegates;

    // ---- transient storage ----
    address transient _lock;

    constructor() { owner = msg.sender; }

    function clearDelegate(uint256 id) external {
        delete delegates[id];
    }

    function guarded() external {
        require(_lock == address(0), "locked");
        _lock = msg.sender;
        // ... protected logic ...
        delete _lock;
    }
}
```

**Observed behavior:**

```solidity
OverwriteStorage target = new OverwriteStorage();
assert(target.owner() == address(this));  // owner is deployer

target.guarded();
assert(target.owner() == address(0));     // owner overwritten with zero
```

An additional consequence: since `delete _lock` writes to persistent storage instead of clearing transient storage, the transient lock value is never released.
`guarded()` becomes unusable within the same transaction after the first call.

### Example 2: Transient Delete Encountered First

In this contract, the transient `delete _caller` is processed first and generates `storage_set_to_zero_t_address` with `tstore`.
When `delete approvals[id]` (a persistent mapping value) is subsequently compiled, it reuses that same function, emitting `tstore` instead of `sstore`.
Rather than removing the approval from persistent storage, the operation clears the corresponding slot in transient storage so the value remains in the mapping.

```solidity
contract OverwriteTransient {
    // ---- persistent storage ----
    mapping(uint256 => address) public approvals;

    // ---- transient storage ----
    address transient _caller;

    function approve(address spender, uint256 id) external {
        approvals[id] = spender;
    }

    function run(bytes calldata) external {
        require(_caller == address(0), "reentrant");
        _caller = msg.sender;
        // ... callback logic ...
        delete _caller;
    }

    function revokeApproval(uint256 id) external {
        delete approvals[id];
    }
}
```

**Observed behavior:**

```solidity
OverwriteTransient target = new OverwriteTransient();
target.approve(spender, 42);
assert(target.approvals(42) == spender);  // spender approved

target.revokeApproval(42);
assert(target.approvals(42) == spender);  // approval not removed from persistent storage
```

Once set, the approval cannot be removed through the `delete` operation.

## Severity Assessment

The compiler emits no warning, and the generated code does not revert at runtime.
The incorrect storage operations manifest as unexpected state changes rather than failures, which can make the bug difficult to diagnose.
However, projects that run their test suite with `--via-ir` before deployment are likely to detect incorrect behavior, even if the root cause may not be immediately obvious.

Unlike many past compiler bugs, this one can be triggered without the use of inline assembly, which increases the likelihood of it occurring in practice.

The impact depends on the direction of the collision:

- **Transient `delete` uses `sstore` instead of `tstore`**:

  - Unintended write to persistent storage - the operation writes zero to a persistent slot, most commonly slot 0, which frequently holds `owner`, `_initialized`, or similar access-control variables.
  - Transient variable not cleared - the transient value remains set, which can cause subsequent reads to return stale values (e.g., a reentrancy lock that remains set for the rest of the transaction).

- **Persistent clearing operation uses `tstore` instead of `sstore`**:
  - Ineffective clearing of persistent state - the persistent value remains unchanged, so approvals, mappings, or other state managed through clearing operations are not removed as expected.
  - Unintended write to transient storage - the zero value is written to a transient slot instead, which is discarded at the end of the transaction.

In practice, the affected pattern has proven to be very uncommon.

## Reaction and Precautions

Following the report, a coordinated effort was undertaken to identify deployed contracts matching the affected pattern across all EVM-compatible chains.
This effort was carried out with the support of SEAL 911, Dedaub, and Hexens.
Three affected contracts were identified, and the respective teams were notified.
None of the affected contracts were part of public applications running in production with external user interactions, and the funds at risk were insignificant.

Additionally, the Solidity team verified that no other helper functions in the compiler suffer from the same kind of naming collision.
A refactoring is planned to make this class of issue harder to introduce in the future.

### How to determine if your project is affected

If your project meets the conditions described in the "Which Contracts Are Affected?" section above, you can confirm the bug by comparing the unoptimized Yul output (produced with the `--ir` flag) between your current compiler version and 0.8.34.

In an affected contract, a single helper handles both persistent and transient clearing for a given type.
For example, `storage_set_to_zero_t_uint256` delegates to `update_storage_value_t_uint256_to_t_uint256` (which uses `sstore`) for both:

```yul
function storage_set_to_zero_t_uint256(slot, offset) {
    let zero_0 := zero_value_for_split_t_uint256()
    update_storage_value_t_uint256_to_t_uint256(slot, offset, zero_0)
}
```

Recompiling with 0.8.34 produces a separate transient helper that correctly delegates to `tstore`:

```yul
function transient_storage_set_to_zero_t_uint256(slot, offset) {
    let zero_0 := zero_value_for_split_t_uint256()
    update_transient_storage_value_t_uint256_to_t_uint256(slot, offset, zero_0)
}
```

If diffing the two outputs shows `storage_set_to_zero_` call sites changing to `transient_storage_set_to_zero_`, the contract was affected.

### Recommended actions

- Projects currently deployed with `--via-ir` that use transient storage should check whether they are affected using the guidance above.
- Projects planning to deploy with `--via-ir` should update to Solidity 0.8.34 or later before deployment, particularly if transient storage is used.
- As an interim workaround, assigning the zero value directly (e.g., `_lock = 0`) instead of using `delete` on transient variables avoids the affected code path. The code path used for assignment correctly distinguishes between persistent and transient storage.

## Technical Details

This section describes the compiler internals behind the bug for readers interested in the implementation-level root cause.

### Yul function deduplication

The IR pipeline deduplicates reusable Yul helper functions through `MultiUseYulFunctionCollector`.
The collector indexes functions by name: `createFunction(name, creator)` runs the creator callback on the first call for a given name, and returns the cached result on subsequent calls.

```cpp
// libsolidity/codegen/MultiUseYulFunctionCollector.cpp
std::string MultiUseYulFunctionCollector::createFunction(std::string const& _name, std::function<std::string()> const& _creator)
{
    if (!m_requestedFunctions.count(_name))     // first call only
    {
        m_requestedFunctions.insert(_name);
        std::string fun = _creator();           // generator runs once
        // ... (assertions omitted)
        m_code += std::move(fun);
    }
    return _name;                               // all calls return same name
}
```

The correctness of this scheme depends on the function name being a complete key for the generated behavior: two calls that would produce different function bodies must use different names.

### The name collision in `storageSetToZeroFunction`

`storageSetToZeroFunction` generates the Yul helper that clears a storage slot.
It accepts a storage location parameter and uses it to select the correct opcode (`sstore` or `tstore`), but the function name is derived from the type alone:

```cpp
// libsolidity/codegen/YulUtilFunctions.cpp
std::string YulUtilFunctions::storageSetToZeroFunction(Type const& _type, VariableDeclaration::Location _location)
{
    std::string const functionName = "storage_set_to_zero_" + _type.identifier();
    //                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                                _location is NOT part of the key

    return m_functionCollector.createFunction(functionName, [&]() {
        // ...
        ("store", updateStorageValueFunction(_type, _type, _location))
        // sstore or tstore depends on _location
        // but only evaluated on FIRST call for this type
    });
}
```

### The fix implementation

The fix adds the storage location to the function name:

```cpp
std::string const functionName =
    (_location == VariableDeclaration::Location::Transient ? "transient_"s : "") +
    "storage_set_to_zero_" +
     _type.identifier();
```

## Acknowledgements

We would like to thank [Hexens](https://hexens.io/) for discovering and reporting this bug with thorough analysis and clear reproduction cases.
Much of the technical detail in this post is based on their report.
Hexens have also published [their own analysis of the bug](https://hexens.io/research/solidity-compiler-bug-tstore-poison).
We would also like to thank [SEAL 911](https://securityalliance.org/our-work/seal-911) for their swift response and support in scanning all EVM-compatible chains for affected contracts, [Dedaub](https://dedaub.com/) for their assistance in the identification effort, and [Etherscan](https://etherscan.io/) for providing all the data needed for the these efforts to be possible.
