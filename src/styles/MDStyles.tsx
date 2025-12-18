import {
  Box,
  Divider,
  Flex,
  Heading,
  Image,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { Code, Link } from '@/components'
// TODO: Debug tables

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
    <Heading
      as="h2"
      id={id}
      textStyle="h2"
      fontSize="5xl"
      color="text"
      mt={{ base: 12, md: 16 }}
      mb={{ base: 4, md: 6 }}
    >
      {children}
    </Heading>
  ),
  h3: ({ children, id }: any) => (
    <Heading
      as="h3"
      id={id}
      textStyle="h3"
      fontSize="3xl"
      color="text"
      mt={{ base: 10, md: 14 }}
      mb={{ base: 4, md: 6 }}
    >
      {children}
    </Heading>
  ),
  h4: ({ children, id }: any) => (
    <Heading
      as="h4"
      id={id}
      textStyle="h4"
      fontSize="2xl"
      color="text"
      mt={{ base: 8, md: 12 }}
      mb={{ base: 4, md: 6 }}
    >
      {children}
    </Heading>
  ),
  h5: ({ children }: any) => (
    <Heading
      as="h5"
      textStyle="h5-mono"
      fontSize="xl"
      color="text"
      mt={{ base: 6, md: 8 }}
      mb={{ base: 2, md: 4 }}
    >
      {children}
    </Heading>
  ),
  h6: ({ children }: any) => (
    <Heading
      as="h6"
      textStyle="h6-mono"
      fontSize="lg"
      color="text"
      mt={{ base: 4, md: 6 }}
      mb={{ base: 2, md: 4 }}
    >
      {children}
    </Heading>
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
    return <Image display="block" mx="auto" src={img.src} alt={img.alt} />
  },
  hr: ({ children }: any) => {
    return <Divider my={6}>{children}</Divider>
  },
}
