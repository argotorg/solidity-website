import { Box, type BoxProps } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { MDStyles } from '@/styles'

interface BlogPostProps extends BoxProps {
  content: string
}
export const BlogPost: React.FC<BlogPostProps> = ({ content, ...boxProps }) => {
  return (
    <>
      <Box as="article" {...boxProps}>
        <ReactMarkdown
          components={MDStyles}
          remarkPlugins={[gfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </Box>
    </>
  )
}
