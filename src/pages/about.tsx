import { Box, Flex, FlexProps, Text } from '@chakra-ui/react'
import { Hero, Link, PageMetadata, Section } from '@/components'
import {
  CONTRIBUTE_PATH,
  DOCS_URL,
  FORUM_URL,
  MAIN_CONTENT_ID,
} from '@/constants'

interface FaqItemProps extends FlexProps {
  question: string
}
const FaqItem: React.FC<FaqItemProps> = ({
  question,
  children,
  ...flexProps
}) => (
  <Flex direction={{ base: 'column', md: 'row' }} py={6} gap={6} {...flexProps}>
    <Text flex={1} textStyle="h6-mono" color="text">
      {question}
    </Text>
    <Text flex={2}>{children}</Text>
  </Flex>
)
export default function About() {
  return (
    <>
      <PageMetadata
        title="About"
        description="Solidity is a statically-typed curly-braces programming language designed for developing smart contracts that run on Ethereum."
      />
      <Box as="main" id={MAIN_CONTENT_ID}>
        <Hero
          header="About"
          cta={[
            { name: 'Get started', href: DOCS_URL },
            { name: 'Contribute', href: CONTRIBUTE_PATH },
          ]}
        >
          Solidity is a statically-typed curly-braces programming language designed for developing
          smart contracts that run on the Ethereum Virtual Machine.
        </Hero>
        <Section
          as="article"
          direction="column"
          gap={4}
          maxW="container.md"
          py={24}
          mx="auto"
          bgImg="url(/assets/about-bg.svg)"
          bgRepeat="no-repeat"
          bgPosition="top center"
        >
          <Text>
            <b>Solidity</b> is a powerful programming language designed
            specifically for writing smart contracts on the Ethereum blockchain.
            With Solidity, developers can define the rules and behavior of{' '}
            <b>decentralized applications (DApps)</b>.
          </Text>
          <Text>
           Smart contracts are programs that are executed inside a peer-to-peer network
           where nobody has special authority over the execution, and thus they
           allow to implement tokens of value, ownership, voting and other kinds of logics.
          </Text>
          <Text>
            Note that when deploying contracts, you should use the latest released version
            of Solidity. This is because breaking changes as well as new features and
            bug fixes are introduced regularly.
          </Text>
          <Text>
            Solidity was publicly previewed for the first time in November 2014
            at {' '}
                <Link href="https://www.youtube.com/watch?v=DIqGDNPO5YM&feature=emb_title">Devcon0</Link>.
            Versioning for Solidity was {' '}
                <Link href="https://github.com/ethereum/solidity/commits/15dc5954c3a2e2a9ce96f2f77d41adef98a4cced">committed</Link>.
            into the codebase on July 9, 2015, marking Solidity Version 0.0.1. However, v0.1.0
            wasn&apos;t an actual release yet, and builds of it are not available anymore.
            You can read more about Solidity&apos;s history in the 5 year celebration post from 2020 {' '} 
                <Link href="https://soliditylang.org/blog/2020/07/08/solidity-turns-5/">here</Link>.
          </Text>
          <Text>
            The Solidity programming language is an <b>open-source</b>,
            community project governed by a core team. The project started within the Ethereum Foundation and now,
            is part of the <Link href="https://argot.org/">Argot Collective</Link>.
          </Text>
        </Section>
      </Box>
    </>
  )
}
