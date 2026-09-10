---
layout: post
published: true
title: "Spill Slot Collision Across Mutual Recursion Bug"
date: "2026-09-10"
author: Solidity Team
category: Security Alerts
---

On July 30, 2026, [Ng Sze Hon](https://github.com/gzeoneth) reported a bug in the IR pipeline's stack-to-memory mover (the "stack limit evader") through the Ethereum Foundation's bug bounty program.
The mover works around the EVM's stack depth limit by relocating ("spilling") some local variables to fixed memory offsets, called spill slots.
Because of the bug, variables of two different functions can be assigned the same spill slot when the call graph contains mutual recursion, even though both variables can be live at the same time.
One variable is then silently overwritten by the other, and the contract computes and stores a value the source code never assigns.

The bug is closely related to, but distinct from, the [Unsound Spill In Mutual Recursion Bug](/blog/2026/07/09/unsound-spill-in-mutual-recursion-bug/), which was fixed in Solidity 0.8.36.
It is present even in compiler versions that carry that fix (see [Relation to the earlier spill bug](#relation-to-the-earlier-spill-bug) below).

We assign this bug a severity of _low/medium_ on our internal scale.
The bug only affects the IR pipeline; the legacy evmasm pipeline is not affected.
The `--via-ir` flag is not enabled by default, so projects that have not explicitly opted into it are not affected.
Contracts without mutually recursive functions are not affected either.

The affected code has been reachable since Solidity 0.7.2, though the precise conditions required to trigger it change across that range (see [Affected versions](#affected-versions) below).
All versions from 0.7.2 through 0.8.36 are affected.
The bug is fixed in Solidity 0.8.37.

We rescanned the [Sourcify](https://sourcify.dev/) database, recompiling roughly 319,000 verified contracts using compilers built with and without the fix.
None of them compiled to different bytecode, so no deployed contract is known to be affected.

## Which Contracts Are Affected?

A contract is only affected if **all** of the following conditions are met:

1. it is compiled with `--via-ir` (or `settings.viaIR` in Standard JSON; `--experimental-via-ir` on versions before 0.8.13),
2. it contains functions that are called internally and call each other in a cycle of at least two functions (a function that only calls itself does not trigger the bug),
3. some non-recursive function that the cycle can reach uses so many simultaneously-live values (roughly, more than 16, including parameters and return variables) that the compiler relocates some of them to memory,
4. a second non-recursive function, distinct from the one in the previous condition, also has variables relocated to memory, calls into the cycle directly or through intermediate functions, and reads at least one of those variables back after that call returns,
5. no recursive function in the contract needs variables of its own relocated to memory (otherwise the compiler skips relocation entirely, and a contract that needed it fails to compile with "Stack too deep"), and
6. the order in which the compiler traverses the call graph does not mitigate the issue (see [The slot-allocation bug](#the-slot-allocation-bug) below).

The first two conditions are easy to check.
The remaining ones depend on compiler internals and cannot be reliably ruled out by inspecting the contract's source, so if your contract meets the first two, treat it as potentially affected and upgrade.
Still, all conditions must coincide, which is why the affected pattern is very uncommon in practice.

Whether functions are mutually recursive is determined on the compiled Yul code rather than on the Solidity source.
In practice this matters for inline assembly: mutually recursive Yul functions defined in an `assembly` block count as mutual recursion as well.

**If your contract has no mutual recursion (in Solidity or inline assembly), it is not affected.**

In addition, the stack-to-memory relocation only runs on code the compiler knows to be memory-safe.
Counterintuitively, this means that a contract containing inline assembly that is *not* annotated as [`memory-safe`](https://docs.soliditylang.org/en/v0.8.37/assembly.html#memory-safety) cannot be affected.

On Solidity 0.8.21 and later, the bug is independent of whether the optimizer is enabled.
The stack-to-memory relocation is then a distinct stage of the IR pipeline that runs regardless of the optimizer setting, so disabling the optimizer does not avoid it.
On earlier affected versions (0.7.2 through 0.8.20), however, the Yul optimizer, and with it the stack-to-memory mover, only runs when `--optimize` is passed, so reaching the bug there requires both `--via-ir` and `--optimize`.
In all cases, only the settings used to compile the deployed contract matter, not those used for tests or CI.

## Technical Details

This section describes the compiler internals behind the bug for readers interested in the implementation-level root cause.

### Affected versions

The bug was introduced in 0.7.2 together with the stack limit evader itself and has been present in every released version since, but how the affected code can be reached differs across that range:

- In 0.7.2 through 0.7.4, the IR pipeline was not reachable from the command line or Standard JSON at all; the affected code could only be triggered by manually feeding `--ir-optimized` output to `--strict-assembly`.
- From 0.7.5 through 0.8.12, the IR pipeline was experimental and required the `--experimental-via-ir` flag; from 0.8.13 onward it is requested with `--via-ir`.
- Before 0.8.21, the stack limit evader only ran when `--optimize` was passed; from 0.8.21 onward it runs by default, and the bug is independent of the optimizer setting.

The bug can also be triggered by compiling hand-written Yul that uses the `memoryguard` builtin (described below) with `--strict-assembly`.

### Recursion and the stack-to-memory mover

EVM instructions can access at most the topmost 16 stack slots, so a function whose simultaneously-live local variables exceed that limit cannot be compiled directly: this is the well-known "Stack too deep" error.
The IR pipeline works around it with the stack-to-memory mover, which picks some of the affected variables and rewrites their accesses into `mstore`/`mload` operations on their spill slots: **fixed** offsets in a reserved region at the start of memory.
The size of that region is announced to the Yul optimizer via the [`memoryguard`](https://docs.soliditylang.org/en/v0.8.37/yul.html#memoryguard) builtin.

Because a spill slot is shared by every activation of a function, the relocation is only sound for functions that are **not** recursive, and the mover excludes recursive functions.
The [Unsound Spill In Mutual Recursion Bug](/blog/2026/07/09/unsound-spill-in-mutual-recursion-bug/) post describes this mechanism and its recursion constraint in more detail.

### Sizing the reserved region

Not every spilled variable needs its own slot.
Two functions that can never be active at the same time may share one.
A function must never reuse a slot belonging to one of its callers, however, because the callers' spilled variables are still live while the callee runs.

To take advantage of this, the mover's slot allocator walks the call graph depth-first and computes, for every function, its slot requirement: the number of slots that it and everything it can reach need.
A function's own spilled variables are numbered just above the largest requirement among its callees, and the requirement computed at the entry point determines the size of the reserved region.
Each function's requirement is cached so that later callers of an already-visited function can reuse the result.
To keep the walk from descending forever into recursive call chains, the allocator writes a provisional requirement of `0` into the cache when it enters a function and only replaces it with the real value once all of the function's callees have been explored.

### The slot-allocation bug

The mechanism described in this section is also explained in the following short video.

![Explainer video for the spill slot collision bug](/videos/2026/spill-slot-collision-explainer.mp4)

The provisional `0` terminates the walk on cycles: a cycle eventually leads back to a function that is still being processed, and the early cache entry stops the recursion there.
The problem is that the walk itself can read the provisional value as if it were final.
A function reached again through a cycle sees `0` instead of the real requirement of the function it calls and is finalized and cached on that basis.
The undercount then propagates to every later caller, including callers that have nothing to do with the cycle.

Consider four functions: `f` and `g` are mutually recursive, `f` also calls `h`, and `p` calls into the cycle via `g`.
`h` and `p` each need one spill slot; `f` and `g` need none:

```
p --> g <--> f --> h
```

1. The walk starts at the contract's entry point, which calls `f` before `p`, and descends into `f`, writing its provisional `0`.
2. It descends into `h`, which takes slot 0 and returns a requirement of 1.
3. It descends into `g`, which follows the recursive call back to `f`.
   `f` is still being processed, so `g` reads `f`'s provisional `0` and, having nothing of its own to spill, is finalized at `0` and cached.
   The correct value is `1`: `g` reaches `h` through `f`.
4. `f` is finalized at `max(1, 0) = 1`, but the cycle's undercount is already cached.
5. Back at the entry point, the walk descends into `p`, whose only callee is `g`.
   It reads the cached `0` and assigns slot 0 to `p`'s variable as well.

The reserved region is sized for one spill slot where two are needed, and the variables of `h` and `p` are assigned the same slot.
At runtime, `p` writes its variable and calls into the cycle.
The call reaches `h`, which overwrites the shared slot.
When `p` reads its variable back, it gets `h`'s value.

Whether the undercount happens depends on the traversal order: the function through which the walk first enters the cycle always computes correct values.
Had the walk reached the cycle through `p` first, `g`'s requirement would have been finalized only after `f` and `h` had been fully explored, and `p` would have read the correct `1`.
The traversal order follows the order in which calls appear in the generated Yul code, so triggering the bug depends not only on the presence of mutual recursion but also on where the calls into it appear.

Note that a function that only calls itself cannot trigger the undercount: the only cycle leads back to the function itself, and its requirement is finalized only after all of its other callees have been fully explored.

### Relation to the earlier spill bug

The [Unsound Spill In Mutual Recursion Bug](/blog/2026/07/09/unsound-spill-in-mutual-recursion-bug/) fixed in Solidity 0.8.36 was a misclassification bug:
faulty cycle detection caused some mutually recursive functions to be treated as non-recursive, so the mover spilled variables of a recursive function, violating the rule that recursive functions must never have spilled variables.

For the bug described here, the classification is correct: neither of the two colliding functions is recursive, and the cycle members are detected as such and have no variables spilled.
The violated property is a different one: two variables that can be live at the same time must never share a spill slot.
Consequently, the bug is present even in Solidity 0.8.36, which carries the fix for the earlier bug.

## Example

The following contract demonstrates the bug, arranged to meet the conditions above.
The repetitive variable declarations are abridged for readability; the complete reproducer can be found in [the compiler's test suite](https://github.com/argotorg/solidity/blob/12692b3975d2f1893af55fdd3f5722c79ec11dac/test/libsolidity/semanticTests/viaYul/stack_limit_evader_mutual_recursion.sol).
The never-taken `msg.data.length` branches keep the functions from being inlined (an inlined function disappears from the call graph), and the initial call to `f` in `test` fixes the traversal order described above.

```solidity
contract C {
    uint public x;

    // Needs spilling: 18 simultaneously-live locals.
    function h(uint seed) internal view returns (uint out) {
        if ((msg.data.length & 8) != 0) // never taken; prevents inlining
            return seed;
        unchecked {
            uint h0 = address(this).balance + seed;
            uint h1 = address(this).balance;
            // ... h2 .. h17 ...
            out = h0 + h1 + /* ... */ + h17;
        }
    }

    // f and g form the mutually recursive cycle; f also calls h.
    function f(uint n, uint seed) internal view returns (uint r) {
        if (n == 0)
            return h(seed);
        return g(n - 1, seed);
    }

    function g(uint n, uint seed) internal view returns (uint r) {
        if ((msg.data.length & 2) != 0) // never taken; prevents inlining
            return seed;
        return f(n, seed);
    }

    // Also needs spilling and calls into the cycle.
    function p(uint seed) internal returns (uint out) {
        if ((msg.data.length & 16) != 0) // never taken; prevents inlining
            return seed;
        unchecked {
            uint p0 = address(this).balance + seed;
            uint p1 = address(this).balance;
            // ... p2 .. p16 ...
            uint nested = g(0, seed + 2000);
            x = seed; // reads seed back from its spill slot
            out = nested + p0 + p1 + /* ... */ + p16;
        }
    }

    function test(uint z) external returns (uint, uint, uint) {
        uint warm = f(z & 1, z + 1000); // pins the traversal order
        uint result = p(z + 3);
        return (warm, result, x);
    }
}
```

For a contract with zero balance, the source code says that `test(0)` should produce:
`warm = f(0, 1000) = h(1000) = 1000`, `nested = g(0, 2003) = f(0, 2003) = h(2003) = 2003`, `result = 2003 + 3 = 2006`, and `x = seed = 3`.

**Observed behavior:**

```solidity
C target = new C();
(uint warm, uint result, uint stored) = target.test(0);
// expected: (1000, 2006, 3)
// actual:   (1000, 2006, 2003), only the third value differs:
// stored holds the value computed by h
```

`seed` in `p` is spilled to a fixed memory slot, and one of `h`'s spilled locals is assigned the same slot.
The call `g(0, seed + 2000)` reaches `h`, which overwrites the shared slot with the value `2003` that it computed.
`result` is unaffected because `p0` was computed from `seed` before the corrupting call; the later `x = seed` reads the slot after the call and stores `2003` instead of `3`.

## Severity Assessment

The compiler emits no warning, and the generated code does not revert at runtime.
Because the corruption manifests as an unexpected result rather than a failure, it can be difficult to diagnose.
The miscompilation is deterministic, so a test suite that is compiled with the same settings and exercises the affected code path will observe the incorrect behavior, even if the root cause is not immediately obvious.

Like the earlier spill bug, and unlike many past compiler bugs, this bug can be triggered without any inline assembly.

In practice the likelihood is very low.
The narrow conditions listed under "Which Contracts Are Affected?" must all coincide.
The [Sourcify](https://sourcify.dev/) rescan found no affected deployed contract.

## The Fix

The fix changes the walk from one per function to one per strongly connected component (SCC) of the call graph: a maximal set of mutually recursive functions, with every non-recursive function forming a component of its own.
On a cycle, every member reaches all the others, so no member can have a private slot budget; the component must be sized as one unit.
Slot requirements are computed and cached per component, and calls between members of the same component are ignored during the walk, because whatever the callee needs is already included in the component's total.

The components always form an acyclic graph, so a component can never be reached again while it is still being processed:
there is no provisional value to read, and every cached requirement is final.
In the four-function example above, `f` and `g` form a single component whose requirement is finalized as `1` only after `h` has been fully explored, and `p` correctly places its variable in a second slot.

For contracts that previously triggered the bug, the fix changes only the size of the reserved region and the assigned slots.
Upgrading will not break a build that currently compiles: unlike the fix for the earlier spill bug, this fix does not cause any contract to start failing with "Stack too deep".
The fix is additionally guarded by a new property-based fuzz test that generates random call graphs and compares program behavior before and after spilling.

## Recommended Actions

- Upgrade to Solidity 0.8.37 or later before deploying contracts compiled via IR.
- If you have already deployed contracts compiled via IR, check their source for mutually recursive functions; without mutual recursion, they are not affected.
  If mutual recursion is present, there is no simple check that rules the bug out; treat the contract as potentially affected and review it, paying particular attention to local variables that are read back after internal calls that lead into the recursion.

## Acknowledgements

Thanks to [Ng Sze Hon](https://github.com/gzeoneth) for reporting the bug through the Ethereum Foundation's bug bounty program and providing a detailed analysis and reproducer.
