---
layout: post
published: true
title: 'Solidity Developer Survey 2023 Results'
date: '2024-04-03'
author: Vishwa Mehta
category: Announcements
---

EDIT REMARK: We noticed a minor error in the graphical representation of [1] popular Ethereum-specific IDEs and [2] Sourcify usage. The results in this blog post and corresponding graphical data in the slide deck has been updated to reflect this rectification that represents the survey data accurately.

We are thrilled to share with you the [Solidity Developer Survey 2023](https://blog.soliditylang.org/2023/12/08/solidity-developer-survey-2023-announcement/) results! In this blog post, we will be going over key insights and detailed analysis of the various sections of the survey.

Before we dive in, we would like to thank everyone who submitted a response to the survey as well as helped us reach the right audience for it! Your inputs are invaluable to us and are pivotal in driving important language design decisions and improving Solidity as an open source project.

This year, we received a total of 474 responses. Let's start with some useful links:

- In the spirit of open source, you can find all raw data of the survey results [here](https://docs.google.com/spreadsheets/d/1W0kadnT0uQoIuuYZQdj9-vFH0DSr2GJ0mFoL4qTqSUg/edit?usp=sharing) and all graphs [here](https://docs.google.com/presentation/d/17TeWEvaVGgSHYYxIoLiTjLSf0QvbmOr3n3GJuHnSdHs/edit?usp=sharing).
- This is our fourth annual survey. You can compare the 2023 results with the previous years by checking our the blog posts below:
    - [2022](https://soliditylang.org/blog/2023/03/10/solidity-developer-survey-2022-results/)
    - [2021](https://blog.soliditylang.org/2022/02/07/solidity-developer-survey-2021-results/)
    - [2020](https://blog.soliditylang.org/2021/01/26/solidity-developer-survey-2020-results/)

Without further ado, let’s dig into the 2023 results!

## Summary & Notable Insights

The survey consists of 6 sections, namely: **[1]** Demographics, **[2]** Dev & User Profiles, **[3]** Solidity Background, **[4]** Solidity Developer Experience, **[5]** Language Design, and **[6]** Solidity Developer Community.

Let's look at some key insights from and the summary of these various sections from the 2023 survey.

- **Demographics**: In total, 474 developers from 71 different countries participated in the 2023 survey. The highest number of respondents hail from the **USA (18.8%)**, followed by **India (10.5%)**, and **Nigeria (6.2%)**. This remains consistent with last year's insights except for Nigeria replacing France as the 3rd country where the highest respondents live.
This year, we saw new native African languages such as  Kinyarwanda, Kiswahili, Runyankole, and Luganda.
- **Dev & User Profiles**: Solidity continues to be the most used language by the respondents, followed by JavaScript and TypeScript.
A majority of Solidity experts (self-rating of 10) have been using the language for 2+ years, some even more than 5 years. 
- **Solidity Background**: 36.7% users stated that it took them less than 6 months to feel productive with Solidity. It is interesting to note that among these users, majority of the respondents use Solidity daily or weekly and most of those who don't feel productive with Solidity have been using the language for less than 3 months.
- **Solidity Developer Experience**: Generally a majority of the participants feel that the Solidity developer experience has improved in the last year.
33.8% users indicated that mappings is their favourite feature followed by contracts as objects (23.2%) and modifiers (16.1%).
- **Language Design**: Generics (23.2%), require with custom error types (17.4%), and transient storage (13%) were found to be the most anticipated features this year.
28.6% participants know what Ethereum Object Format (EOF)  is among whom 63.5% are confident that it will positively impact them.
- **Solidity Developer Community**: GitHub Releases rises in ranking among the list of sources used for staying up-to-date with Solidity announcements.

![header 1](/img/2024/survey/header1.png)

## Demographics

_⚠️ Be aware that this survey has only been shared in English when interpreting results regarding the distribution of countries of residency and language preferences._

Let's begin by analysing the first section of the survey which covers information about the residency and native languages/language preferences of the respondents.

In total, 474 developers from 71 different countries participated in the 2023 survey. 

The coverage of different geographies increased from 73 countries in 2021 to 100 countries in 2022 and back to 71 in 2023. It is interesting to note a massive spike in responses in the year 2022.

### Residency

From the 2023 survey, 18.8% of respondents mentioned that they live in the USA, followed by India (10.5%), Nigeria (6.2%), and Germany (5.3%).

This is quite consistent with the previous year with the exception of Nigeria and Germany ranking higher than France with more number of responses.

![Participants World Map](/img/2024/survey/Slide1.png)

![List of Countries with 9+ responses](/img/2024/survey/Slide4.png)

### Language

In the 2023 survey, a total of 60 languages were submitted as the native languages of the respondents.

32.6% of the total participants speak English as their native language, 13.1% speak Indian languages, 7.5% speak Spanish, 6.7% speak French, 5.2% speak Chinese languages, 4.9% speak German, 4.3% speak Russian, and 1.3% speak African languages.

_ℹ️ **Note:** Bengali, Gujarati, Hindi, Marathi, Nepali, Odia, Punjabi, Tamil, Telugu, and Urdu were clustered as “Indian languages”. Cantonese, Chinese, and Mandarin were clustered as “Chinese languages”. Igbo, Kinyarwanda, Kiswahili, Runyankole, Luganda, Swahili, and Yoruba were clustered as African languages._

It is interesting to note new African languages such as  Kinyarwanda, Kiswahili, Runyankole, and Luganda have entered the survey results this year.

![Participants Native Languages](/img/2024/survey/Slide5.png)

![Participants Native Languages](/img/2024/survey/Slide6.png)

More than half of the of respondents (54.2%) predominantly speak their native language at work, whereas 45.8% still speak another language at work.

A total of 75.4% respondents reported that they predominantly speak English at work, followed by Chinese Languages, Indian Languages, Spanish, and French distributed almost equally.

![Participants Work Language](/img/2024/survey/Slide7.png)

A total of 84.8% participants stated that they are okay with reading the Solidity documentation in English.

However, 15.2% participants prefer to read the documentation in their native language. The number of respondents who would prefer it in their native language is slightly higher this year than the previous year (12.9%).

![Preferred Language for Docs](/img/2024/survey/Slide8.png)

![Preferred Language for Docs Breakdown](/img/2024/survey/Slide9.png)

_ℹ️ Note: This survey has only been conducted in English, which may have impacted the outcome of this question. We still believe internationalization of resources like the Solidity documentation is a crucial factor in lowering the barrier of entry, and we aim to support this by helping coordinate the community-driven [translation efforts](https://github.com/solidity-docs)._

![header 2](/img/2024/survey/header2.png)

## Dev & User Profile

In the second section of the Solidity Developer Survey, we gather insights about the professional background of our devs/users and learn about their preferences about coding languages, open source contributions, OS, & more.

### Employment & Work Experience

65.2% of respondents were employed at the time of the survey, while 13.4% stated that they were students. 21.4% reported that they were currently not employed.

Compared to the previous survey, there is a slight increase in both the number of students and currently unemployed developers or users.

![Employment Status](/img/2024/survey/Slide12.png)

69.6% of the total participants who were employed at the time work in the “crypto”, whereas 14.7% work in technology in general and 4.5% work in financial services.

This trend is quite comparable to the results from the previous year with just a slight change in the individual precentages.

![Industry Sector Breakdown](/img/2024/survey/Slide13.png)

Roughly 36% of all respondents are considered seniors in their field and have been coding professionally for 6+ years, out of which 9.7% have even been coding for 15+ years.

On the contrary, roughly 6.1% have never coded as part of their job and 9% have only coded professionally for less than a year.

As a majority, 28.3% of repondents are mid-level programmers with 3-5 years of experience.

Overall, the level of professional coding experience is medium to high with the majority of respondents (64.5%) having coded professionally for 3+ years.

![Professional Coding Experience](/img/2024/survey/Slide14.png)

### Developer Profiles

When asked which developer profile best describes the participants, the majority identified as a smart contract developer.

Rouhgly 5.3% are  tooling developers, followed by 4.4% auditor / security experts, and only 1.3% stated that they are academic researchers.

![Dev Profiles](/img/2024/survey/Slide15.png)

A majority of 48.9% of the participants use Solidity both at work and for personal projects. The rest of the respondents are almost equally distributed between using Solidity at work or using Solidity for personal projects.

![Solidity usage](/img/2024/survey/Slide16.png)

A cummulative of 32% users contribute to open source projects on a regular basis (daily and weekly), whereas 27.1% only contribute on a monthly basis. Almost 41% users reported that they never contribute to open source projects written in Solidity.

The number of users who never contribute has reduced this year with an increase in the number of daily or weekly contributors.

![Open Source Contributions](/img/2024/survey/Slide17.png)

### Programming Language Preferences

Yet again this year, Solidity ranks as the most used programming language among the participants (42.9%), followed by TypeScript (16.7%), and JavaScript (15.4%).

We observed a big hike in survey participants who use Solidity the most going from 28.9% last year to 42.9% this year. JavaScript and TypeScript seem to have swapped places this year.

Other less frequently mentioned languages are Python (9.5%), Rust (3.5%), and C# (2.4%), and C++ (2.2%).

![Most Used Programming Language](/img/2024/survey/Slide18.png)

When asked about the favourite language of the participants, Solidity ranks the highest with 29.1% of the votes, followed by Python (15.6%), JavaScript (12.4%), TypeScript (12%), and Rust (10%).

Other lesser mentioned languages in this list were Go (4.1%), C++ (3.4%), Java (3%), C# (2.8%), and C (1.5%).

![Favorite Programming Language](/img/2024/survey/Slide19.png)

### Preferred Operating System

Majority of the participants use MacOS as their primary Operating System (40.5%). Linux and Windows are equally popular, with 29.9 and 29.7% respectively.

![Operating System](/img/2024/survey/Slide20.png)

![header 3](/img/2024/survey/header3.png)

## Solidity Background

In the next section of the survey, we collected information regarding Solidity-specific development experience and usage habits of the participants.

### Solidity Expertise

Almost 60% of all respondents deem themselves Solidity experts, with a self rating in expertise of 7 or higher (scale of 10) out of which participants with self-rating 8 are the highest in number.

23.4% rated themselves as an expert (self-rating 10) and roughly 84% of those have been using Solidity for 2+ years.

Roughly 20% of all who responded are beginners with a self-rating of 4 or less.

![Solidity Expertise](/img/2024/survey/Slide22.png)

We asked the participants about how long have they been using Solidity for. Almost 30% of all respondents have been using Solidity for less than a year, with 10% with less than three months of experience using Solidity.

The highest number of respondents (24.5%) are users who have 2-3 years of experience in Solidity.

About 24% of users can be considered seniors in the ecosystem since they stated that they have been using Solidity for 3+ years.

![Solidity Experience Level](/img/2024/survey/Slide23.png)

When asked how long it took the respondents to start feeling productive with Solidity, the majority of them (36.7%) reported that it took them less than 6 months.

17.8% even said that it only took them less than a month.

12.7% needed more than a year to feel comfortable with the language. This number is slightly higher than the last year.

17.4% don't feel productive yet, out of which 76.7% are beginners and have been using Solidity for 6 months or less, and 45% even less than three months.

![Time to Productiveness](/img/2024/survey/Slide24.png)

### Solidity User Profile & Usage Habits

A majority of 46.5% users use Solidity on a daily basis, followed by 33.2% who use it weekly and only 11.9% who use it on a monthly basis.

As low as 1.9% said that they never use Solidity. 6.5% users reported that they use it rarely.

![Solidity Usage Frequency](/img/2024/survey/Slide25.png)

This year, we also wnated to learn how the survey audience gets the Solidity binaries. The most mentioned sources were:

- via a framework / IDE (38.8%)
- using npm (18.6%)
- GitHub Releases (9.6%)
- Build from source (9.3%)
- solc-bin (6.8%)
- Homebrew (6.1%)

Other lesser prominent sources were Ethereum PPA for Ubuntu, Package Manager for Linux Distros, and Dockerhub.

![Sources for Solidity Binaries](/img/2024/survey/Slide26.png)

77.2% of all respondents use Visual Studio Code as their editor when writing Solidity code. However, this number is still lower than last year.

Vim and IntelliJ follow in the second and third ranks with 4.7 and 3.7% usage, respectively. The overall trend in usage of prominent editors continues to remain comparable.

![Editor Overview](/img/2024/survey/Slide27.png)

Depending on the chosen editor, we also asked respondents which Solidity-related plugins they use, if any.

Just like last year, the “Solidity” extension by Juan Blanco and “HardHat VSCode” by Nomic Foundation were once again found to be the most popular among Solidity developers.

![Editor Plugins Overview](/img/2024/survey/Slide28.png)

We wanted to know which Ethereum specific development environment our survey participants use.

With 33.3%, Hardhat remains the most popular Ethereum-specific development environment.

However, this percentage is significantly lower than in 2022 results, when roughly 75% of all respondents were using Hardhat.

Not too far behind, Foundry ranks second with 32% and Remix follows closely with 25.8%. After rising in popularity from 1.6% in 2021 to 30% in 2022, Foundry seems to have been comparable in usage since last year.

Truffle moves further into the "OTHER" list with only 3 respondents indicating its usage.

While Dapp rises slightly higher in usage with 3.1% users, Brownie (1.6%), Truffle (0.3%), Ape (0.3%), and Embark (0.3%) seem to be the less popular choices this year ranking even lower in usage than the previous year.

With 0.5% of votes, Wake made it into the graph this year as a new choice of IDE.

As low as 2% of respondents do not use any Ethereum-specific development environment at all.

![Ethereum IDE Overview](/img/2024/survey/Slide29.png)

Similar in trend as last year, the 0.8.x Solidity versions remain to be most used versions with a majority of 397 out of 485 total votes (81.8%).

Please note that this is a multiple response type question allowing for participants to choose more than one version series.

The usage share of both the 0.7.x (4.7%) and the 0.6.x (5.5%) series continues to decrease consistently since the previous survey. The rest of the older versions are rarely in use.

![Used Solidity Versions](/img/2024/survey/Slide30.png)

_⚠️ **Important Reminder:** Please make sure to frequently update your code (and compiler) to the latest Solidity version. [Several important bug fixes and security improvements](https://github.com/ethereum/solidity/blob/develop/docs/bugs_by_version.json) are added in the newer versions!_

### Solidity Usage Details

Just like last year, we also asked our users specific questions about Solidity usage trends.

#### CLI

59.9% of respondents do not use the Solidity compiler directly via the command line, whereas 40.1% do. This trend is consistent with last year.

![Using the compiler directly](/img/2024/survey/Slide31.png)

When using the compiler on the command line, 58.9% still use Standard JSON.

![Standard JSON vs CLI](/img/2024/survey/Slide32.png)

When asked how disruptive changes in CLI options and outputs would be for respondents, 64.1% responded with "okay" and 26.5% with "Not disruptive at all". Only 9.4% deem these changes as disruptive.

![Disruptiveness of CLI changes](/img/2024/survey/Slide33.png)

#### Old EVM versions

While 28.8% of the overall respondents still rely on old EVM versions, a majority of 71.2% do not need compiler support for older EVM versions anymore.

![Support for older EVM versions](/img/2024/survey/Slide34.png)

Among those who rely on older version, 11.1% still rely on deprecated EVM versions.

![EVM version usage breakdown](/img/2024/survey/Slide35.png)

#### Unoptimised code

20.8% said that they never use unoptimised code. On the other hand, 27.9% use unoptimised code only because of their framework's default settings, whereas 48.8% users do so for the purpose of debugging, unit testing, or deploying on chain.

![Usage of unoptimised code](/img/2024/survey/Slide36.png)

#### ABIEncoderV1

While 63.9% do not use ABIEncoderV1, only 6.5% know about it and use it. 29.6% do not know about it at all.

![Usage of ABIEncoderV1](/img/2024/survey/Slide37.png)

#### SMTChecker

74.5% of all respondents have never used the SMTChecker. 20.1% have tried it and 5.4% use it frequently. You can learn more about the SMTChecker [here](https://docs.soliditylang.org/en/latest/smtchecker.html). The percentage of users who have tried it has increased significantly this year.

![Usage of SMTChecker](/img/2024/survey/Slide38.png)

#### The `via-IR` compilation pipeline

51.9% do not know what `via-IR` is. This number has significantly reduced from last year. 25.9% use the `via-IR` pipeline already. In the following weeks, we intend to write a blog post about what `via-IR` is and why you should switch from the legacy compilation pipeline to `via-IR`.

![Usage of via-zIR](/img/2024/survey/Slide39.png)

When asked about the time taken to compile the contract's code using via-IR pipepline, the majority of the respondents indicated that it takes anywhere between 1 to 10 minutes.

Some users also reported that it can also take anywhere from 15 minutes to upto 60 minutes.

Some outliers in the responses also indicated as long as `300` and `200000` minutes. However, we do not consider these responses to be accurate and hence, the chart does not account for those responses.

![Compilation times using via-IR](/img/2024/survey/Slide40.png)

When asked what users are most concerned about regarding the use of `via-IR`, 27.4% said compilation times, 21.4% said not enough knowledge, 17.9% said stability/security concerns, and 13.5% said lack of tooling.

![via-IR concerns](/img/2024/survey/Slide41.png)

#### Metadata publication

55.2% of respondents stated that they publish the metadata of their smart contracts which has slightly increased from last year.

30.3% don’t publish the metadata of their smart contracts while 14.5% don’t know what this means. Both these numbers have significantly improved from last year.

![Metadata publication](/img/2024/survey/Slide42.png)

#### Sourcify

When asked about Sourcify usage, 14.2% of all respondents use Sourcify for smart contract verification (increased from last year), while 30.7% claim to not need it. 55% don’t know what Sourcify is, which has reduced from last year.

![Sourcify](/img/2024/survey/Slide43.png)

A majority of 37.1% users use Sourcify via Hardhat, followed by via Foundry (27.4%), via Sourcify directly (16.1%), and via Remix (14.5%). If you want to learn more about Sourcify, visit [sourcify.dev](https://sourcify.dev/).

![May way of using Sourcify](/img/2024/survey/Slide44.png)

#### `appendCBOR: false` or `bytecodeHash: none`

55% users do not know what `appendCBOR: false` or `bytecodeHash: none` is, whereas 30.8% know but do not need it. Only about 13.7% either use it frequently or sometimes.

![appendCBOR or bytecodeHash](/img/2024/survey/Slide45.png)

#### Flattening contracts

53.9% of total respondents do not flatten their contracts, whereas 22.5% do. 23.6% do not know what that is or how to do it.

Most of the users who flatten their contracts mentioned that they do so for the purpose of verification.

![Flattening of contracts](/img/2024/survey/Slide46.png)

### Other EVM Networks

More than half of all respondents (65.1%) use Solidity outside of [Ethereum Mainnet](https://ethereum.org/en/glossary/#mainnet) and [testnets](https://ethereum.org/en/glossary/#testnet).

When asked which other networks they deploy their smart contracts on, 20.8% responded with Polygon (formerly Matic Network).

Other often mentioned blockchains include Arbitrum (15.6%), Optimism (13.2%),  Binance Smart Chain (10.6%), and Avalanche (8.1%).

![Deployment To Other Chains](/img/2024/survey/Slide47.png)

![Deployment To Other Chains Breakdown](/img/2024/survey/Slide48.png)

### Other Smart Contract Languages

[Yul](https://docs.soliditylang.org/en/latest/yul.html), an intermediate language for Solidity, continues to the be the most used smart contract language other than Solidity with 23.9% respondents; a slight increase compared to last year.

[Vyper](https://docs.vyperlang.org), a pythonic EVM language, ranks as the second most used language other than Solidity with 11.9%.

This trend is similar to last year so far with just a small increase in the percentages.

[Huff](https://docs.huff.sh) (9.3%), [Cairo](https://www.cairo-lang.org/docs/) (5.8%), and [Sway](https://fuellabs.github.io/sway/) (2.1%) make it to the list second year in a row.

[Fe](https://fe-lang.org/docs/) (1.8%) also makes it into the chart again this year. However, Rust was not mentioned often.

![Other Smart Contract Languages](/img/2024/survey/Slide49.png)

![header 4](/img/2024/survey/header4.png)

## Solidity Developer Experience

In this next section of the survey, we will be going through the developer experience of our user community.

When asked about the overall improvement in the Solidity developer experience, 76% of all respondents generally believe that it has improved in the last year with 20.2% even believing it was a big improvement.

As low as 1.6% of the respondents are of the opinion that the developer experience has gotten worse.

![Solidity Developer Experience](/img/2024/survey/Slide51.png)

### Recurring Issues

When asked if the participants encounter recurring issues, 53.3% of the total respondents said that they do not come across the same or similar issues multiple times when developing in Solidity.

Among the 46.7% that encounter recurring issues, Stack too deep issues are encountered most frequently, followed by Bytecode size limit and Debugging issues.

![Recurring issues](/img/2024/survey/Slide52.png)

![Recurring issues](/img/2024/survey/Slide53.png)

_ℹ️ **Note:** On the topic of debugging issues, we would to remind you about the ethdebug standards development working group, an initiative aimed at defining a common debugging data format for languages built on top of the EVM: [ethdebug](https://github.com/ethdebug/format/).

We encourage all developers working on such tools to join the working group. The group has regular bi-weekly meetings and coordinates via the [ethdebug Matrix channel](https://matrix.to/#/#ethdebug:matrix.org)._

### Getting Started with the Compiler

When asked how easy was it to get started with the Solidity compiler, most respondents are of the opinion that it is very easy (44.8%) or “okay” (50.9%).

As less as 4.3% shared that it was difficult for them to get started with the compiler. When asked what made it difficult to get started, some mentioned lack of good docs and examples.

![Getting Started](/img/2024/survey/Slide54.png)

### Most liked Aspects/Features & Pain Points

23.5% of respondents most like Solidity's similarity to other programming languages.

Others like it is easy to learn (17.4%), statically typed (16.3%), simple (15.4%).

Some also consider its syntax (12.7%) and the ease of reading (10.4%) as the most likeable aspects.

![Most liked aspect](/img/2024/survey/Slide55.png)

33.8% of the respondents consider mappings as their most liked feature, followed by contracts as objects (23.2%).

Modifiers (16.1%) and Inline Assembly (12.6%) were often mentioned as well.

Some users reported user defined types (6%), dynamic arrays (3.4%), and `using for` (2.5%) as their most liked features. 

![Most liked feature](/img/2024/survey/Slide56.png)

When we asked the participants about their biggest pain points with Solidity, Stack too deep errors ranked the highest with 42% of all votes, followed by missing memory optimizations (21.6%) and compiler performance (13%).

8.6% of respondents said that redundant checks (e.g. in checked arithmetic) is their biggest issue.

Almost 11% selected “OTHER” and specified some of their most significant pain points, namely: Bytecode and contract size limit and errors.

![Solidity Pain Points](/img/2024/survey/Slide57.png)

### Documentation

When asked if the participants find the official documentation helpful, 68% of the survey respondents reported the Solidity documentation to be helpful, followed by 29.1% who consider it somewhat useful.

As low as 2.9% voted that they do not find the docs useful at all.

Ideas for improvement most prominently ask for more code examples but also a better high-level overview of syntax, better in-docs search, and overall better UI/UX.

![Solidity Documentation Usefulness](/img/2024/survey/Slide58.png)

### High-Impact Compiler Bugs

We were curious to find out whether Solidity developers had been affected by any of the high-impact compiler bugs (codegen bugs that are announced with [Security Alerts](https://blog.soliditylang.org/category/security-alerts/) on the Solidity blog).

While 95.7% said they haven't been affected, 4.3% claimed that they were. 

When asked which one they were affected by, here's what we found out:

(double check if reported bugs are genuine and list accordingly)

![High impact compiler bugs](/img/2024/survey/Slide59.png)

### External Libraries

The majority of the survey respondents (47.8%) do not use external libraries at all.

However, 42.7% reported that they use it and specified use-cases such as contract splitting, proxy patterns, and sharing code.

Only 9.5% users do not know what external libraries are (or what they are being used for).

![External libraries](/img/2024/survey/Slide60.png)

![External libraries: use cases](/img/2024/survey/Slide61.png)

![header 5](/img/2024/survey/header5.png)

## Language Design & Upcoming Features

In the following section of the survey, we will take you through the insights we drew from asking our participants about their thoughts on and involvement in the Solidity language design updates and efforts.

### Most Anticipated Feature(s)

23.2% of total respondents shared that their most anticipated feature is the support for generics, followed by 17.4% reporting that they most look forward to the `Require` with custom error types feature.

_⚠️ Note: Similar to the previous year, we have categorized the use of verious terms like "floats", "floating point arithmetic", "floating point number", "fixed point numbers", and "fixed point math" as "decimal numbers"._

Other most anticipated features in descending order:

- Transient storage (13%)
- Solving stack-too-deep errors (11.6%)
- Better gas optimizations & debugging tools (10.1%)
- Support for decimal numbers & Dynamic Memory Arrays (7.2%)

![Most anticipated features](/img/2024/survey/Slide63.png)

### Restrictiveness

When we asked the survey participants about their thoughts on language restrictiveness, 44.7% of respondents wish that Solidity stays “as is”.

About 35.6% would generally prefer more restrictive/explicit behaviour, while approximately 19.6% would prefer Solidity to be less restrictive.

The overall results of this question are comparable across the previous year and this year.

![Solidity Restrictiveness Ranking](/img/2024/survey/Slide64.png)

### Feedback on New Features/Improvements

We asked the participants about their thoughts on postfix types and functional elements in Solidity.

Here's what we found out about:

1. **Postfix Types:** While 72.5% respondents that formed a majority explicitly said that they either don't like postfix types or don't care, 27.5% said that they like them.

    ![Postfix types](/img/2024/survey/Slide65.png)

2. **Functional Elements:** Almost 60% users said that they like the idea of more functional elements in Solidity such as Lamda functions. 15.4% said they don't like them and 24.7% are indifferent towards it.

    ![Functional Elements](/img/2024/survey/Slide66.png)

### EIP Support

We also wanted to know what Solidity-related EIPs the survey respondents know about or look forward to using and why.

Let's look at some useful insights about:

1. **EIP-1153 “Transient Storage”:** 40.1% respondents know about the Transient Storage EIP, whereas 59.9% do not. 40.4% said that they would need complex types in Transient Storage, such as mappings and arrays, and the rest of the audience was equally divided between not needing complex types and being indifferent/unaware of it.

    ![Transient Storage](/img/2024/survey/Slide67.png)
    
    ![Transient Storage: complex types](/img/2024/survey/Slide68.png)

2. **EIP-3540 “EOF - EVM Object Format”:** It was interesting to see that only 28.6% respondents know about EOF. Among the 28.6%, 63.5% feel positively about it and only 4.8% are of the opinion that it will negatively impact them as developers.

    ![EOF](/img/2024/survey/Slide69.png)
   
    ![EOF impact](/img/2024/survey/Slide70.png)

### Language Design Related Efforts

When asked whether the respondents have or continue to participate in the language design efforts, here's what we found:

- A majority of almost 86% respondents said that they do not participate because they are either too busy, or uninterested/underqualified, or do not know how to participate.
- Roughly 14.2% of respondents said that they regularly participate in language design efforts either by joining the calls, the forum discussions, or by proposing new features or language changes on GitHub.
- 18.5% specifically mentioned that the reason for their lack of participation is either lack of interest or skills require in order to participate in these efforts.

At Solidity, we have and would like to continue to make it easier to our community to participate more actively in these discussions and feel empowered enough to contribute to the language design decisions.

![Language design efforts](/img/2024/survey/Slide71.png)

![header 6](/img/2024/survey/header6.png)

## Solidity Developer Community

### Staying up-to-date

A slightly new trend from the previous years is that this year, most people reported that they like to stay up-to-date about Solidity versions, security alerts, and announcements by following the [Solidity GitHub Releases page](https://github.com/ethereum/solidity/releases), followed by Solidity [Twitter](https://twitter.com/solidity_lang) or [Mastodon](https://fosstodon.org/@solidity).

Another often mentioned means of information is the [Solidity blog](https://blog.soliditylang.org/).

Interestingly, about 21.2% claim to not be doing any of the above.

As part of “other”, respondents specified several community based means to stay up-to-date:

- "Crypto influencers" / Popular Solidity developers
- Discord servers
- Google
- Crypto Twitter / Community chats / Farcaster channels
- Newsletters
- Other blogs such as Moralis and OpenZeppelin
- [Solidity docs](https://docs.soliditylang.org/en/latest/)
- [Solidity website](https://soliditylang.org/)
- Tutorials on YouTube
- Reddit
- ["Week in Ethereum News" Newsletter](https://www.weekinethereumnews.com/)


![Means To Stay Up-To-Date](/img/2024/survey/Slide73.png)

### Interaction with Other Solidity Developers

More than half of respondents (56.8%) interact with other Solidity developers whereas 25.7%  admitted that they rarely interact with other Solidity devs.

A smaller portion of that chart 17.5% does not interact with other Solidity developers at all.

![Developer Interaction](/img/2024/survey/Slide74.png)

Like in the previous years, as the last part of the survey, we wanted to hear how many participants agree or disagree with certain statements regarding the Solidity community and the work of the Solidity team.

**Statement 1:** I feel welcome in the Solidity developer community.

46.8% of respondents feel welcome in the Solidity developer community and 26.1% somehwat agree with the statement. Almost 5% still feel unwelcome.

**Statement 2:** I am confident with the work of the Solidity core team.

A majority of roughly 80% agree or somewhat agree that they feel confident in the work of the Solidity team. A small portion of the survey audience (6.4%) does not agree with this statement.

**Statement 3:** The Solidity team understands my needs as a developer.

About 68% either agree or somewhat agree with the above statement. 23.2% do not know how they feel about this, whereas about 8.8% of the audience generally disagrees.

**Statement 4:** The options for how to contribute ideas or feedback to Solidity are clear to me.

A majority of 47% of the survey audience agrees that the options for how to contribute ideas or feedback to the team are clear to them. However, almost as high as 26% still aren't clear about how to contribute ideas or feedback. It can be derived from this that communication around this needs to be bolstered.

**Statement 5:** I am receiving adequate feedback from the Solidity team on issues raised on Github and/or forum posts.

50% of the audience does not know how to feel about this statement.

However, about 40% respondents are generally satisfied with the feedback and inputs they get from the Solidity team regarding their contributions. Whereas 10% disagree or strongly disagree to this.

The results of this “community and Solidity team confidence ranking” are consistent with the results from the previous year.

![Community and Solidity Team Confidence Ranking](/img/2024/survey/Slide75.png)

## Thank You!

Lastly, we want to take the opportunity to thank you for all your survey responses and feedback. We aim to continue this tradition annualy!

We hope that the insights from this survey continue to be valuable to the Solidity ecosystem and community as they are to us!

To stay up-to-date with all Solidity related announcements and updates, make sure to:

- Follow Solidity on [Twitter](https://twitter.com/solidity_lang) or [Mastodon](https://fosstodon.org/@solidity).
- Join the language design discussions in the [Solidity forum](https://forum.soliditylang.org/) or provide us feedback there.
- Follow announcements and security alerts on the [Solidity blog](https://blog.soliditylang.org/).
- Follow and ⭐ the [Solidity repo on Github](https://github.com/ethereum/solidity).

---

_All graphs can be found [here](https://docs.google.com/presentation/d/17TeWEvaVGgSHYYxIoLiTjLSf0QvbmOr3n3GJuHnSdHs/edit?usp=sharing). The raw and analyzed data can be found [here](https://docs.google.com/spreadsheets/d/1W0kadnT0uQoIuuYZQdj9-vFH0DSr2GJ0mFoL4qTqSUg/edit?usp=sharing)._
