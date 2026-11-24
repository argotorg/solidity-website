import { Grid } from '@chakra-ui/react'
import { BlogCard } from '@/components'
import type { BlogPostProps } from '@/interfaces'

interface BlogSectionPreviewProps {
  postsData: BlogPostProps[]
}

export const BlogSectionPreview: React.FC<BlogSectionPreviewProps> = ({
  postsData,
}) => {
  return (
    <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={12}>
      {postsData.map((blogPost: BlogPostProps) => (
        <BlogCard
          blogPost={blogPost}
          key={blogPost.frontmatter.title}
          maxW="container.md"
        />
      ))}
    </Grid>
  )
}
