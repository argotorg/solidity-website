import { Box, Text } from '@chakra-ui/react'
import { Hero, Link, UseCaseCard, PageMetadata, Section } from '@/components'
import { DOCS_URL, MAIN_CONTENT_ID, USE_CASES } from '@/constants'

export default function UseCases() {
  return (
    <>
      <PageMetadata
        title="Use cases"
        description="Learn how Solidity can be used to solve real world problems."
      />
      <Box as="main" id={MAIN_CONTENT_ID}>
        <Hero
          header="Use cases"
          cta={[{ name: 'Get started', href: DOCS_URL }]}
        >
          With Solidity, you can create contracts for uses such as voting, crowdfunding,
          blind auctions, and multi-signature wallets and much more! Below we list some of
          the most popular use cases.
        </Hero>
        <Section
          direction="column"
          maxW="container.lg"
          mx="auto"
          gap={24}
          py={20}
        >
          {USE_CASES.map((useCase, index) => (
            <UseCaseCard useCase={useCase} key={useCase.title} index={index} />
          ))}
        </Section>
        <Section gap={4} mb={12} maxW="container.lg" mx="auto">
          <Text textStyle="h3" color="text">
            ... and much more
          </Text>
          <Text>
          If you want to get started building your own applications, head to the 
          {' '}
                <Link href="https://docs.soliditylang.org/en/latest/solidity-by-example.html">Solidity by Example</Link>{' '}
          section to see code examples of different contracts and understand the core concepts of the language.
          </Text>
        </Section>
      </Box>
    </>
  )
}
