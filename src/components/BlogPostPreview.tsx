import { Box, Text } from '@chakra-ui/react'
import { CategoryPill, Link } from '@/components'
import { BlogPostProps } from '@/interfaces'
import { getBlogSubtitle } from '@/utils'

interface BlogPostPreviewProps extends BlogPostProps {
  isCategoryPage?: boolean
  isFeatured?: boolean
}
export const BlogPostPreview: React.FC<BlogPostPreviewProps> = ({
  frontmatter,
  content,
  url,
  isCategoryPage,
  isFeatured,
  ...boxProps
}) => {
  const { title, date, author, category } = frontmatter
  return (
    <Box {...boxProps}>
      <Link href={url} textDecoration="none" data-group>
        <Text
          as="h2"
          textStyle={isFeatured ? 'h3-mono' : 'h5-mono'}
          _groupHover={{ color: 'primary', textDecoration: 'underline' }}
          color="text"
          mb={1}
        >
          {title}
        </Text>
      </Link>
      <Text color="primary" mb={6}>
        {getBlogSubtitle(author, date)}
      </Text>
      <CategoryPill category={category} skipLink={isCategoryPage} />
      <Text mb={4} textAlign="justify">
        {content}
      </Text>
      <Link href={url}>Read more</Link>
    </Box>
  )
}
