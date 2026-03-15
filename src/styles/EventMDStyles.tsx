import { HeadingWithAnchor } from '@/components'
import { MDStyles } from '@/styles'

export const EventMDStyles = {
  ...MDStyles,
  h2: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h2"
      id={id}
      textStyle="h2"
      color="text"
      mt={{ base: 12, md: 16 }}
      mb={{ base: 4, md: 6 }}
      textAlign="center"
    >
      {children}
    </HeadingWithAnchor>
  ),
  h3: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h3"
      id={id}
      textStyle="h3"
      color="text"
      my={{ base: 4, md: 6 }}
    >
      {children}
    </HeadingWithAnchor>
  ),
}
