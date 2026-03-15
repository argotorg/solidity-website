import {
  Heading,
  type HeadingProps,
  Link as ChakraLink,
} from '@chakra-ui/react'
import { LinkIcon } from '@chakra-ui/icons'

interface HeadingWithAnchorProps extends HeadingProps {
  id?: string
}

export const HeadingWithAnchor: React.FC<HeadingWithAnchorProps> = ({
  children,
  id,
  ...props
}) => (
  <Heading id={id} role="group" {...props}>
    {children}
    {id && (
      <ChakraLink
        href={`#${id}`}
        aria-label="Link to this section"
        ml={2}
        opacity={0}
        _groupHover={{ opacity: 1 }}
        transition="opacity 0.2s"
        color="secondary"
        display="inline"
        verticalAlign="middle"
      >
        <LinkIcon boxSize="0.5em" />
      </ChakraLink>
    )}
  </Heading>
)
