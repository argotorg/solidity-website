---
layout: post
published: true
title: 'Contract Composition in Core Solidity'
date: '2026-10-20'
author: Solidity Team
category: Announcements
---

Every non-trivial smart contract system is built by reusing code.
Access control, pausing, reentrancy guards, fee logic, token standards: nobody wants to re-implement these for each contract, so we reach for a mechanism that lets one piece of behavior be shared across many contracts.
In Classic Solidity that mechanism is almost always **inheritance**.

Inheritance is a fine tool for sharing code.
The trouble is that it does not only share code.
It folds every shared function, and every base's storage, into a single whole-program arrangement, `virtual` / `override` / `super` dispatch over one linearized storage layout, whose behavior is decided by the _final deployed contract_ rather than by the contract you are reading.
The rules that make this well-defined, C3 linearization, produce results that regularly surprise even experienced Solidity developers, and that auditors have to reconstruct by hand.

Core Solidity takes a different route.
As [announced in our deep dive](https://soliditylang.org/blog/2025/11/14/core-solidity-deep-dive/), we are removing inheritance from the language entirely, and code reuse is expressed instead through traits, generics, and modules that own their state.
This post walks through what that costs and what it buys, using two small but complete examples.
The first is a family of vaults that compose their _behavior_ along two independent axes.
The second is an ERC20 token assembled from independent `Ownable`, `Pausable`, and supply-cap modules that each carry their own _state_, the archetypal inheritance stack, built without a single base contract between them.

## How Classic Solidity Composes Code

The dominant pattern for reuse in Classic Solidity is to factor shared behavior into base contracts and mix them into a leaf.
An ERC20 token inherits a base implementation and layers `Ownable`, `Pausable`, and `ReentrancyGuard` on top; a vault inherits an accounting base and overrides a hook or two.
When two of those bases are themselves derived from a common ancestor, the inheritance graph becomes a _diamond_, and the compiler needs a rule to decide, for any function `f`, what "the next implementation of `f`" means.

That rule is **C3 linearization**.
It flattens the inheritance graph into a single ordered list, computed over the most derived contract, in which each contract appears exactly once, precedes all of its own bases, and preserves the relative order of every `is` clause.
Everything about `virtual`, `override`, and `super` follows from this one list: `super.f()` means "the next contract after me _in the linearization of the contract being deployed_ that defines `f`."

Together with virtual dispatch, this rule leads to three kinds of surprising behavior.

## The C3 Linearization Trap

**`super` is not your parent, and the same source dispatches differently per deployment.**
Consider a textbook diamond:

```solidity
contract A {
    function f() public virtual returns (uint) {
        return 1;
    }
}
contract B is A {
    function f() public virtual override returns (uint) {
        return super.f()*10 + 2;
    }
}
contract C is A {
    function f() public virtual override returns (uint) {
        return super.f()*10 + 3;
    }
}
contract D is B, C {
    function f() public override(B, C) returns (uint) {
        return super.f()*10 + 4;
    }
}
```

`C` contains exactly one `super.f()` call site.
What it reaches depends on which contract is deployed:

```text
deployed   linearization    C's super.f() reaches   f() returns
--------   --------------   ---------------------   -----------
C alone    [C, A]           A.f                     13
D          [D, C, B, A]     B.f  (!)                1234
```

Deployed on its own, `C`'s `super.f()` reaches `A.f`, its only base.
Deployed as part of `D`, the _same source_ reaches `B.f`, and `C` does not inherit from `B`.
They are siblings; `B` may not even have existed when `C` was written.
Nothing in `C` changed.
The deployed contract's linearization did.

**`super` can land on a complete stranger.**
Because the target is chosen from the deployed contract's list, it can be a contract that shares no ancestor with the caller at all:

```solidity
contract A {
    function f() public virtual returns (uint) {
        return 1;
    }
}

contract X {
    function f() public virtual returns (uint) {
        return 100;
    }
}

contract B is A {
    function f() public virtual override returns (uint) {
        return super.f();
    }
}

contract D is A, X, B {
    function f() public override(A, X, B) returns (uint) {
        return super.f();
    }
}
```

In `D`, whose linearization is `[D, B, X, A]`, the `super.f()` written inside `B` resolves to `X.f`, returning `100`.
`X` is not a base of `B`, not a derived contract of `B`, and shares no ancestor with it.
The only thing linking them is that some third contract, `D`, listed both.
The candidate set that `B`'s `super.f()` was _type-checked_ against (the bases of `B`) is not the set it is _resolved_ over at code generation (the linearization of `D`).
Anything true of `A.f` but not of `X.f`, its mutability, its gas cost, its reentrancy behavior, whether it even touches storage, simply does not carry over.

**Base constructors call into overrides whose state is still zero.**
Virtual dispatch is fully live during construction, so a base constructor that calls a virtual function does not reach the base's own implementation.
It reaches the most derived override, which runs before the constructors that give it something to read:

```solidity
contract A {
    uint public captured;
    constructor() {
        captured = f();
    }

    function f() public view virtual returns (uint) {
        return 1;
    }
}
contract B is A {
    uint public rate;
    constructor() {
        rate = 100;
    }

    function f() public view virtual override returns (uint) {
        return rate;
    }
}
```

Deploy `B` and `captured` is `0`, while every later call to `f()` returns `100`.
`super` walks the linearization from most derived to most base-like, and constructors run it in the exact opposite direction, so the override with the highest dispatch priority is the one initialized last, guaranteed to be least ready when a base constructor calls into it.
The contract permanently disagrees with itself about a value it computed from its own code, and nothing warns you.

None of these examples is exotic.
No contract mentions its siblings, the functions are `view`, and they touch only ordinary state.
The behavior is a property of _the whole program_, not of any file you can read in isolation.
This is precisely the kind of finding that makes inheritance-heavy contracts expensive to audit: reviewers manually trace per-deployment linearizations, checking that no `super` chain routes into a stranger and that no constructor reads through a live override.
That is tedious, error-prone work that scales with the number of contracts and bases in a codebase.

## Composition Without Inheritance in Core Solidity

Core Solidity keeps the goal, sharing behavior across contracts, and drops the mechanism that made it fragile.
There is no `virtual`, no `override`, no `super`, and no linearization, because there is no inheritance.
Reuse is expressed with three ingredients that are already in the language:

- **Traits** (type classes) declare an interface that many types can implement.
- **Generics** let a function be written once and reused for every type that satisfies a trait.
- **Values** carry the choices, and are composed at the use site.

A quick note on syntax: like everything in the prototype, the surface syntax below is provisional and could change before release.
The code shown here is taken verbatim from a [runnable example in the playground](https://github.com/argotorg/solcore-rs/tree/main/playground/src/examples/composition); it typechecks and produces executable code today.

### The example: vaults that vary along two axes

We want a family of deposit vaults that differ along two _independent_ axes:

1. **Where does the acting address come from?** A direct call, where the transaction caller acts for themselves, or a relayed call, where the acting address is recovered from a signature.
2. **How much of a deposit is credited?** No fee, a flat fee, a percentage fee, or some composition of those.

In Classic Solidity, two independent axes of variation is exactly the situation that pushes you toward a base `VaultBase` with a virtual `originator()` hook, a virtual `afterFee()` hook, and a set of mixin contracts, one per choice, combined by inheritance in each leaf.
Two axes with a handful of options each, and you are back in diamond territory with `override(...)` lists.

Here is the same design with traits.
The first axis is a trait with one method, and each option is a small type with its own `impl`:

```js
// Axis one: where does the acting address come from?
trait TxnContext<c> {
    function originator(ctx: c) returns (address);
}

// A direct call: the transaction caller acts for themselves.
enum Direct {
    Direct
}

impl TxnContext<Direct> {
    function originator(ctx: Direct) returns (address) {
        return sender();
    }
}

// A relayed call: the acting address is recovered from a signature over
// the digest the relayer hands in alongside it.
enum Signed {
    Signed(bytes32, uint256, bytes32, bytes32)
}

impl TxnContext<Signed> {
    function originator(ctx: Signed) returns (address) {
        match (ctx) {
            case Signed(digest, v, r, s) {
                // std's ecrecover reverts on malleable, failed, or
                // zero-address recovery, so this can never return a bogus
                // signer. The invariant lives in one place.
                return ecrecover(digest, v, r, s);
            }
        }
    }
}
```

The second axis is another trait, with the fee options as their own types:

```js
// Axis two: how much of a deposit is credited?
trait FeePolicy<f> {
    function afterFee(policy: f, amount: uint256) returns (uint256);
}

enum NoFee {
    NoFee
}

impl FeePolicy<NoFee> {
    function afterFee(policy: NoFee, amount: uint256) returns (uint256) {
        return amount;
    }
}

enum FlatFee {
    FlatFee(uint256)
}

impl FeePolicy<FlatFee> {
    function afterFee(policy: FlatFee, amount: uint256) returns (uint256) {
        match (policy) {
            case FlatFee(fee) {
                if (amount > fee) {
                    return amount - fee;
                }
                return uint256(0);
            }
        }
    }
}

enum BasisFee {
    BasisFee(uint256)  // a percentage in basis points
}

impl FeePolicy<BasisFee> {
    function afterFee(policy: BasisFee, amount: uint256) returns (uint256) {
        match (policy) {
            case BasisFee(bps) {
                return amount - amount * bps / uint256(10000);
            }
        }
    }
}
```

Two things are worth pausing on.
First, each `impl` block is the _only_ place `afterFee` is defined for its type.
A trait has one implementation per type, so there is nothing to disambiguate: no `override(...)` list, because no two implementations ever compete for the same call.
Second, the fee behavior of `BasisFee` is a property of `BasisFee` alone.
It does not depend on what else is in the program, and it cannot be changed by a contract deployed elsewhere.

### Composition is a value, not an inheritance list

The interesting case is composing fee policies, layering a percentage fee and then a flat fee, say.
Under inheritance this is where the linearization order would silently decide who runs first.
In Core Solidity, composition is just another type, and the order is the expression you write:

```js
// Policies compose as values, applied left to right. The order is the
// expression written at the use site, not the C3 linearization of an
// inheritance list.
enum Stacked<f, g> {
    Stacked(f, g)
}

impl<f, g> FeePolicy<Stacked<f, g>> where f: FeePolicy, g: FeePolicy {
    function afterFee(policy: Stacked<f, g>, amount: uint256) returns (uint256) {
        match (policy) {
            case Stacked(first, second) {
                return FeePolicy.afterFee(second, FeePolicy.afterFee(first, amount));
            }
        }
    }
}
```

`Stacked<f, g>` is a `FeePolicy` whenever both `f` and `g` are, and it applies `first` and then `second`.
`Stacked(BasisFee(30), FlatFee(2))` reads exactly as it runs: basis fee, then flat fee.
Reorder the arguments and you reorder the computation.
There is no third contract whose deployment could change the answer.

Finally, the engine, the code that is genuinely shared, is a single generic function written once for every context and every fee policy:

```js
// The engine, written once for every context and fee policy: who gets
// credited with how much. Storage stays with each contract.
function settle<c, f>(ctx: c, policy: f, amount: uint256) returns ((address, uint256))
    where c: TxnContext, f: FeePolicy
{
    return (TxnContext.originator(ctx), FeePolicy.afterFee(policy, amount));
}
```

`settle` is the counterpart of the shared base method in an inheritance design, but it participates in no dispatch hierarchy.
It takes its context and policy as ordinary arguments and calls the trait methods on them.
Which implementation runs is determined by the static types of `ctx` and `policy`, resolved at compile time.

### The leaves

The deployable contracts each bind their own choice on each axis and call `settle`.
This is the counterpart of an inheritance diamond's leaf contracts; note what is absent: no `is` clause, no `override` list, no `super`.

```js
contract VaultDirect {
    balances : mapping(address => uint256);

    function deposit(amount: uint256) public {
        match (settle(Direct, NoFee, amount)) {
            case (who, credited) {
                balances[who] = balances[who] + credited;
            }
        }
    }
    // ... balanceOf omitted
}

contract VaultPremium {
    balances : mapping(address => uint256);

    function deposit(amount: uint256) public {
        let policy = Stacked(BasisFee(uint256(30)), FlatFee(uint256(2)));
        match (settle(Direct, policy, amount)) {
            case (who, credited) {
                balances[who] = balances[who] + credited;
            }
        }
    }
    // ... balanceOf omitted
}
```

A third vault, `VaultGasless`, binds `Signed` on the first axis and a constructor-configured `FlatFee` on the second, so anyone can relay a deposit and the credited account is recovered from a signature.
It is deployed with its own constructor and its own storage, and it reuses the very same `settle`.

Adding a fourth vault is a matter of choosing a point on each axis: `settle(Signed(...), Stacked(BasisFee(...), NoFee), amount)`.
Adding a _new axis_, a withdrawal policy, a rounding rule, is a new trait and a new type parameter on `settle`, with no change to the existing options and no re-linearization of anything.

## Why the C3 Problems Cannot Occur

Line the three surprises up against this design and each one becomes impossible to express, not merely discouraged.

**Dispatch does not depend on the deployed contract.**
`FeePolicy.afterFee(policy, ...)` resolves on the static type of `policy`.
There is no "next implementation in a list," so there is no list that a different deployment could reorder.
`BasisFee` computes the same fee in `VaultPremium` as it would anywhere else.
Composition order is written explicitly in `Stacked(first, second)` at the use site, the one place a reader is already looking, instead of being an emergent property of an `is B, C` clause elsewhere.

**What you type-check is what runs.**
Trait resolution is coherent: a type has exactly one implementation of a trait, and the compiler resolves each call to that implementation.
The candidate considered during type checking _is_ the one selected at code generation.
A `super` call cannot slip sideways into a stranger, because there is no `super` and no whole-program list to slip along.
The guarantees you reason about locally, that `TxnContext<Signed>` recovers a signer via `ecrecover` and reverts on failure, hold wherever `Signed` is used.

**There is no construction-time dispatch inversion.**
The shared logic lives in free functions (`settle`, the trait methods) that take their inputs as explicit values.
No base constructor calls a virtual method that reaches down into a not-yet-initialized override, because there are no base constructors and no overrides.
Each vault's constructor initializes only its own storage; `VaultGasless` sets its `flatFee` and nothing reads that field before it is set.
The pathological "contract disagrees with itself" state has no way to arise.

## Composing State, Not Just Behavior

The vaults compose behavior, but the pieces they compose, a context and a fee policy, are stateless values handed to `settle`.
The harder question is what happens when the reusable pieces carry _state_ of their own.
That is exactly what the most common inheritance stack does: an ERC20 token that mixes in `Ownable`, `Pausable`, and a supply cap is written `contract Token is ERC20, Ownable, Pausable, Capped`, and each base contributes storage (`_owner`, a paused flag, `_balances`, a cap) and hooks a `_beforeTokenTransfer` that the chain runs through `super`.

This is where inheritance's coupling bites hardest.
The storage of all four bases shares one linear layout decided by the linearization; the hook order is decided by the same list; and each base's initializer must run in that order or a later read sees zero.
That shared layout is fragile enough under mixin reordering and upgrades that OpenZeppelin adopted [ERC-7201 namespaced storage](https://eips.ethereum.org/EIPS/eip-7201) to escape it.

Core Solidity composes the same token from self-contained modules.
Each feature module owns its own storage at an ERC-7201 namespaced slot and, where it needs to run on every transfer, ships a `TransferHook` implementation.
Here is the entire ownership module: one slot, and the operations on it.

```js
// ownable.sol -- owns one ERC-7201 namespaced slot; nothing is inherited.
function ownerSlot() returns (word) {
    return Typedef.rep(erc7201("token.ownable"));
}
function owner() returns (address) {
    return address(sload(ownerSlot()));
}
function initOwner(who: address) {
    require(owner() == address(0), "already initialized");
    sstore(ownerSlot(), Typedef.rep(who));
}
function requireOwner() {
    require(sender() == owner(), "not the owner");
}
```

There is no `Token` storage variable for the owner: the slot belongs to the `ownable` module, and its address is derived from the string `"token.ownable"`.
The `pausable`, `capped`, and `erc20core` (ledger) modules own their own namespaced slots the same way.
Because each namespace is distinct, the slots cannot collide, and there is no shared layout that a change in composition order could shift.

Behavior that must run on every balance change is a hook trait, composed as a value exactly like the fee policies were:

```js
// hooks.sol
trait TransferHook<h> {
    function on(hook: h, from: Option<address>, to: Option<address>, amount: uint256);
}

enum NoHook {
    NoHook  // identity chain; monomorphization erases it
}

impl TransferHook<NoHook> {
    function on(hook: NoHook, from: Option<address>, to: Option<address>, amount: uint256) {}
}

enum Stacked<f, g> {
    Stacked(f, g)
}

impl<f, g> TransferHook<Stacked<f, g>> where f: TransferHook, g: TransferHook {
    function on(hook: Stacked<f, g>, from: Option<address>, to: Option<address>, amount: uint256) {
        match (hook) {
            case Stacked(first, second) {
                TransferHook.on(first, from, to, amount);
                TransferHook.on(second, from, to, amount);
            }
        }
    }
}
```

Each stateful feature provides its own hook.
Pausing refuses any transfer while the flag is set; the cap refuses a mint that would push supply over the limit:

```js
// pausable.sol
enum Pausable {
    Pausable
}

impl TransferHook<Pausable> {
    function on(hook: Pausable, from: Option<address>, to: Option<address>, amount: uint256) {
        requireNotPaused();
    }
}
```

The ledger module owns the balances and total supply, and exposes a single `apply` function that runs a before-chain and an after-chain around every effect, so no hook can be skipped:

```js
// erc20core.sol -- the only exported way to move balances.
function apply<b, a>(before: b, after: a, from: Option<address>, to: Option<address>, amount: uint256)
    where b: TransferHook, a: TransferHook
{
    TransferHook.on(before, from, to, amount);
    // ... mint / move / burn against the namespaced balance and supply slots ...
    TransferHook.on(after, from, to, amount);
}
```

The token contract is then pure wiring.
It holds no storage of its own: it initializes each module in its constructor and declares the hook chain once, at the single choke point every balance change flows through.

```js
contract Token {
    constructor() {
        initOwner(sender());
        setCap(uint256(1000000));
    }

    // Every balance change flows through here; the hook chain is named once.
    function update(from: Option<address>, to: Option<address>, amount: uint256) {
        apply(Stacked(Pausable, Capped), NoHook, from, to, amount);
    }

    function mint(to: address, amount: uint256) public {
        requireOwner();
        update(Option.None, Option.Some(to), amount);
    }

    function pause() public {
        requireOwner();
        setPaused(true);
    }
    // ... transfer, burn, balanceOf, totalSupply, transferOwnership ...
}
```

The three C3 surprises have stateful analogues, and each one is again absent:

- **Storage layout is namespaced, not linearized.** Each module owns a slot derived from its own name, so the four features' storage cannot collide and no reordering can move it. What OpenZeppelin reaches for ERC-7201 to achieve on top of inheritance is simply how a stateful module holds its state here.
- **The hook chain is a value, not a `super` chain.** `Stacked(Pausable, Capped)` runs pausing and then the cap check because that is the expression written at the choke point, not because a linearization put one before the other.
- **Initialization is explicit and ordered.** The constructor calls `initOwner` and then `setCap`, in the order written, and each reads only the slot it just set. No base initializer runs before the state it depends on exists.

The `Token` contract declares no storage variables at all, yet it composes four independently-authored stateful features.
Nothing is inherited: the state is contributed by the modules and kept disjoint by construction.

## The Trade-off

Removing inheritance is not free.
What you give up is _implicit_ wiring: inheritance assembles the storage layout, the hook order, and the initializer sequence for you out of a single `is` list.
In Core Solidity you write those connections by hand.
The vaults repeat a `balances` line when they want contract-local state; the token initializes each module in its constructor and names its hook chain explicitly in `update`.
There is a little more to type, and no compiler magic laying out storage across a hierarchy for you.

What you get back is that every one of those connections is _local and visible_.
Inheritance bundled three separate things, code reuse, storage layout, and dispatch, and made all three follow the same clause.
Core Solidity unbundles them: behavior is a trait implemented once per type; composition is a value applied in the order you wrote; and state is either a contract-scoped field, when you want locality, or a module that owns a namespaced slot, when you want to share it, never an inherited layout whose order another contract decides.
For software where a surprising dispatch order or a shifted storage slot can silently misroute funds, and where audits are measured in five and six figures, moving that reasoning out of the whole-program linearization and into the file you are reading is a trade worth making.

As always, this is a prototype.
The syntax is provisional, the standard library is still growing, and the examples take shortcuts production code would not: the vaults credit balances without taking token custody or binding a nonce and chain id into the signed digest, and the token omits approvals.
The composition mechanism itself, however, is exactly what ships: traits, generics, values, and modules that own their state, with no inheritance behind them.

## Conclusion

Classic Solidity's inheritance conflated code reuse with a whole-program dispatch order, and C3 linearization is the price of making that order well-defined.
The rules are internally consistent, but their consequences, `super` that is not your parent, `super` that lands on a stranger, constructors that read through live overrides, are decided by the final deployed contract and are invisible in any single file.

Core Solidity separates the concerns that inheritance tangled together.
Shared behavior is a trait implemented once per type; a generic engine is written once and reused; composition is a value applied in the order you wrote; and shared state is a module that owns a namespaced slot rather than a layout inherited from a base.
Dispatch is resolved from static types at the call site, storage is kept disjoint by name, and both are decided in the file you are reading, so the surprises that make diamonds hard to audit, for behavior and for state alike, are not just unlikely, they are unrepresentable.
The cost is a little explicit wiring; the benefit is that composition finally means what it says, right where you read it.

The full examples are available in the playground, both the [fee-policy vaults](https://github.com/argotorg/solcore-rs/tree/main/playground/src/examples/composition) and the [stateful token extensions](https://github.com/argotorg/solcore-rs/tree/main/playground/src/examples/extensions), and the prototype lives at [github.com/argotorg/solcore](https://github.com/argotorg/solcore).
We are looking forward to your feedback.
