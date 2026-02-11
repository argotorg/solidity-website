import { Box, useColorMode } from '@chakra-ui/react'
import { Footer, Header } from '@/components'
import { useColorContinuity } from '@/hooks'
import { AppProps } from 'next/app'
import { useEffect } from 'react'
import { Link } from '@/components'

interface PageLayoutProps extends Pick<AppProps, 'Component' | 'pageProps'> {}
export const PageLayout: React.FC<PageLayoutProps> = ({
  Component,
  pageProps,
}) => {
  useColorContinuity()

  const { toggleColorMode } = useColorMode()
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.code === 'Backslash') toggleColorMode()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleColorMode])

  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  return (
    <>
      {/* Banner */}
      <Box
        bg={isDark ? '#AEC0F1' : '#2B247C'}
        color={isDark ? '#2B247C' : '#AEC0F1'}
        py={3}
        px={4}
        textAlign="center"
        fontSize={{ base: 'sm', md: 'md' }}
        fontWeight="medium"
        zIndex={9999}
        position="relative"
      >
        The annual Solidity Survey is out! Please spend{' '}
        <Link
          href="https://solidity.survey-research.net/solidity-survey"
          textDecoration="underline"
          _hover={{ opacity: 0.8 }}
          isExternal
        >
          5 minutes to fill it out
        </Link>{' '}
        and help us improve Solidity!
      </Box>

      <Box textStyle="body" maxW="container.xl" mx="auto">
        <Header />
        <Component {...pageProps} />
        <Footer />
      </Box>
    </>
  )
}
