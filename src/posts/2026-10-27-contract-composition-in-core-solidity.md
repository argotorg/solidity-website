---
layout: post
published: true
title: 'Contract Composition in Core Solidity'
date: '2026-10-27'
author: Solidity Team
category: Announcements
---

Every non-trivial smart contract system reuses code.
Access control, pausing, reentrancy guards, fee logic, and token standards are written once and shared across many contracts.
In Classic Solidity, the mechanism for this is almost always **inheritance**.

Inheritance works well for sharing code, but it does more than that.
A derived contract also inherits the storage of all its bases, and calls through `virtual`, `override`, and `super` are resolved over a single ordering of all the contracts involved.
That ordering is computed for the _final deployed contract_, not for the contract you are reading.
The rule that computes it, called C3 linearization, can produce results that are hard to predict, and auditors have to work it out by hand.

Core Solidity takes a different approach.
As [announced in our deep dive](https://soliditylang.org/blog/2025/11/14/core-solidity-deep-dive/), we are removing inheritance from the language entirely.
This post shows one way to reuse code without it, using traits, generics, values, and structs that hold each module's state.
It is not the only possible design, and we are actively exploring alternatives.
If you have any ideas, we would like to hear them.

We look at what this approach costs and what it gains, using two small examples.
The first is a family of vaults that combine different _behaviors_ for two independent choices.
The second is an ERC20 token built from separate `Ownable`, `Pausable`, and supply-cap modules, each with its own _state_.
This is a common use of inheritance in Classic Solidity, built here without any base contracts.

## How Classic Solidity Composes Code

In Classic Solidity, shared behavior goes into base contracts that other contracts inherit from.
When two bases inherit from a common ancestor, the inheritance graph forms a _diamond_, and the compiler needs a rule that decides which implementation of a function comes next.
That rule is **C3 linearization**.
It flattens the inheritance graph of the most derived contract into a single ordered list, and `super.f()` means "the next contract after me _in the linearization of the contract being deployed_ that defines `f`."

## Problems with C3 Linearization

Together with virtual dispatch, C3 linearization leads to three kinds of surprising behavior.
Each one is shown below with a small example.

### `super` does not always call the parent contract

Consider a simple diamond:

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
D          [D, C, B, A]     B.f                     1234
```

When `C` is deployed on its own, its `super.f()` calls `A.f`, its only base.
When `D` is deployed, the _same code_ in `C` calls `B.f`, even though `C` does not inherit from `B`.
The two are siblings, and `B` may not even have existed when `C` was written.
Nothing in `C` changed, only the linearization of the deployed contract.

### `super` can call an unrelated contract

Because the target is chosen from the linearization of the deployed contract, it can be a contract that shares no ancestor with the caller:

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

The linearization of `D` is `[D, B, X, A]`, so the `super.f()` inside `B` calls `X.f` and returns `100`.
`X` is not a base of `B`, not derived from `B`, and shares no ancestor with it.
The only link between them is that a third contract, `D`, lists both.
When `B` is type-checked, its `super.f()` is checked against the bases of `B`.
At code generation, it is resolved over the linearization of `D`, which is a different set of contracts.
Properties of `A.f`, such as its mutability, its gas cost, its reentrancy behavior, or whether it touches storage, do not necessarily hold for `X.f`.

### Base constructors can call overrides before their state is initialized

Virtual dispatch already works during construction.
A base constructor that calls a virtual function does not call the base's own implementation, but the most derived override.
That override runs before the constructor that initializes the state it reads:

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

After deploying `B`, `captured` is `0`, while every later call to `f()` returns `100`.
Constructors run in the opposite order of the linearization, from the most base-like contract to the most derived one.
This means the most derived override is always initialized last, so its state is never ready when a base constructor calls it.
The compiler does not warn about this.

All three examples use ordinary code.
No contract refers to its siblings, and the functions only touch ordinary state.
The behavior depends on _the whole program_, not on any single file you can read.
This often makes inheritance-heavy contracts difficult and expensive to audit.
Reviewers have to work out the linearization of each deployed contract by hand, and check that no `super` chain reaches an unrelated contract and that no constructor calls an override too early.
This work is tedious and error-prone, and it grows with the number of contracts and bases in a codebase.

## Composition Without Inheritance in Core Solidity

Core Solidity still lets you share behavior across contracts, but without inheritance.
There is no `virtual`, no `override`, no `super`, and no linearization.
The approach in this post uses four features that are already in the language:

- **Traits** (type classes) declare an interface that many types can implement.
- **Generics** let a function be written once and reused for every type that satisfies a trait.
- **Values** carry the choices, and are composed at the use site.
- **Modules** define a struct for their state and export it without its constructor and fields, and the contract stores it as a field.

Like everything in the prototype, the syntax below is provisional and may change before release.
The code is taken from a [runnable example in the playground](https://playground.solcore.soliditylang.org/#/examples/composition), which type-checks and compiles to executable code today.
The snippets in this post are shortened, and the full examples are linked at the end.

### The example: vaults with two independent choices

We want a family of deposit vaults that differ in two _independent_ choices:

1. **Where does the acting address come from?** A direct call, where the transaction caller acts for themselves, or a relayed call, where the acting address is recovered from a signature.
2. **How much of a deposit is credited?** No fee, a flat fee, a percentage fee, or some composition of those.

In Classic Solidity, you would typically write a base contract `VaultBase` with two virtual hooks, `originator()` and `afterFee()`.
Each option would be a mixin contract that overrides one of the hooks, and each vault would inherit the mixins it needs.
With a few options for each choice, you quickly end up with diamonds and `override(...)` lists.

Here is the same design with traits.
The first choice is a trait with one method, and each option is a small type with its own `impl`:

```js
// Where does the acting address come from?
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
                // zero-address recovery.
                return ecrecover(digest, v, r, s);
            }
        }
    }
}
```

The second choice is another trait, with the fee options as their own types:

```js
// How much of a deposit is credited?
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

A third policy, `FlatFee`, subtracts a fixed fee and is implemented in the same way.

First, each `impl` block is the _only_ place `afterFee` is defined for its type.
A type can implement a trait only once, so there is no need for an `override(...)` list to choose between implementations.
Second, the behavior of `BasisFee` depends only on its own `impl`.
Nothing else in the program can change it.

### Combining fee policies

Fee policies can also be combined, for example a percentage fee followed by a flat fee.
With inheritance, the linearization would decide which one runs first.
In Core Solidity, the combination is just another type, and the order is the order in which you write it:

```js
// Policies compose as values, applied left to right.
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
`Stacked(BasisFee(30), FlatFee(2))` applies the basis fee first and then the flat fee.
Swapping the arguments swaps the order.
No other contract can change this.

The shared logic is a single generic function that works for every context and every fee policy:

```js
// Written once for every context and fee policy: who gets credited
// with how much. Storage stays with each contract.
function settle<c, f>(ctx: c, policy: f, amount: uint256) returns ((address, uint256))
    where c: TxnContext, f: FeePolicy
{
    return (TxnContext.originator(ctx), FeePolicy.afterFee(policy, amount));
}
```

`settle` takes the place of the shared base contract in an inheritance design, but it is not part of any dispatch hierarchy.
It takes its context and policy as ordinary arguments and calls the trait methods on them.
The implementations that run are chosen at compile time, based on the types of `ctx` and `policy`.

### The vault contracts

Each deployable contract picks an option for each choice and calls `settle`.
For example, `VaultPremium` takes direct deposits and charges the stacked fee from above.
Note that there is no `is` clause, no `override` list, and no `super`:

```js
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

A second vault, `VaultDirect`, does the same with `NoFee`.
A third vault, `VaultGasless`, uses `Signed` for the first choice and a `FlatFee` set in the constructor for the second.
Anyone can relay a deposit, and the account to credit is recovered from a signature.
It has its own constructor and storage, and uses the same `settle` function.

Adding a fourth vault means picking an option for each choice: `settle(Signed(...), Stacked(BasisFee(...), NoFee), amount)`.
Adding a _new choice_, such as a withdrawal policy or a rounding rule, means adding a new trait and a new type parameter to `settle`.
The existing options do not change.

## Composing Contracts with State

The vaults compose behavior, but the context and fee policy they compose are stateless values passed to `settle`.
The harder case is when the reusable pieces have _state_ of their own.
A typical example is an ERC20 token with an owner, pausing, and a supply cap, written as `contract Token is ERC20, Ownable, Pausable, Capped`.
Each base contributes storage, such as `_owner`, a paused flag, `_balances`, or a cap.
Bases can also override `_update`, the internal function that every balance change goes through, and the overrides are chained through `super`.

The linearization decides the storage layout of all four bases, as well as the order of the `_update` overrides.
Each base's initializer also has to run in that order, or a later read sees zero.

With this approach, each module defines a struct for its state and the functions that use it.
The token contract declares a field for each struct, so it decides where each module's state is stored.
This mirrors the vaults, which build `Direct` or `Stacked(...)` values themselves and pass them to `settle`.
Here is the ownership module:

```js
// ownable.sol: the struct is exported without its constructor and fields.
export { Ownable, ownedBy, ownerOf, requireOwner, transferred };

struct Ownable {
    owner: address;
}

function ownedBy(who: address) returns (Ownable) {
    return Ownable(who);
}

function ownerOf(state: Ownable) returns (address) {
    return state.owner;
}

function requireOwner(state: Ownable) {
    require(sender() == state.owner, "not the owner");
}

function transferred(state: Ownable, to: address) returns (Ownable) {
    requireOwner(state);
    return Ownable(to);
}
```

Other modules can use the `Ownable` type, but the compiler rejects any use of its constructor or its `owner` field.
Only the functions in `ownable.sol` can create, read, or change an `Ownable` value.
`transferred` does not write to storage.
It returns a new value, and the contract stores it.

The pausing and cap modules follow the same pattern:

```js
// pausable.sol
struct Pausable {
    paused: bool;
}

function pauseState(flag: bool) returns (Pausable) {
    return Pausable(flag);
}

function requireNotPaused(state: Pausable) {
    require(!state.paused, "paused");
}

// capped.sol
struct Capped {
    cap: uint256;
}

function cappedAt(cap: uint256) returns (Capped) {
    return Capped(cap);
}

function requireWithinCap(state: Capped, supply: uint256) {
    require(supply <= state.cap, "cap exceeded");
}
```

The ledger module applies a balance change and returns the new total supply.
A change is a mint, a transfer, or a burn:

```js
// erc20core.sol
enum Change {
    Mint(address),
    Transfer(address, address),
    Burn(address)
}

function apply(
    balances: storage<mapping(address => uint256)>,
    supply: uint256,
    change: Change,
    amount: uint256
) returns (uint256) {
    // ... credit and debit balances, return the new total supply ...
}
```

The token contract declares the state of every module and calls the module functions:

```js
contract Token {
    ownable: Ownable;
    pausable: Pausable;
    capped: Capped;
    balances: mapping(address => uint256);
    supply: uint256;

    constructor() {
        ownable = ownedBy(sender());
        capped = cappedAt(uint256(1000000));
    }

    // Applies a balance change. Reverts while paused or if the new total
    // supply is above the cap. Change balances and supply only through this
    // function.
    function update(change: Change, amount: uint256) {
        requireNotPaused(pausable);
        supply = apply(balances, supply, change, amount);
        requireWithinCap(capped, supply);
    }

    function mint(to: address, amount: uint256) public {
        requireOwner(ownable);
        update(Change.Mint(to), amount);
    }

    function pause() public {
        requireOwner(ownable);
        pausable = pauseState(true);
    }

    function transferOwnership(to: address) public {
        ownable = transferred(ownable, to);
    }
    // ... transfer, burn, balanceOf, totalSupply, unpause, paused, owner ...
}
```

All of the token's state is declared in `Token`.
Every write to a module's state is an assignment in `Token`, such as `ownable = transferred(ownable, to)`.
`update` calls the pause check, the ledger, and the cap check, in that order.

The ledger is the exception.
A struct cannot contain a mapping yet ([solcore-rs#121](https://github.com/argotorg/solcore-rs/issues/121)), so `balances` and `supply` are plain fields in `Token`.
This means any function in `Token` can change them without going through `update`.

The fields of `Token` are laid out in the order they are declared.
[ERC-7201](https://eips.ethereum.org/EIPS/eip-7201) namespaces place state at a location that does not depend on this order.
Doing the same in Core Solidity would need a language feature similar to the `layout at` specifier in Classic Solidity.
There is an [open proposal](https://github.com/argotorg/solcore-rs/issues/122) for such a feature.

## Why the C3 Problems Cannot Occur

None of the three problems described earlier can be expressed in either example.

**Dispatch does not depend on the deployed contract.**
`FeePolicy.afterFee(policy, ...)` is resolved based on the type of `policy`.
There is no list of implementations, so there is nothing a different deployment could reorder.
`BasisFee` computes the same fee in `VaultPremium` as it would anywhere else.
The order of composition is written explicitly where it is used, instead of following from an `is B, C` clause in another contract.
`update` checks pausing and then the cap because that is the order of the calls in `update`.

**Type checking and code generation use the same implementation.**
Trait resolution is coherent, which means a type has exactly one implementation of a trait and every call resolves to it.
There is no `super` and no linearization, so a call cannot end up in an unrelated contract.
What you know about `TxnContext<Signed>`, for example that it recovers a signer with `ecrecover` and reverts on failure, holds wherever `Signed` is used.

**Constructors cannot call uninitialized overrides.**
The shared logic lives in free functions (`settle` and the trait methods) that take their inputs as explicit arguments.
There are no base constructors and no overrides, so no constructor can call into code whose state is not yet initialized.
Each vault's constructor initializes only its own storage, and `VaultGasless` sets its `flatFee` before anything reads it.
`ownedBy` and `cappedAt` only build values from their arguments, and the `Token` constructor stores the results.

## Conclusion

Removing inheritance has a cost.
With inheritance, a single `is` list sets up the storage layout, the order of the checks, and the order of initializers for you.
In Core Solidity you write these connections yourself.
Each vault declares its own `balances` mapping.
The token declares a field for each module's state, sets them in its constructor, and calls each module's check in `update`.
There is a bit more code to write, and the compiler does not lay out storage across a hierarchy for you.
The compiler also does not check that `update` calls every module's check.

In return, each connection is written where it is used.
Inheritance ties together code reuse, storage layout, and dispatch, and controls all three with the same `is` clause.
The approach in this post separates them.
Behavior is a trait implemented once per type, composition is a value applied in the order you write it, and each module's state is a struct that the contract stores as a field.
As a result, both dispatch and storage layout can be understood from the file you are reading.

Core Solidity is still a prototype.
The syntax is provisional and the standard library is still growing.
The examples also take shortcuts that production code should not.
The vaults credit balances without actually receiving tokens, and the signed digest does not include a nonce, the chain ID, or the vault address.
`BasisFee` can also overflow for very large amounts, because `uint256` arithmetic in the standard library is not checked yet.
The token does not implement approvals.
This is an early proposal for composition in Core Solidity, and we want feedback on it before settling on a final design.

You can try the [fee-policy vaults](https://playground.solcore.soliditylang.org/#/examples/composition) and the [stateful token extensions](https://playground.solcore.soliditylang.org/#/examples/extensions) in the online playground.
The full source is also available on GitHub: the [fee-policy vaults](https://github.com/argotorg/solcore-rs/tree/main/playground/src/examples/composition) and the [stateful token extensions](https://github.com/argotorg/solcore-rs/tree/main/playground/src/examples/extensions).
The playground runs on [solcore-rs](https://github.com/argotorg/solcore-rs), a Rust implementation of the [Core Solidity prototype](https://github.com/argotorg/solcore).
We are open to suggestions and other ideas for how composition should work in Core Solidity.
Please share them in the [forum thread on contract composition](https://forum.soliditylang.org/t/request-for-comments-contract-composition-in-core-solidity/3734).
