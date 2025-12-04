---
layout: post
published: true
title: 'Solidity Summit 2025 Recap'
date: '2025-12-04'
author: Solidity Team
category: Announcements
---

The fourth edition of the Solidity Summit took place in Buenos Aires during Devconnect, gathering around 350 participants from across the ecosystem. The event brought together language designers and compiler engineers - but also tooling authors, security experts, educators, and long-time Solidity power users. Attendees had the chance to get up to speed with the latest language proposals and new features, hear updates from the ecosystem, and learn from teams building on Solidity at scale.

A central message from the Solidity team this year was the importance of the ongoing compiler backend overhaul - practical work delivering immediate performance gains like faster compilation times and representing the team's current priority. In parallel, Core Solidity represents the team's research effort aimed at ensuring the language's future relevance, though its impact will materialize over a longer timeline. Alongside this, speakers showcased work from across the broader tooling, auditing, and developer ecosystem.

The full agenda of the day can be found [on the Solidity Summit page](https://www.soliditylang.org/summit/) and you can watch all talks by browsing through the individual videos on the [YouTube playlist](add link).

## Recordings and Slides

Sorted by topic, here are all talks with links to the recordings and slides.

### Introductory Remarks

* Welcome Note - Vishwa Mehta (Solidity | Argot Collective)
    * [Recording](https://youtu.be/DBla5ZFAIm8)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Welcome_Note-Vishwa_Mehta.pdf)

* From EF to Argot: Solidity’s New Home - Lea Schmitt (Argot Collective)
    * [Recording](https://youtu.be/xeG0u2XSYdo)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/From_EF_to_Argot_Solidity_s_New_Home-Lea_Schmitt.pdf)

### Classic & Core Solidity: One Interconnected Roadmap

A major message throughout the Summit was the clarification that Classic Solidity and Core Solidity are not separate languages, but two connected stages of a single, long-term roadmap: 

* Classic Solidity remains the production language used today, and it continues to gain performance and stability improvements, thanks to the backend overhaul.
* Core Solidity represents the future: a redesigned type system, generics, algebraic data types, first-class functions, and executable formal semantics.

Importantly, while the transition will be gradual with Classic and Core contracts coexisting in the same project through cross-language imports and side-by-side compilation, users should expect breaking changes in Core Solidity. The removal of inheritance and other legacy features represents a necessary evolution to strengthen the language, though the interoperability mechanisms being developed will help mitigate migration challenges. As emphasized during the Summit, Core Solidity depends on the backend foundations being built now, meaning every improvement supports both tracks. This perspective is laid out in detail in [The Road to Core Solidity](https://www.soliditylang.org/blog/2025/10/21/the-road-to-core-solidity/).

* From Classic to Core Solidity - Kamil Sliwak (Solidity | Argot Collective)
    * [Recording](https://youtu.be/pk7SjOP2W9Y)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/From_Classic_to_Core_Solidity-Kamil_Sliwak.pdf)

* Introducing Core Solidity - Rodrigo Ribeiro (Solidity | Argot Collective)
    * [Recording](https://youtu.be/KKvkXFv-GXM)
    * [Slides ](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Introducing_Core_Solidity-Rodrigo_Ribeiro.pdf)

### A Strong Focus on the Compiler Backend

Across multiple sessions, the Solidity team emphasized that backend modernization is the primary focus of current development. The shift from the legacy evmasm pipeline to the new Yul → SSA-CFG → EVM architecture aims to resolve real issues developers face today, while enabling more advanced optimizations in the future.

This work is not abstract or purely long-term. It directly improves the experience for Classic Solidity users now, especially in areas like:
* eliminating common stack-too-deep cases,
* preventing non-determinism in optimized output,
* enabling better analysis and formal reasoning at IR level,
* and preparing Classic and Core to share a unified compilation interface.

Talks covering this topic: 
* SSA-CFG Yul: A new viaIR backend - Moritz Hoffman (Solidity | Argot Collective)
    * [Recording](https://youtu.be/m_pJSVERb-U)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/SSA-CFG_Yul-A_new_viaIR_backend-Moritz_Hoffman.pdf)

* How to solve stack-too-deep errors: a Yul to EVM pipeline - Alejandro Cerezo (Project GreY | Complutense University of Madrid)
    * [Recording](https://youtu.be/sn8eP9ZfC_E)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/How_to_solve_stack-too-deep_errors_a_Yul_to_EVM_pipeline-Alejandro_Cerezo.pdf)

* Formally Verifying YUL-Level Static Analyses and Optimization with Coq - Samir Genaim (Complutense University of Madrid)
    * [Recording](https://youtu.be/KRyeCX_fCjE)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Formally_Verifying_YUL-Level_Static_Analyses_and_Optimization_with_Coq-Samir_Genaim.pdf)

### Advanced Solidity Concepts & Compiler Research
This category highlighted forward-looking ecosystem talks: experimental toolchains, alternative implementations, and advanced ideas from teams pushing Solidity to its limits. These explorations complement the Solidity team’s backend work by showing what becomes possible when the community pushes the language’s boundaries.

* All the things I wish (native) Solidity would let me do - Hadrien Croubois (OpenZeppelin)
    * [Recording](https://youtu.be/lUGlK7sTk50)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/All_the_things_I_wish-native_Solidity_would_let_me_do-Hadrien_Croubois.pdf)
* The Death of the __gap: Custom Storage Layouts - Eric Marti Haynes (Nethermind)
    * [Recording](https://youtu.be/WsvrmI0G7O4)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/The_Death_of_the_gap_Custom_Storage_Layouts-Eric_Marti_Haynes.pdf)
* Solar Invictus - DaniPopes (Foundry | Solar)
    * [Recording](https://youtu.be/N1JZBwODZL4)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Solar_Invictus-DaniPopes.pdf)
   
* solx: an LLVM-based Solidity toolchain - Oleksandr Zarudnyi (solx | Nomic Foundation)
    * [Recording](https://youtu.be/RGZNEVuMKmE)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/solx_an_LLVM-based_Solidity_toolchain-Oleksandr_Zarudnyi.pdf)

### Tooling and Security

Beyond compiler and language design, the Summit included sessions on debugging standards, verification tooling, security workflows, and ecosystem development. Together, they underscored how the broader ecosystem continues to grow alongside the language itself.

* ethdebug format overview (2025) - gnidan (ethdebug | Argot Collective)
    * [Recording](https://youtu.be/KKvkXFv-GXM)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/ethdebug_format_overview-2025-gnidan.pdf)

* soldb - CLI tool for debugging Solidity and EVM rollups - Roman Mazur (Walnut)
    * [Recording](https://youtu.be/D05GMYr9yBE)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/soldb-CLI_tool_for_debugging_Solidity_and_EVM_rollups-Roman_Mazur.pdf)

* The State of Source-Code Verification: Closed, Painful, and Ready for Change - Kaan Uzdogan (Sourcify | Argot Collective)
    * [Recording](https://youtu.be/4DLWcGtzh8A)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/The_State_of_Source-Code_Verification_Closed_Painful_and_Ready_for_Change-Kaan_Uzdogan.pdf)

* Verifying LLM-powered Code Transformations with Equivalence Checking - John Toman (Certora)
    * [Recording](https://youtu.be/41rc9u98Asw)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Verifying_LLM-powered_Code_Transformations_with_Equivalence_Checking-John_Toman.pdf)

* So, you think you can write an EVM decompiler? - Yannis Smaragdakis (Dedaub)
    * [Recording](https://youtu.be/bdF_jmOjA9M)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/So_you_think_you_can_write_an_EVM_decompiler-Yannis_Smaragdakis.pdf)

* Preventing Hacks with Security Rules Written in Solidity - odysseas (Phylax Systems)
    * [Recording](https://youtu.be/fgVSp2Hwi18)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Preventing_Hacks_with_Security_Rules_Written_in_Solidity-odysseas.pdf)

* How Type-Driven Development Can Turbocharge your Contract's Security - philogy (Spearbit)
    * [Recording](https://youtu.be/_lZu1c7tZ-0)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/How_Type-Driven_Development_Can_Turbocharge_your_Contract_s_Security-philogy.pdf)

* Hardhat 3 is here: what's new and why you should use it - John Kane (Nomic Foundation)
    * [Recording](https://youtu.be/nFryV0sI0EM)
    * [Slides](https://github.com/argotorg/solidity-website/blob/main/public/summit/2025/slides/Hardhat_3-John_Kane.pdf)

A huge thanks to everyone who presented, participated, and contributed to making this Summit memorable. We look forward to seeing you at the next one!
