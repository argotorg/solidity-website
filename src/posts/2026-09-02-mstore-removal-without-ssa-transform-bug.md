---
layout: post
published: true
title: 'Bug Concerning Incorrect Removal of mstore and sstore Writes'
date: '2026-08-26'
author: Solidity Team
category: Security Alerts
---

On February 4th 2026, [Cantina](https://github.com/cantinaxyz) reported a bug in the `UnusedStoreEliminator` Yul optimizer step that can cause it to remove `mstore` or `sstore` writes that are still needed, if it is run on code that has not previously been brought into pseudo-SSA form by the `SSATransform` step.

The bug was introduced in Solidity 0.8.13, together with the `UnusedStoreEliminator` step itself.

We assigned the bug a severity of "low".

## Which Contracts are Affected?

`UnusedStoreEliminator` removes writes to memory or storage that it can prove are redundant, for example because the same location is unconditionally overwritten again before it is ever read.
To reason about this safely, it needs to know, for many variables at once, which value or location each of them holds.
For this it relies on `SSAValueTracker`, a helper that collects the set of variables that are assigned exactly once in a function and never reassigned afterwards (a property usually referred to as "pseudo-SSA form").
For every such variable, the eliminator treats the expression it was assigned as a fact that remains true for the rest of the function, and uses it to compare memory or storage locations with each other.

`SSAValueTracker` correctly removed a variable from this set once it saw it reassigned later in the function.
However, it failed to also remove other variables whose recorded expression depends on such a reassigned variable, whether directly (its own expression mentions the reassigned variable) or transitively, through a chain of other single-assignment variables.
Such a variable is still, technically, assigned only once itself, but the expression stored for it is no longer trustworthy, since part of it describes a value that changes later on.
Treating it as a stable fact anyway can make the eliminator mistakenly conclude that two locations are unrelated when they actually overlap, and remove a write whose result is read out again elsewhere.

```yul
{
    let x := calldataload(0)
    let a := add(x, 32)
    x := add(x, 32)
    let b := x
    let outLen := 32
    mstore(a, 0xAA)
    return(b, outLen)
}
```

Here, `a` is assigned once as `add(x, 32)` and is therefore considered part of the trusted SSA set on its own, even though its definition mentions `x`, which is reassigned on the very next line.
Because of this reassignment, `b` ends up holding the exact same value as `a`: both equal the original `x` plus `32`.
To compare the two locations, the eliminator resolves each one to a base variable plus a constant offset, walking through the trusted expressions: `a` resolves to `x + 32`.
Resolving `b` means looking through its own definition, the bare identifier `x`; since `x` itself was correctly excluded from the trusted set, the resolver cannot see through it and instead falls back to treating the name `x` as its own opaque base, giving `b` the resolution `x + 0`.
Seeing the same base `x` with offsets `32` and `0`, the eliminator concludes that `a` and `b` can never overlap, and removes `mstore(a, 0xAA)` as dead, even though `return(b, outLen)` reads it right back out.
Compiling this snippet with only the `UnusedStoreEliminator` step (`solc --strict-assembly --optimize --yul-optimizations "S:" ...`) reproduces exactly this.
With `SSATransform` run first, as it always is in the default optimizer sequence, the two runtime values of `x` are given distinct fresh names, so `a` and `b` both resolve down to the same concrete base at the same offset, the eliminator can no longer prove them unrelated, and the write is correctly kept.

The same mistaken reasoning applies to `sstore`, since `UnusedStoreEliminator` handles storage and memory writes with the same location-comparison logic:

```yul
{
    let x := calldataload(4)
    mstore(32, 0xAA)
    let a := add(x, 32)
    x := add(x, 32)
    let b := x
    sstore(a, 32)
    let ret := sload(b)
    revert(ret, 32)
}
```

Just as before, `a` and `b` both resolve to the same opaque base `x`, 32 apart, so the eliminator concludes they can never overlap and removes the `sstore(a, 32)` line, even though `sload(b)` reads the slot right back out.

The default Yul optimizer sequence used by `--optimize` always runs `SSATransform` (step `a`) before `UnusedStoreEliminator` (step `S`), so contracts compiled with standard compiler settings are not affected, irrespective of whether the optimizer is enabled.
The bug can only be triggered by supplying a custom Yul optimizer step sequence, via the `--yul-optimizations` command-line option or the `settings.optimizer.details.yulDetails.optimizerSteps` Standard JSON option, in which `S` runs on code that is not in pseudo-SSA form.
This happens not only when the sequence omits `a` before `S` entirely, but also when some other step placed between them reintroduces a reassignment and thereby destroys the pseudo-SSA property that `a` had just established.

**If you have not manually customized the Yul optimizer step sequence, your contracts are not affected.**

The bug is fixed in Solidity 0.8.37 by additionally filtering out any variable whose recorded expression transitively depends on a variable that is reassigned elsewhere in the function.
