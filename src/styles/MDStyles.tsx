import {
  Box,
  Divider,
  Image,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { Code, HeadingWithAnchor, Link } from '@/components'

const MDTable = ({ children }: any) => {
  const borderColor = useColorModeValue('purple.300', '#3D35A0')
  const headerBg = useColorModeValue('gray.50', '#1a1560')
  const tableBg = useColorModeValue('white', 'transparent')
  return (
    <Box
      overflowX="auto"
      mb={{ base: 4, md: 6 }}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      bg={tableBg}
      sx={{
        '& table': { borderCollapse: 'collapse', width: '100%' },
        '& th, & td': {
          border: '1px solid',
          borderColor,
        },
        '& th': { bg: headerBg },
      }}
    >
      <Table variant="simple" size="sm">
        {children}
      </Table>
    </Box>
  )
}

export const MDStyles = {
  p: ({ children }: any) => (
    <Text fontSize="md" lineHeight="150%" mb={{ base: 4, md: 6 }}>
      {children}
    </Text>
  ),
  a: ({ children, href }: any) => (
    <Link textStyle="link" color="secondary" href={href}>
      {children}
    </Link>
  ),
  h2: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h2"
      id={id}
      textStyle="h2"
      fontSize="5xl"
      color="text"
      mt={{ base: 12, md: 16 }}
      mb={{ base: 4, md: 6 }}
    >
      {children}
    </HeadingWithAnchor>
  ),
  h3: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h3"
      id={id}
      textStyle="h3"
      fontSize="3xl"
      color="text"
      mt={{ base: 10, md: 14 }}
      mb={{ base: 4, md: 6 }}
    >
      {children}
    </HeadingWithAnchor>
  ),
  h4: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h4"
      id={id}
      textStyle="h4"
      fontSize="2xl"
      color="text"
      mt={{ base: 8, md: 12 }}
      mb={{ base: 4, md: 6 }}
    >
      {children}
    </HeadingWithAnchor>
  ),
  h5: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h5"
      id={id}
      textStyle="h5-mono"
      fontSize="xl"
      color="text"
      mt={{ base: 6, md: 8 }}
      mb={{ base: 2, md: 4 }}
    >
      {children}
    </HeadingWithAnchor>
  ),
  h6: ({ children, id }: any) => (
    <HeadingWithAnchor
      as="h6"
      id={id}
      textStyle="h6-mono"
      fontSize="lg"
      color="text"
      mt={{ base: 4, md: 6 }}
      mb={{ base: 2, md: 4 }}
    >
      {children}
    </HeadingWithAnchor>
  ),
  pre: ({ children }: any) => (
    <Stack mb={5}>
      <pre>{children}</pre>
    </Stack>
  ),
  code: ({ children, inline, node: { properties } }: any) => (
    <Code inline={inline} properties={properties}>
      {children}
    </Code>
  ),
  img: (img: any) => {
    if (/\.(mp4|webm)$/.test(img.src ?? '')) {
      return (
        <Box
          as="video"
          display="block"
          mx="auto"
          maxW="100%"
          src={img.src}
          aria-label={img.alt}
          controls
          preload="metadata"
        />
      )
    }
    return <Image display="block" mx="auto" src={img.src} alt={img.alt} />
  },
  hr: ({ children }: any) => {
    return <Divider my={6}>{children}</Divider>
  },
  table: ({ children }: any) => <MDTable>{children}</MDTable>,
  thead: ({ children }: any) => <Thead>{children}</Thead>,
  tbody: ({ children }: any) => <Tbody>{children}</Tbody>,
  tr: ({ children }: any) => <Tr>{children}</Tr>,
  th: ({ children }: any) => <Th>{children}</Th>,
  td: ({ children }: any) => <Td>{children}</Td>,
}
