---
layout: post
published: true
title: 'The State of Core Solidity'
date: '2026-10-05'
author: Solidity Team
category: Announcements
---

[//]: # "TODO: confirm the publish date and update the filename and the date field to match."

Core Solidity is the next version of the Solidity language.
It gives the language a new type system with algebraic data types, pattern matching, generics, traits and compile-time evaluation, and it moves much of what is built into the compiler today into a standard library written in the language itself.
We introduced it in [The Road to Core Solidity](/blog/2025/10/21/the-road-to-core-solidity/), described its design in the [Core Solidity Deep Dive](/blog/2025/11/14/core-solidity-deep-dive/) and covered one feature in detail in [Pattern Matching in Core Solidity](/blog/2026/05/05/pattern-matching-in-core-solidity/).

Core Solidity, or Core for short, is implemented as a new frontend on the existing compiler backend.
The language and the type system are new.
Core compiles down to Yul, and from Yul onwards the bytecode is produced by the optimizer and code generator that solc already uses for Classic Solidity, the language solc compiles today.
The prototype compiler already works this way: it emits Yul and hands it to solc.
Several people we spoke with this year assumed that Core replaces the whole compiler, and we have not been clear enough that it does not.

This post is a status update.
It covers where the language stands, what is still missing, what the community has told us, what we changed and learned as a result, and what comes next.
It reflects the state at the end of September 2026.
Core Solidity is still a prototype, the details below are subject to change, and we are not committing to a timeline for a production compiler.

## Where the language stands

Over the summer we reworked the syntax to bring it closer to Classic Solidity.
The earlier posts used a provisional syntax, and their Core code samples no longer compile.
The concepts they describe still apply.
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
                require(false, "already funded");
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
                require(false, "nothing to release");
                return uint256(0);
            }
        }
    }

    // 0 = awaiting payment, 1 = funded, 2 = released
    function status() public returns (uint256) {
        match (phase) {
            case Phase.AwaitingPayment { return uint256(0); }
            case Phase.Funded(_) { return uint256(1); }
            case Phase.Released(_) { return uint256(2); }
        }
    }
}
```

Contracts, functions and `require` look the way a Solidity developer expects.
The visible differences are that types follow names (`phase: Phase`, `amount: uint256`), that everything beyond a small set of built-in types is imported explicitly, including the standard library, and that an `enum` variant can carry data.
An enum like `Phase` is what we mean by an algebraic data type.
The imports also bring in the library code behind the contract's dispatch and the storage encoding of `Phase`.
`match` takes `Phase` apart, and a `match` that leaves a case unhandled and has no `default` arm is rejected by the compiler.
The example shows a rough edge as well: there is no `revert` statement, so the `default` arms use `require(false, ...)`, and `release` has a `return` after it that is never reached.
The contract only tracks state, and value transfer is left out to keep it short.
You can open it in the [playground](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/pattern-matching), change it and call it.

The prototype compiler in the [solcore repository](https://github.com/argotorg/solcore) supports the following today.
The links open runnable examples in the playground.

- Algebraic data types with pattern matching and exhaustiveness checking ([escrow](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/pattern-matching), [NFT with typed ownership](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/mini-nft)).
- Traits and implementations ([light switch](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/trait)), and `derive` for generating trait implementations.
- Generics with `where` constraints, and type inference ([one `max` for every ordered type](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/generics)).
- Modules with explicit imports and exports, including types exported without their variants, so that other modules cannot construct them directly ([constant-product pool](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/invariants)).
- Compile-time evaluation ([comptime](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/comptime)).
- Lambdas ([reentrancy-locked vault](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/reentrancy)).
- Structs with named fields.
- Storage and mappings, including algebraic data types in storage.
- ABI encoding and decoding, with encoders and decoders derived for user-defined types.
- Array literals and storage arrays.

The [playground](https://solcore-rs-preview.solcore-rs-team.workers.dev/) is the quickest way to try Core Solidity.
You can compile a contract, call it in the page, look at the generated bytecode and share a link to the example and view you have open.
Besides the examples linked above, it includes [three vaults composed over one shared engine module](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/composition) and [an ERC20-style token built from feature modules](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/extensions).
New language features usually land in the solcore repository first and reach the playground later, so the playground can lag behind the list above.
Structs, for example, are in the repository and not yet in the playground.

[//]: # "TODO: replace the playground address here and in every example link if the playground has moved to its permanent address."
[//]: # "TODO: get the team's decision on whether to state which code generation backend the playground uses, and adjust the playground paragraph and the backend sentences in the intro to match."

We are also formalizing the semantics of Core Solidity in the Lean 4 proof assistant.
This is work in progress and we have no results to report yet.

[//]: # "TODO: link the Lean repository here once it is public, and confirm its name (expected: solcore-lean)."

## What is still missing

Several features that production contracts rely on are still missing.
The lists below describe the main branch of the solcore repository, and they will change.
They are not exhaustive: the [syntax chapter](https://argotorg.github.io/solcore/sail/syntax.html) of the reference describes what the compiler accepts today.

[//]: # "TODO: re-check these lists and the feature list above against the main branch of the solcore repository on the day of publication."

In progress, with open pull requests:

- General memory arrays and array slices. Memory arrays exist only in a limited form today.
- Signed integers and integer widths other than 256 bits. Today `uint256` is the only integer type besides `word`, the raw 256-bit EVM word.
- Interfaces and calls to other contracts, starting with basic types. Today only low-level calls are available.

Not there yet:

- Checked arithmetic. Integer operations wrap today, and making them checked by default is still to be done.
- Short-circuit evaluation of `&&` and `||`. Both operands are evaluated today.
- Events and `emit`. Raw logs work.
- Custom error declarations and errors with arguments. Reverting with a string or with an error selector through `require` works, although the string is not yet encoded the way Classic Solidity encodes `Error(string)`.
- `view` and `pure`.
- Constants and immutables.
- Creating contracts from other contracts with `new`.
- A replacement for `try`/`catch`.
- Function selectors through `.selector`.
- Several operators: shifts, exponentiation, increment and decrement, and unary minus.

Some differences are deliberate.
Core Solidity has no inheritance, so there is no `virtual` and there are no abstract contracts.
There are no Classic-style libraries either.
Composition through traits and modules takes their place, and the [composition](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/composition) and [extensions](https://solcore-rs-preview.solcore-rs-team.workers.dev/#/examples/extensions) examples show what that looks like today.

Documentation is incomplete.
The work-in-progress [reference](https://argotorg.github.io/solcore/) is written for compiler and tool developers, and it documents the syntax, the type system and the module system.
Most of the chapters for contract developers are not written yet.

## What the community told us

Since March 2026 we have held 17 interviews about Core Solidity, most of them one-to-one and some with several guests.
We spoke with protocol developers, security researchers and auditors, educators, maintainers of libraries and developer tools, a wallet team, and people who research and design programming languages.
In most of the calls they read Core code in the playground for the first time and talked us through what they saw.
The earliest interviews took place before the playground existed, so the reactions to code below come from the later ones.
If you would like to be interviewed as well, the end of this post says how to reach us.

[//]: # "TODO: update the number of interviews if more have taken place before publication."

### First reactions

Algebraic data types and pattern matching were the best received part of the language.
Almost everyone who saw them welcomed them, and the compiler rejecting a forgotten case was the part several guests asked about or singled out.

Nearly everyone who read a Core contract without preparation could follow it, and many said it looks like Solidity.
One team found the `match` syntax unfamiliar on first read.

### Inheritance and composition

When a Core contract is composed from modules, a function from a module can only be called from outside if the author explicitly wraps it in a public function.
The auditors and security researchers who saw this liked it, because finding the exposed surface of a contract is the first step of a review.

Most of the guests who took a position were comfortable with removing inheritance, and more than one of those who audit contracts said inheritance makes review harder.
A few teams depend on specific inheritance patterns today, and they want to see those patterns expressed with composition before they form a view.
The questions we heard were whether composition holds up for large real-world contracts, and how a reusable module can own its state without handling raw storage slots.
The examples handle raw storage slots today.
This is why we are building more and larger composition examples, and why the next post in this series is about composition.

### Tooling and adoption

The guests who maintain analysis and developer tools expect modest work to support Core Solidity.
For tools that read the syntax tree they expect mostly a new parser, and tools that work on bytecode are not affected.
One asked that the syntax tree stay close to today's.

On adoption, we heard that conservative, established projects expect to wait for a track record, and for auditors and tooling to be ready, before they consider a new language.

### Two open questions

We asked about two questions that are still open.

The first is compatibility between the two languages.
Core is designed to use the same ABI as Classic Solidity, so Core contracts will be able to call Classic contracts.
In the prototype, typed external calls are still in progress and the ABI encoding has known differences from Classic.
The other direction is the open part.
Algebraic data types in an external interface need ABI encodings that Classic Solidity does not have, so a Classic contract cannot call every Core interface without further work.
Most of the guests who took a position were comfortable with treating this as a lower priority.
One asked us to support both directions if we can, so that the two languages stay composable with each other.

The second is the scope of the standard library.
Opinions ranged from a minimal library to a comprehensive one, with a small base that established libraries build on as a middle position.
One argument we heard for keeping it small is that every bug in it reaches everyone who uses it.
We are working out how the community will take part in shaping the library.

We have not decided either question, and we would like to hear from you if one of them matters for your contracts.

### Solidity today and code written with AI

We also asked what hurts most in Classic Solidity.
The answers we heard most often were the contract size limit, stack-too-deep errors and compilation time.
The contract size limit is set by the EVM itself.
Stack-too-deep errors and compilation time are what the [experimental SSA CFG code generator](/blog/2026/04/29/solidity-0.8.35-release-announcement/#experimental-ssa-cfg-code-generator) is meant to address, and that work is in the backend that Core shares.

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

The message that Core Solidity is a new frontend on the existing backend has not landed.
We will state it plainly from now on.

Documentation is one of the first things people ask for once they have seen real code.
The playground examples are enough for a first read, and after that people want something to work from.

Compilation time matters to users of Classic Solidity today.
It was among the problems raised most often.

## What comes next

We are scoping a first release of the prototype that people can install and try.
Its purpose is to get feedback early.
We do not have a date for it.

A post on composition without inheritance will follow within the next couple of weeks.
We are also working out the community process for the standard library.

In the meantime you can try the [playground](https://solcore-rs-preview.solcore-rs-team.workers.dev/), follow the work in the [solcore repository](https://github.com/argotorg/solcore) and join our [weekly team calls](https://docs.soliditylang.org/en/latest/contributing.html#team-calls), which are open to everyone.

In November we will be in Mumbai.
At the [DeFi Security Summit](https://defisecuritysummit.org/) (1 and 2 November) we will give the talk "What you need to know about Core Solidity".
At [Devcon](https://devcon.org) we will run the workshop "Your first Core Solidity smart contract".
We are happy to talk to anyone there who wants a demo or has feedback or opinions on Solidity.

[//]: # "TODO: add the day and time of the Devcon workshop once the schedule is announced."

The interviews continue, and more are already lined up.
If you write, audit, teach or build tools for Solidity and would like to be interviewed or see a demo of Core Solidity, write to jacob at argot dot org.
