import fs from 'fs'
import matter from 'gray-matter'
import { Box } from '@chakra-ui/react'
import { ParsedUrlQuery } from 'querystring'
import type { GetStaticPaths, GetStaticProps } from 'next/types'
import { BlogHero, BlogPost, PageMetadata, PostNavigation } from '@/components'
import { BLOG_POSTS_DIR, MAIN_CONTENT_ID, MATTER_OPTIONS } from '@/constants'
import { getBlogSubtitle, getPostParamsFromFilename, getPostURL } from '@/utils'
import type { PostPath, BlogPostProps } from '@/interfaces'

// Generate the paths for each event
export const getStaticPaths: GetStaticPaths = () => {
  // Check if any .md post file exists, don't generate the paths otherwise
  if (!fs.existsSync(BLOG_POSTS_DIR)) return { paths: [], fallback: false }

  const paths: PostPath[] = []

  // Get list of all files from our blog posts directory
  const files = fs.readdirSync(BLOG_POSTS_DIR)
  // Generate a path for each one
  files.forEach((file) => {
    if (!file.endsWith('.md')) return
    const params = getPostParamsFromFilename(file)
    if (params) {
      paths.push({ params })
    }
  })
  // Return list of paths
  return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { YYYY, MM, DD, post } = context.params as ParsedUrlQuery
  const files = fs.readdirSync(BLOG_POSTS_DIR).sort().reverse()
  const filePath = `${BLOG_POSTS_DIR}/${YYYY}-${MM}-${DD}-${post}.md`
  const file = fs.readFileSync(filePath, 'utf-8')
  const { data: frontmatter, content } = matter(file, MATTER_OPTIONS)
  return {
    props: {
      frontmatter,
      content,
      availableURLs: files.map((file) => getPostURL(file)),
    },
  }
}

const BlogPostPage: React.FC<BlogPostProps> = ({
  frontmatter,
  content,
  availableURLs = [],
}) => (
  <>
    <PageMetadata
      title={frontmatter.title}
      description={getBlogSubtitle(frontmatter.author, frontmatter.date)}
      image={frontmatter.image}
    />
    <Box
      as="main"
      id={MAIN_CONTENT_ID}
      px={{ base: 4, md: 8 }}
      maxW="container.lg"
      mx="auto"
    >
      <BlogHero frontmatter={frontmatter} />
      <BlogPost content={content} maxW="container.lg" />
      <PostNavigation availableURLs={availableURLs} />
    </Box>
  </>
)

export default BlogPostPage
