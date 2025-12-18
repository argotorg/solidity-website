import fs from 'fs'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import { ParsedUrlQuery } from 'querystring'
import type {
  CategoryPath,
  BlogPostProps,
  CategoryUrl,
  Category,
} from '@/interfaces'
import {
  BlogHeroChild,
  BlogPostPreview,
  Hero,
  PageMetadata,
  Section,
} from '@/components'
import {
  BLOG_POSTS_DIR,
  BLOG_TITLE,
  MAIN_CONTENT_ID,
  URL_CATEGORIES_MAP,
} from '@/constants'
import { generateRssFeed, getAllPostsData } from '@/utils'
import { Box } from '@chakra-ui/react'

// generate the paths for each category
export const getStaticPaths: GetStaticPaths = () => {
  // check if any .md post file exists, don't generate the paths otherwise
  if (!fs.existsSync(BLOG_POSTS_DIR)) {
    return {
      paths: [],
      fallback: false,
    }
  }

  // generate a path for each one
  const paths: CategoryPath[] = []
  Object.keys(URL_CATEGORIES_MAP).forEach((key) => {
    paths.push({ params: { category: key as CategoryUrl } })
  })

  // return list of paths
  return {
    paths,
    fallback: false,
  }
}

// generate the static props for the page
export const getStaticProps: GetStaticProps = async (context) => {
  const { category: categoryUrl } = context.params as ParsedUrlQuery
  // get list of all files from our posts directory
  const files = fs.readdirSync(BLOG_POSTS_DIR)
  const sortedFiles = files.sort().reverse()
  const allPostsData = getAllPostsData(sortedFiles, fs)
  const category: Category = URL_CATEGORIES_MAP[categoryUrl as CategoryUrl]
  const categoryPostsData = allPostsData.filter(
    ({ frontmatter }) => frontmatter.category === category
  )

  // Generate RSS feeds
  const fullFeed = await generateRssFeed(allPostsData)
  const directory = `./public/`
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(`${directory}/feed.xml`, fullFeed.rss2())
  const categoryFeed = await generateRssFeed(allPostsData, category)
  const categoryDirectory = `./public/${categoryUrl}/`
  fs.mkdirSync(categoryDirectory, { recursive: true })
  fs.writeFileSync(`${categoryDirectory}/feed.xml`, categoryFeed.rss2())

  return {
    props: {
      categoryPostsData,
      category,
    },
  }
}

interface Props {
  categoryPostsData: BlogPostProps[]
  category: Category
}

const CategoryPage: NextPage<Props> = ({ categoryPostsData, category }) => {
  const sanitizedCategoryName = category?.endsWith('s')
    ? category.slice(0, category.length - 1).toLowerCase()
    : category.toLowerCase()
  return (
    <>
      <PageMetadata
        title={`Blog: ${category}`}
        description="Solidity Lang blog: latest news & announcements"
      />
      <Box as="main" id={MAIN_CONTENT_ID}>
        <Hero header={BLOG_TITLE}>
          <BlogHeroChild category={category}>
            All {sanitizedCategoryName} posts
          </BlogHeroChild>
        </Hero>
        <Section
          direction="column"
          gap={16}
          maxW="container.lg"
          pt={12}
          pb={64}
          fontSize="md"
          mx="auto"
        >
          {categoryPostsData.map(({ frontmatter, content, url }) => (
            <BlogPostPreview
              key={url}
              frontmatter={frontmatter}
              content={content}
              url={url}
              isCategoryPage
            />
          ))}
        </Section>
      </Box>
    </>
  )
}

export default CategoryPage
