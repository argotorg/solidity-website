---
layout: post
published: true
title: 'The Road to Core Solidity'
date: '2025-10-21'
author: Solidity Team
category: Announcements
---

# The Road to Core Solidity

Solidity has just reached its 10-year mark.
This is a perfect opportunity for us to present "The Road to Core Solidity", a series of blog posts through which we share where we are headed with the language.

In this series we want to show the community how we see the project's roadmap in the long run.
While we are quite confident about its general direction, many details are not set in stone.
It is as much a presentation of what will be, as an invitation to the discussion on the future of the language and a request for constructive feedback.

## About this blog post

This first blog post gives a brief introduction to each part in the long-term roadmap.
All of these topics will be covered in-depth in the series:
- Long-term trajectory of the language towards version 1.0.
- The ongoing work on the backend to fix long-standing issues with the IR pipeline, improve debugger support and keep up with EVM changes.
- The state of the language now and how far we can take it in accommodating users' wishes before we move on to Core Solidity.
- Planned breaking changes and interoperability features in the transition.
- What is (and isn't) Core Solidity.

...and more!

## Team notes
This year has seen changes in the team, some of which had a big impact on our plans:

- As Solidity joined Argot as a new home for core Ethereum infrastructure, much of 2025 was dedicated to preparing for Argot's successful launch.
- Daniel Kirchner, former team lead, is currently on sabbatical.
- Aligned with Argot's non-hierarchical approach, every experienced team member operates with substantial autonomy. Kamil Śliwak, formerly Solidity co-lead, serves as project facilitator during this transition.

We intend to give more in-person updates about the team's capacity and plans to acquire more resources for the ongoing and future development of the project at [Solidity Summit 2025](https://www.soliditylang.org/summit/) in Argentina during the Devconnect week.

## When 1.0?
Before we dive into the specifics, let us clarify the future of the language itself.

The environment in which it was conceived was very different than it is today.
The only real alternatives back then were [LLL](https://lll-docs.readthedocs.io) -
a very low-level language inspired by [Lisp](https://en.wikipedia.org/wiki/Lisp_(programming_language)),
comparable more to [Yul](https://docs.soliditylang.org/en/v0.8.30/yul.html) than to Solidity -
and [Serpent](https://github.com/ethereum/eth-wiki/blob/master/archive/serpent.md) -
a pythonic language that was the spiritual predecessor to [Vyper](https://vyperlang.org).
Both were important steps in the evolution of EVM languages, but also had significant
shortcomings which influenced the design of Solidity.

At the beginning the focus of Solidity was on ergonomics and introducing proper high-level abstractions.
Familiarity for programmers transitioning from general-purpose languages was also an important 
consideration and probably one of the big reasons behind Solidity's popularity.
While safety and correctness were always seen as important, it was only gradually that they became 
factors overriding other considerations.
The language was shaped by the long history of smart contract hacks and countermeasures to them.
It adapted, becoming stricter, and more explicit.

Unfortunately, the organic growth under ever shifting priorities resulted in a lot of
technical debt, unnecessary complexity and many inconsistencies.
At the same time the language is still incomplete and missing important features such as generics.
These in particular would be a complicated undertaking if they were to be grafted on
the current type system.
Such a task would carry a high risk of introducing critical bugs.

For this reason we decided to take a different approach to the problem, which resulted in the work on the 
language being split into two separate tracks:
- **Classic Solidity** is the language in the form supported by [solc](https://github.com/argotorg/solidity) today.
    Despite it being used in production and the compiler being very reliable,
    we still do not consider the language itself stable, as reflected in the 0.x versioning.
    While the 0.8.x cycle has been exceptionally long, we are still planning regular breaking releases.
- **Core Solidity** is a revamp of the language, with a type system built from the ground up to support features like generics, first-class functions, and algebraic data types.
    It also features a standard library - a core set of reusable types and functions,
    that will form the foundation of future Solidity programs,
    and is designed to evolve under community stewardship.
    The guiding principle is minimalism - the language should have very few but very flexible features.
    Everything else should be built on top of it as syntactic sugar or become a part of the
    standard library.
    Despite the differences, it is still very much Solidity and will be as close as possible to
    Classic Solidity in terms of surface syntax.

Core Solidity is currently at the prototype stage, with all the design work happening in the
[solcore repository](https://github.com/argotorg/solcore).
The result of that work will be the new language specification, which will then be implemented in solc as the new compiler frontend, sharing the backend with Classic Solidity.
Solidity 1.0 will mark the point at which Core Solidity becomes stable enough to be the default frontend in solc.

## Ongoing backend work
The bulk of our current work is concentrated around backend improvements, which will benefit both
Classic and Core Solidity.
For a while now the focus has been primarily on solving the long-standing problems in the IR pipeline,  in order to enable it by default and deprecate the legacy evmasm pipeline.
Another important direction is the implementation of the ethdebug specification.
Finally, some effort is always needed to support changes to the underlying platform.

### Finishing the IR pipeline
The IR pipeline has long-standing issues that prevent it from becoming the default and fully replacing the evmasm pipeline.
We are tackling these issues on multiple fronts.

First, there are non-determinism issues with the optimizer pipeline in which the produced bytecode may change if unrelated source files are added to the compilation.
These problems usually appear when the internal IDs of Yul AST nodes inadvertently affect the order of operations performed in the IR pipeline (usually in the optimizer).
Currently those internal IDs are simply based on identifiers produced by the code generator, which include Solidity AST IDs as a way to maintain uniqueness.
We aim to mitigate this by switching to local, sequential numeric values for the internal IDs, to make them independent of the global Solidity AST.

Beyond that, the IR pipeline currently suffers from poor compilation times.
While the change in ID handling helps somewhat, the underlying issues are more related to the high algorithmic complexity of certain optimizer steps.
We are therefore rebuilding the pipeline's internal representation and code generation, following design patterns proven in major compilers and adapting them for EVM's unique constraints.
In particular, we are transforming the Yul IR into a [control-flow graph (CFG)](https://en.wikipedia.org/wiki/Control-flow_graph) in [static single-assignment form (SSA)](https://en.wikipedia.org/wiki/Static_single-assignment_form).
This SSA-CFG structure not only aligns with widely used representations but also enables more efficient data-flow-based optimization passes - alleviating said algorithmic complexity issues.

To support this work, we collaborate with the [COSTA group](https://costa.fdi.ucm.es/web/index.php) of the Complutense University of Madrid on Project GreY.
The group is better known for their work on [Circom 2](https://docs.circom.io) and [GASOL](https://github.com/costa-group/gasol-optimizer).
The project, started as an Ethereum Foundation grant, continues under Argot Collective, with the aim to develop novel greedy algorithms for translating SSA-CFGs produced from Yul into EVM bytecode.
As such, it not only can serve as methodical and theoretical underpinning of Solidity’s future IR to EVM bytecode transformation but might also bring huge wins in terms of gas savings.

While the previous paragraphs focused on compiler performance, performance of the generated bytecode in terms of gas needed to deploy and interact with contracts is equally important.
In the transition from Solidity to Yul IR, some semantic information necessary for certain optimizations is lost or at least harder to recover, particularly type information and memory layout details.
To address this, we are exploring ways to enrich Yul with types and possibly memory objects.
We are also evaluating other intermediate representations, e.g., [Sonatina](https://github.com/fe-lang/sonatina) or tools like [MLIR](https://mlir.llvm.org) to define a more gradual lowering from Solidity to Yul. These avenues can preserve more semantics and enable more powerful optimization passes at different levels of abstraction.

### Ethdebug support in the compiler
One of our long-term goals is to improve the debugging experience.
The debugging information currently provided by the compiler is limited and significantly degrades
when the code is optimized.
The complex shuffling introduced by the IR pipeline to provide better stack allocation does not help either.

This need is being addressed by the [ethdebug](https://ethdebug.github.io/format/) specification,
which establishes a compiler-agnostic format that provides a rich description of contract's
code and data layouts.
An initial version of the specification is nearly ready and work is underway on a reference implementation. 

Now the specification is being implemented in the Solidity compiler.
In [solc 0.8.29](https://www.soliditylang.org/blog/2025/03/12/solidity-0.8.29-release-announcement)
we shipped experimental support for the part of the specification that maps source code
to the corresponding instructions in the bytecode.
While this information was already available in the form of
[source maps](https://docs.soliditylang.org/en/v0.8.30/internals/source_mappings.html),
it is just a part of the specification and the output will be extended in future releases to cover
all of the [ethedebug schemas](https://ethdebug.github.io/format/spec/overview).

Internally, a major missing part is the support for the optimizer,
which is the main point of the whole effort.
The challenge lies in preserving the debugging information across the optimization steps,
since some optimizations destroy the simple 1:1 relationship between the source and the generated instructions.
Blocks may be duplicated or merged in the process and an equivalent transformation has to be applied
to the debug annotations.

### Readiness for EVM upgrades
Most of the EIPs included in Ethereum upgrades address the consensus layer or at least the aspects of the 
execution layer that do not directly affect compilers.
The ones that do are usually relatively small.
The most recent example is the introduction of the CLZ opcode in Fusaka upgrade
([EIP-7939](https://eips.ethereum.org/EIPS/eip-7939)).
Another would be the `PAY` opcode ([EIP-5920](https://eips.ethereum.org/EIPS/eip-5920)), which would warrant the introduction of a new builtin to replace the problematic `.send()` and `.transfer()`.

Other changes we expect in future forks are adjustments to code size limits 
([EIP-7907](https://eips.ethereum.org/EIPS/eip-7907)/[EIP-7903](https://eips.ethereum.org/EIPS/eip-7903)), the pricing of opcodes ([EIP-7904](https://eips.ethereum.org/EIPS/eip-7904)) or memory ([EIP-7923](https://eips.ethereum.org/EIPS/eip-7923)).
None of these would necessarily have to affect code generation, but optimizer choices are in many
cases guided by estimated gas costs, which would require updating them.
Some heuristics may also require adjustment - for example cheaper jumps would affect inlining trade-offs.
In the bigger picture, certain operations or patterns becoming cheaper could enable solutions that
were considered infeasible so far.

While we have seen attempts to revive [EOF](https://notes.ethereum.org/@ipsilon/about#EOF) in
the upcoming EVM upgrades, we do not expect that to be feasible due to the dissolution of the
[Ipsilon](https://ipsilon.xyz) team who were the main force behind its development.
There are however, several smaller proposals, addressing parts of the same set of problems, such as
[EIP-7979](https://eips.ethereum.org/EIPS/eip-7979) and
[EIP-8013](https://eips.ethereum.org/EIPS/eip-8013) by Greg Colvin.
While both are recent, they are notable as a continuation of his much earlier proposals to
eliminate static jumps and introduce subrountines, which predated EOF by a far margin.
Finally, [EIP-8024](https://eips.ethereum.org/EIPS/eip-8024) may be one way to sidestep the issues
around opcode immediate arguments and provide access to a bigger part of the stack.

The biggest change looming on the horizon is the planned introduction of
[Verkle trees](https://verkle.info).
While beneficial, such a change will be a big undertaking and will require us to rethink
some of the well-entrenched language mechanisms and conventions.
For example, the fact that the data area of a dynamic array in storage is not colocated with its
size field will likely have to change, because it relies on the assumption that all storage slots
are uniformly priced.
Similarly, code being read and priced in chunks will introduce new constraints on how the compiler
can lay it out in the binary.
Especially first access to data sections will incur an extra penalty in contracts that do not
fit in a single chunk.

## The future of Classic Solidity
For a long time we have been reluctant to add too many new language features to Classic Solidity
and complicate its implementation even further, while also potentially introducing design elements that
would constrain our options in Core Solidity.
Our hope was to quickly finish Core Solidity and implement them with much less effort on top of it.
Some as a part of the new standard library, some as syntax sugar, both of which would come with much
less maintenance burden and better extensibility.
The language was essentially in a soft feature freeze.

With the scope of Core Solidity becoming clearer and it morphing into a separate subproject,
we have decided to change this approach and take Classic Solidity a bit further,
as long as it does not conflict with the long-term direction of the new frontend.

We will soon publish what we termed "The future of Classic Solidity: A roadmap wishlist" - a list of language features that we are open to still implementing in the current language, categorized by the required implementation and design effort as well as the value it will provide in the long term, when Core Solidity takes over.
It will be accompanied by a detailed description of each feature, known difficulties and  options for the design.

We expect that we will not be able to deliver all of those features before we move on to Core Solidity.
This does not mean they will be abandoned.
While they may never land in Classic Solidity, we consider many of them essential to Solidity in the 
long-term and being able to build them using the new language mechanisms is what we were aiming for
from the beginning.

## Transition to Core Solidity

### Upcoming breaking releases
The 0.9 breaking release is not tied to any significant new features.
Everything  we are currently working on can be introduced in a non-breaking way, at most with minor
details being deferred until such a release.
The overarching theme will rather be simplification and removal of deprecated features
to shed some of the technical debt that has accumulated in the codebase.

The biggest changes include switching to the IR pipeline and enabling the optimizer by default.
We are also planning to remove support for ancient EVM versions and obsolete language features such as
`.send()`/`.transfer()` builtins or virtual modifiers.
SMTChecker will drop support for BMC and be renamed to SolCMC.

The plans for 0.10 and beyond are much less concrete.
There are several more obsolete elements we would like to remove and we may tweak existing features
in a breaking way to fix some of their design issues
(inheritance, `try`..`catch`, constructor evaluation order, etc.).
However, in terms of features, the overall theme will be the convergence with Core Solidity.

### Convergence with Core Solidity
One of our goals for Core Solidity is to make the transition from the current language as smooth as possible.
It will, of course, be a breaking change in many aspects, but the the surface syntax will change much less than the internals.
Part of this plan is to bring the syntax of Classic Solidity closer to the end state we want
to have in Core Solidity over a series of breaking releases, making the change even more gradual.
Such changes could include:
- **Postfix type notation**: `uint variable` -> `variable: uint`
- **New syntax for the ternary operator**: `condition ? a : b` -> `if (condition) a else b`
- **Short notation for function types**: `function(uint) returns (bool)` -> `(uint) -> (bool)`
- **Replacing magic properties with regular functions**:
    `block.number` -> `block.number()` or `<address>.code` -> `<address>.code()`
- **Stub of the standard library**,
    covering the subset of current builtins that can be implemented in-language without generics
    or other Core Solidity features.
    We would also introduce a mechanism for replacing the library with a custom implementation.

### Interoperability with Core Solidity
Contracts do no need to be written in the same language to be able to interoperate through external calls.
They only need to use the same ABI, which naturally will be the case between Classic and Core Solidity.
However, we are planning to go further than that in terms of interoperability.
We want to make it possible to use both languages side by side in the same project.

The first step towards this will be a common compilation interface for both frontends.
It will make it possible to supply the compiler with source code written in either language as a part of the same set of inputs.
The contracts written in one language will have to be completely independent of ones written in the other, and will produce distinct outputs (bytecode, AST, etc.), but these outputs will be combined by the compiler into a common structure, not separated by language. 

The second step will enable compatibility at function level.
We will make it possible to import and call free functions written in one language from
within the other.
This may also include interface definitions, errors, events and some types.

## Core Solidity

### The new language
Core Solidity is a mostly backwards-compatible upgrade to the Solidity type system.
It takes ideas from pure functional languages like [Lean](https://lean-lang.org) and [Haskell](https://www.haskell.org), as well as modern systems languages like [Rust](https://rust-lang.org) and [Zig](https://ziglang.org), and adapts them to the EVM context based on our learnings from Classic Solidity.

The transition will represent a step change in power and expressivity for Solidity.
Most high-level language features known from Classic Solidity will be definable as standard library constructs and desugaring passes into a minimalistic inner language called SAIL (Solidity Abstract Intermediate Language).
SAIL itself is deliberately meant to be as lean as we can possibly make it while still supporting the core features:
- Generics / parametric polymorphism
- Traits (a.k.a. typeclasses)
- [Hindley-Milner type inference](https://en.wikipedia.org/wiki/Hindley–Milner_type_system) (known from languages such as Rust or [OCaml](https://ocaml.org))
- First-class and anonymous (a.k.a. lambda) functions 
- Algebraic data types
- Pattern matching with exhaustiveness checking

This is an approach to language design and compiler construction often used in other high assurance domains (e.g. theorem provers), and supports our goals around correctness / formal specification and long-term community stewardship of the language.

### Standard library
One of our overarching goals is to have a very simple and flexible language core with most of the
current feature set defined in-language, as its standard library.
Today, extending the compiler is difficult, and as a result, it does not benefit from the wealth
of practical experience of application developers who are eager to contribute.
We ultimately want to establish a community-driven [EIP-style process](https://eips.ethereum.org/EIPS/eip-1) for the stewardship of this library, and encourage extensions to be done primarily this way. 

How extensive should the standard library be?
Different languages have different answers to this question and there is no right or wrong one.
Some, like C, take the minimalistic route with only basic utilities being provided with the compiler.
Others, like Java or Python are "batteries-included" and provide an extensive set of high-level tools out of the box.

Out of necessity, Solidity will initially go for minimalism, because this is how we plan to lower
the maintenance burden of the compiler.
The library will contain a small set of low-level utilities, basic type definitions and other elements that today exist as fixed parts of the compiler.
Whether it will remain like this indefinitely or grow to be a full-featured collection of common patterns 
accommodating a wide variety of use cases is still an open question and something to be decided through 
the community-driven  process.
Only once such a process is in place will a rich standard library become feasible in the first place.

### Standardization and community process
A big shortcoming of Classic Solidity is the lack of language specification.
Unfortunately, the language in the current form carries too much baggage.
We do not want to enshrine it as the way things should be.
Our general opinion is that it has already reached such a level of complexity that defining formal language semantics
would require absurd amounts of work.
And even with all that work it could still only serve as a stopgap without actually solving the underlying problems.

Instead, Core Solidity is small enough to formalize and is being built from the beginning with such a specification in mind. 
We expect to be able to deliver an executable formal specification of the language that can be used to verify the integrity of the type system itself, as well as application code written in Core.
Such executable semantics should also hopefully be able to function as a reference implementation that can be used for fuzzing new implementations.

We would also like to avoid language fragmentation.
With more and more competing compilers, we think that they would benefit users the most by all
adhering to the same specification while competing on the quality of generated code,
optimization and possibly through alternative implementations of the standard library.
Once the language becomes stable, we are going to establish an open process for developing it further.

## How to get involved

We plan to publish new blog posts as part of this series at a regular cadence and would like to invite the community to be an active participant in helping us shape the future of Solidity.

Keep your eyes peeled for the forum post to provide feedback on the language roadmap.
