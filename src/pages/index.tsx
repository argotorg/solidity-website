import fs from 'fs'
import { Box, Code, Flex, Text, useBreakpointValue } from '@chakra-ui/react'
import type { GetStaticProps } from 'next'
import {
  BlogSectionPreview,
  ButtonLink,
  CompilerPlayground,
  ContributingCards,
  EventPreview,
  Hero,
  Link,
  PageMetadata,
  PragmaWatermark,
  Section,
  ShowcaseContent,
  ShowcaseSection,
  ShowcaseVisual,
  Triangles,
} from '@/components'
import {
  BLOG_PATH,
  BLOG_POSTS_DIR,
  CONTRIBUTE_PATH,
  DOCS_URL,
  MAIN_CONTENT_ID,
  MAX_POSTS_TO_PREVIEW,
} from '@/constants'
import {
  fetchLatestVersion,
  fetchStargazersCount,
  getAllEvents,
  getPostsDataForRange,
} from '@/utils'
import type { BlogPostProps, EventPost } from '@/interfaces'

export const getStaticProps: GetStaticProps = async () => {
  // get list of all files from our posts directory
  const postFiles = fs.readdirSync(BLOG_POSTS_DIR)
  const sortedPostFiles = postFiles.sort().reverse()
  const previewBlogPosts = getPostsDataForRange(
    sortedPostFiles,
    { from: 0, to: MAX_POSTS_TO_PREVIEW },
    fs
  )
  const allEvents = getAllEvents(fs)
  const { versionNumber } = await fetchLatestVersion()
  const { stargazersCount } = await fetchStargazersCount()
  return {
    props: { previewBlogPosts, allEvents, versionNumber, stargazersCount },
  }
}

interface HomeProps {
  previewBlogPosts: BlogPostProps[]
  allEvents: EventPost[]
  versionNumber: string
  stargazersCount: number
}
export default function Home({
  previewBlogPosts,
  allEvents,
  versionNumber,
  stargazersCount,
}: HomeProps) {
  const futureEvents = allEvents.filter(
    ({ frontmatter: { endDate } }) => new Date(endDate) >= new Date()
  )
  const nextEvent = futureEvents.length ? futureEvents[0] : null
  const sectionPaddingY = useBreakpointValue({ base: 12, md: 24 })

  return (
    <>
      <PageMetadata
        title="Home"
        description="Solidity is a statically-typed curly-braces programming language designed for developing smart contracts that run on Ethereum."
      />
      <Box as="main" id={MAIN_CONTENT_ID}>
        {/* HERO */}
        <Hero
          header="Solidity"
          cta={[{ name: 'Read the docs', href: DOCS_URL }]}
          stargazersCount={stargazersCount}
        >
          A statically-typed curly-braces programming language designed for
          developing smart contracts that run on{' '}
          <Link href="https://ethereum.org">Ethereum</Link>.
          <PragmaWatermark />
        </Hero>

        {/* SOLIDITY VERSION */}
        <Section pt={16} pb={24} alignItems="center">
          <Flex
            as="aside"
            direction={['column', null, 'row']}
            gap={8}
            p={8}
            border="1px"
            borderColor="border"
            alignItems="start"
            maxW="container.lg"
          >
            <Box fontSize="2xl">
              <Text
                fontFamily="mono"
                color="primary"
                lineHeight="130%"
                fontSize="inherit"
                maxW="8ch"
              >
                Solidity {versionNumber}
              </Text>
            </Box>
            <Flex direction="column" justify="space-between" gap={6}>
              <Box>
                <Text lineHeight="180%" fontSize="md" mb={4}>
                  <Link
                    href="/blog/2025/12/18/solidity-0.8.32-0.8.33-release-announcement/"
                    fontWeight="bold"
                  >
                    We just released the Solidity Compiler v0.8.33.
                  </Link>{' '}
                  This hotfix release addresses an internal compiler error
                  introduced in v0.8.32, which fixed a long-standing bug
                  affecting array operations at the storage boundary and added
                  support for emitting events and reverting with errors
                  namespaced using modules.
                </Text>
              </Box>
            </Flex>
          </Flex>
        </Section>

        {/* Solidity is evolving rapidly > Get started */}
        <ShowcaseSection py={sectionPaddingY}>
          <ShowcaseContent
            title="Solidity is evolving rapidly"
            px={{ base: 4, md: 0 }}
          >
            <Text>
              We aim for a regular (non-breaking) release every month, with
              approximately one breaking release per year. You can follow the
              implementation status of new features in the{' '}
              <Link
                href="https://github.com/orgs/ethereum/projects/26"
                fontWeight="bold"
              >
                Solidity GitHub project
              </Link>
              .
            </Text>
            <ButtonLink
              href="https://docs.soliditylang.org/en/latest/installing-solidity.html"
              variant="solid"
              mt={8}
            >
              Get started
            </ButtonLink>
          </ShowcaseContent>
          <ShowcaseVisual>
            <Triangles variant="evolving" />
          </ShowcaseVisual>
        </ShowcaseSection>

        {/* Contribute to Solidity */}
        <Section py={sectionPaddingY} gap={12}>
          <ShowcaseSection startWithVisual px={0}>
            <ShowcaseContent title="Contribute to Solidity">
              <Text>
                Solidity continues to improve with help from our global
                community. Check out these ways to get involved and contribute
                to the Solidity project.
              </Text>
            </ShowcaseContent>
            <ShowcaseVisual>
              <Triangles variant="triforce" />
            </ShowcaseVisual>
          </ShowcaseSection>

          <ContributingCards />

          <Flex justify="center">
            <ButtonLink href={CONTRIBUTE_PATH} variant="solid">
              Start contributing
            </ButtonLink>
          </Flex>
        </Section>

        {/* Stay updated */}
        <Section py={sectionPaddingY} gap={12}>
          <ShowcaseSection px={0}>
            <ShowcaseContent title="Stay Updated">
              <Text>
                Stay always up-to-date by following the{' '}
                <Link href="https://soliditylang.org/blog/" fontWeight="bold">
                  Solidity blog
                </Link>
                .
              </Text>
              <Text>
                You can see the upcoming changes for the next breaking release
                by switching from the default branch (<Code>develop</Code>) to
                the <Code>breaking branch</Code>. You can actively shape
                Solidity by providing your input and participating in the
                language design in the{' '}
                <Link href="https://forum.soliditylang.org/" fontWeight="bold">
                  Solidity forum
                </Link>
                and participating in the yearly Solidity developer surveys.
              </Text>
            </ShowcaseContent>
            <ShowcaseVisual>
              <Triangles variant="slash" />
            </ShowcaseVisual>
          </ShowcaseSection>

          {/* Latest from the blog */}
          <Section px={0}>
            <Text textStyle="h6-mono" color="primary">
              Latest from the blog
            </Text>
            <BlogSectionPreview postsData={previewBlogPosts} />
          </Section>

          <Flex justify="center">
            <ButtonLink href={BLOG_PATH} variant="solid">
              All blog updates
            </ButtonLink>
          </Flex>
        </Section>

        {/* Playground section */}
        <Section py={sectionPaddingY} gap={12}>
          <ShowcaseSection startWithVisual>
            <ShowcaseContent title="Playground">
              <Text>
                Try Solidity for yourself in this simple compiler. For a more
                fully featured browser-based IDE, try using{' '}
                <Link href="https://remix.ethereum.org">Remix</Link>.
              </Text>
            </ShowcaseContent>
            <ShowcaseVisual>
              <Triangles variant="double" />
            </ShowcaseVisual>
          </ShowcaseSection>

          {/* Interactive Solidity code editor and compiler */}
          <CompilerPlayground />
        </Section>

        {/* Upcoming solidity events */}
        <Section py={sectionPaddingY} gap={12}>
          <ShowcaseSection px={0} reverseMobile alignItems="start">
            <ShowcaseContent title="Solidity Events" flex={4}>
              {/* <Text>
                The Solidity Summit is a free interactive forum for people
                involved and interested in the Solidity language and the
                ecosystem around it.
              </Text>
              <Text>
                Its goal is to enable useful (language-design related) discussions which result
                in improvement proposals and actual implementations, foster
                communication between teams working on similar topics and 
                to identify needs for the smart contract ecosystem for Ethereum.
              </Text> */}
            </ShowcaseContent>
            {/* <ShowcaseVisual direction="column" flex={5} w="full">
              {nextEvent ? (
                <EventCard frontmatter={nextEvent.frontmatter} />
              ) : (
                <Text>No upcoming events</Text>
              )}
            </ShowcaseVisual> */}
          </ShowcaseSection>

          {/* Past events */}
          <Section gap={6} px={0}>
            <Text as="h3" textStyle="h6-mono" color="primary">
              Past events
            </Text>
            <EventPreview events={allEvents} />
          </Section>
        </Section>
      </Box>
    </>
  )
}
