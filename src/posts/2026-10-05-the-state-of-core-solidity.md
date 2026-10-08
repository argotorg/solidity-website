---
layout: post
published: true
title: 'The State of Core Solidity'
date: '2026-10-05'
author: Solidity Team
category: Announcements
---

[//]: # "TODO: confirm the publish date and update the filename and the date field to match."

Core Solidity is a new frontend for `solc`.
It gives the language a new type system with algebraic data types, pattern matching, generics, traits and compile-time evaluation, and it moves much of what is built into the compiler today into a standard library written in the language itself.
The backend stays the same: Core Solidity compiles down to Yul, and from Yul onwards the bytecode is produced by the optimizer and code generator that `solc` already uses for Classic Solidity, the language `solc` compiles today.
The prototype compiler already works this way, emitting Yul and handing it to `solc`.
Several people we spoke with this year assumed that Core Solidity replaces the whole compiler, and we want to make clear that this is not the case.

We introduced Core Solidity in [The Road to Core Solidity](/blog/2025/10/21/the-road-to-core-solidity/), described its design in the [Core Solidity Deep Dive](/blog/2025/11/14/core-solidity-deep-dive/) and covered one feature in detail in [Pattern Matching in Core Solidity](/blog/2026/05/05/pattern-matching-in-core-solidity/).
The syntax has changed a lot since those posts and now looks much more like Classic Solidity.

This post is a status update.
It covers the current state of the language, what is still missing, what the community has told us, what we changed and learned as a result, and what comes next.
It reflects the state at the end of September 2026.
Core Solidity is still a prototype, and the details below are subject to change.

## Current state of the language

We reworked the syntax over the summer to bring it closer to Classic Solidity.
The code samples in the earlier posts were written in a provisional syntax and no longer compile, while the concepts they describe still apply.
This is what a small contract looks like now:

```solidity
import * from std;
import * from std.dispatch;
import * from std.Generic;
import * from std.StorageGeneric;

// An escrow whose lifecycle is an enum stored in a state variable.
enum Phase {
    AwaitingPayment,
    Funded(uint256),
    Released(uint256)
}

contract Escrow {
    phase: Phase;

    constructor() {
        phase = Phase.AwaitingPayment;
    }

    // Fund once; a second deposit is rejected.
    function deposit(amount: uint256) public {
        match (phase) {
            case Phase.AwaitingPayment {
                phase = Phase.Funded(amount);
            }
            default {
                revertWithError("already funded");
            }
        }
    }

    // Record the release so that it cannot be repeated.
    function release() public returns (uint256) {
        match (phase) {
            case Phase.Funded(amount) {
                phase = Phase.Released(amount);
                return amount;
            }
            default {
                revertWithError("nothing to release");
                return 0;
            }
        }
    }

    // 0 = awaiting payment, 1 = funded, 2 = released
    function status() public returns (uint256) {
        match (phase) {
            case Phase.AwaitingPayment { return 0; }
            case Phase.Funded(_) { return 1; }
            case Phase.Released(_) { return 2; }
        }
    }
}
```

Contracts and functions look the way a Solidity developer expects.
The visible differences are that types follow names (`phase: Phase`, `amount: uint256`), that everything beyond a small set of built-in types is imported explicitly, including the standard library, and that an `enum` variant can carry data.
An enum like `Phase` is what we mean by an algebraic data type.
The imports also bring in the library code behind the contract's dispatch and the storage encoding of `Phase`.
`match` takes `Phase` apart, and a `match` that leaves a case unhandled and has no `default` arm is rejected by the compiler.

The example shows a rough edge as well: there is no `revert` statement, so reverting with a message goes through the standard library function `revertWithError`, and because the compiler does not know that it never returns, `release` still needs a `return` after it.
The contract only tracks state, and value transfer is left out to keep it short.
You can open it in the [playground](https://playground.solcore.soliditylang.org/#/examples/pattern-matching), change it and call it.

The prototype compiler in the [solcore repository](https://github.com/argotorg/solcore) supports the following today.
The links open runnable examples in the playground.

- Algebraic data types with pattern matching and exhaustiveness checking ([escrow](https://playground.solcore.soliditylang.org/#/examples/pattern-matching), [NFT with typed ownership](https://playground.solcore.soliditylang.org/#/examples/mini-nft)).
- Traits and implementations ([light switch](https://playground.solcore.soliditylang.org/#/examples/trait)), and `derive` for generating trait implementations.
- Generics with `where` constraints, and type inference ([one `max` for every ordered type](https://playground.solcore.soliditylang.org/#/examples/generics)).
- Modules with explicit imports and exports, including types exported without their variants, so that other modules cannot construct them directly ([constant-product pool](https://playground.solcore.soliditylang.org/#/examples/invariants)).
- Compile-time evaluation, which is also how constants are written ([comptime](https://playground.solcore.soliditylang.org/#/examples/comptime)).
- Lambdas ([reentrancy-locked vault](https://playground.solcore.soliditylang.org/#/examples/reentrancy)).
- Structs with named fields.
- Storage and mappings, including algebraic data types in storage.
- ABI encoding and decoding, with encoders and decoders derived for user-defined types.
- Array literals and storage arrays.

The prototype has been tried on real contracts as well.
The repository contains ports of the Ethereum deposit contract, WETH9 and a minimal ERC20 token, and its test suite compiles them through `solc` and executes them on an EVM as part of continuous integration.
The ports leave out events, since the language has none yet.

The [playground](https://playground.solcore.soliditylang.org/) is the quickest way to try Core Solidity.
You can compile a contract, call it in the page, look at the generated bytecode and share a link to the example and view you have open.
Besides the examples linked above, it includes [three vaults composed over one shared engine module](https://playground.solcore.soliditylang.org/#/examples/composition) and [an ERC20-style token built from feature modules](https://playground.solcore.soliditylang.org/#/examples/extensions).
New language features are usually added to the solcore repository first and reach the playground later, so the playground can lag behind the list above.
Structs, for example, are in the repository and, at the time of writing, not yet in the playground.

[//]: # "TODO: get the team's decision on whether to state which code generation backend the playground uses, and adjust the playground paragraph and the backend sentences in the intro to match."

We are also formalizing the semantics of Core Solidity in the Lean 4 proof assistant, in the [solcore-lean repository](https://github.com/argotorg/solcore-lean).
This is work in progress, and we will share more once there are results to report.

## What is still missing

Several features that production contracts rely on are still missing.
The lists below describe the main branch of the solcore repository.
Pull requests are opened and merged every week, so these lists will change soon after this post is published.
They are also not exhaustive: the [syntax chapter](https://argotorg.github.io/solcore/sail/syntax.html) of the reference documentation describes what the compiler accepts today.

[//]: # "TODO: re-check these lists and the feature list above against the main branch of the solcore repository on the day of publication."

### In progress, with open pull requests

- General memory arrays and array slices. Memory arrays exist only in a limited form today.
- Signed integers and integer widths other than 256 bits. Today `uint256` is the only integer type besides `word`, the raw 256-bit EVM word.
- Interfaces and calls to other contracts, starting with basic types. Today only low-level calls are available.

### Not there yet

- Checked arithmetic. Integer operations wrap today, and making them checked by default is still to be done.
- Short-circuit evaluation of `&&` and `||`. Both operands are evaluated today.
- Events and `emit`. Raw logs work.
- Custom error declarations and errors with arguments. Reverting with a string or with an error selector through `require` works, although the string is not yet encoded the way Classic Solidity encodes `Error(string)`.
- `view` and `pure`.
- Immutables.
- Creating contracts from other contracts with `new`.
- A replacement for `try`/`catch`.
- Function selectors through `.selector` or a similar mechanism.
- Several operators: shifts, exponentiation, increment and decrement, and unary minus.

Gas cost and code size have not been a focus of the prototype, and we have not compared them with Classic Solidity yet.

### Deliberately different

Core Solidity has no inheritance, so there is no `virtual` and there are no abstract contracts.
There are no Classic-style libraries either.
Composition through traits and modules takes their place, and the [composition](https://playground.solcore.soliditylang.org/#/examples/composition) and [extensions](https://playground.solcore.soliditylang.org/#/examples/extensions) examples show what that looks like today.
We will publish a deep dive into composition without inheritance within the next couple of weeks.

### Documentation

The work-in-progress [reference documentation](https://argotorg.github.io/solcore/) is written for compiler and tool developers, and it documents the syntax, the type system and the module system.
Most of the chapters for contract developers are not written yet.

## What the community told us

Since March 2026 we have held 18 qualitative interviews about Core Solidity, most of them one-to-one and some with several guests.
We spoke with protocol developers, security researchers and auditors, educators, maintainers of libraries and developer tools, a wallet team, and people who research and design programming languages.
In most of the calls they read Core Solidity code in the playground for the first time and talked us through what they saw.
The earliest interviews took place before the playground existed, so the reactions to code below come from the later ones.
If you would like to share your feedback with us as well, the end of this post says how to reach us.

[//]: # "TODO: update the number of interviews if more have taken place before publication."

### First reactions

Algebraic data types and pattern matching were very well received by almost everyone who saw them.
Several guests asked about or singled out the fact that the compiler rejects a forgotten case.

Nearly everyone who read a Core Solidity contract without preparation could follow it, and many said it looks like Solidity.

### Inheritance and composition

When a Core Solidity contract is composed from modules, a function from a module can only be called from outside if the author explicitly wraps it in a public function.
This is the shape of it, shortened from the [extensions example](https://playground.solcore.soliditylang.org/#/examples/extensions):

```solidity
// ownable.sol
export { owner, initOwner, requireOwner, transferOwnership };

function initOwner(who: address) {
    require(owner() == address(0), "already initialized");
    sstore(ownerSlot(), Typedef.rep(who));
}

function requireOwner() {
    require(sender() == owner(), "not the owner");
}

function transferOwnership(to: address) {
    requireOwner();
    sstore(ownerSlot(), Typedef.rep(to));
}

// Token.sol
import {owner as storedOwner, initOwner, requireOwner, transferOwnership as setOwner} from ownable;

contract Token {
    constructor() {
        initOwner(sender());
    }

    function mint(to: address, amount: uint256) public {
        requireOwner();
        // The balance update is left out here.
    }

    function owner() public returns (address) {
        return storedOwner();
    }

    function transferOwnership(to: address) public {
        setOwner(to);
    }
}
```

The module owns its storage and exports ordinary functions.
`Token` imports four of them, and only `owner` and `transferOwnership` become part of its interface, because those are the two it wraps in public functions.
`initOwner` runs in the constructor and `requireOwner` guards `mint`, whose balance update is left out above, and neither can be called from outside.
The auditors and security researchers who saw this liked it, because finding the exposed surface of a contract is one of the first steps of a review.

Most of the guests who took a position were comfortable with removing inheritance, and several of those who audit contracts said inheritance makes review harder.
A few teams depend on specific inheritance patterns today, and they want to see those patterns expressed with composition before they form a view.
The questions we heard were whether composition holds up for large real-world contracts, and how a reusable module can own its state without handling raw storage slots.
The modules in the [extensions](https://playground.solcore.soliditylang.org/#/examples/extensions) and [reentrancy](https://playground.solcore.soliditylang.org/#/examples/reentrancy) examples read and write ERC-7201 namespaced storage slots directly today.
Several of the playground examples are a direct result of feedback and requests from the interviews, and we are building more and larger composition examples.

### Tooling and adoption

The guests who maintain analysis and developer tools expect modest work to support Core Solidity.
For tools that read the syntax tree they expect mostly a new parser, and tools that work on bytecode are not affected.
One asked that the syntax tree stay close to today's.

On adoption, we heard that conservative, established projects expect to wait for a track record, and for auditors and tooling to be ready, before they consider a new language.

### Two open questions

We asked about two questions that are still open.

The first is compatibility between the two languages.
Core Solidity is designed to use the same ABI as Classic Solidity, so Core Solidity contracts will be able to call Classic Solidity contracts.
In the prototype, typed external calls are still in progress and the ABI encoding has known differences from Classic Solidity.
The other direction is the open part.
Algebraic data types in an external interface need ABI encodings that Classic Solidity does not have, so a Classic Solidity contract cannot call every Core Solidity interface without further work.
Most of the guests who took a position were comfortable with treating this as a lower priority.
One asked us to support both directions if we can, so that the two languages stay composable with each other.

The second is the scope of the standard library.
Opinions ranged from a minimal library to a comprehensive one, with a small base that established libraries build on as a middle position.
One argument we heard for keeping it small is that every bug in it reaches everyone who uses it.
We are working out how the community will take part in shaping the library.

We have not decided either question.
If you have an opinion on one of them, we would like to hear it.

### Solidity today and code written with AI

We also asked what hurts most in Classic Solidity.
The answers we heard most often were the contract size limit, stack-too-deep errors and compilation time.
The contract size limit is set by the EVM itself.
Stack-too-deep errors and compilation time are what the [experimental SSA CFG code generator](/blog/2026/04/29/solidity-0.8.35-release-announcement/#experimental-ssa-cfg-code-generator) is meant to address, and that work is in the backend that Core Solidity shares.

Most guests expect contracts to be increasingly written with AI and reviewed by humans.
Several concluded that this raises the value of readable, explicit code, and one added that precise compiler errors matter more when the author is an agent.

## What we changed and what we learned

The interviews are meant to work in both directions.
This is what has changed on our side so far:

- We added playground features that people asked for, including bytecode output and calling deployed contracts in the page.
- We corrected or extended example contracts after outside readers found problems in them.
- We opened issues for language problems that guests found during calls. One guest noticed that a state variable holding an algebraic data type silently starts as its first variant when the constructor does not initialize it. We filed [the issue](https://github.com/argotorg/solcore/issues/588) the same day, and a fix is in an open pull request.
- We revised our interview questions based on what guests told us.

Three things stood out beyond the individual requests.

**The frontend message:** Many people we spoke with did not know that Core Solidity is a new frontend on the existing backend.
We will communicate this more clearly going forward.

**Documentation:** It is one of the first things people ask for once they have seen real code.
The playground examples are enough for a first read, and after that people want something to work from.
We will prioritize bringing the documentation up to date in the upcoming development cycles.

**Compilation time:** It matters to users of Classic Solidity today, and it was among the problems raised most often.
Once the SSA CFG code generator is out of its experimental stage and fixes stack-too-deep errors in production, improving compilation time becomes the priority, and the SSA CFG work is a good foundation for it.

## What comes next

We are scoping a first release of the prototype that people can install and try.
Its purpose is to get additional feedback early.
We do not have a date for it yet, and it is one of our priorities.

A deep dive into composition without inheritance comes next, and we are also working out the community process for the standard library.

In the meantime you can try the [playground](https://playground.solcore.soliditylang.org/), follow the work in the [solcore repository](https://github.com/argotorg/solcore) and join our [weekly team calls](https://docs.soliditylang.org/en/latest/contributing.html#team-calls), which are open to everyone.
If you want to go further than the playground, the repository has [build instructions](https://github.com/argotorg/solcore#development) for the prototype compiler.

In November we will be in Mumbai.
At the [DeFi Security Summit](https://defisecuritysummit.org/) (1 and 2 November) we will give the talk "What you need to know about Core Solidity".
At [Devcon](https://devcon.org) we will run the workshop "Your first Core Solidity smart contract".
We are happy to talk to anyone there who wants a demo or has feedback or opinions on Solidity.

[//]: # "TODO: add the day and time of the Devcon workshop once the schedule is announced."

The interviews continue, and more are already lined up.
If you write, audit, teach or build tools for Solidity and would like to be interviewed, share feedback or see a demo of Core Solidity, write to jacob at argot dot org.
