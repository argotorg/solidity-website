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
        Thanks for joining the Solidity Summit 2025 🇦🇷 The{' '}
        <Link
          href="/blog/2025/12/04/solidity-summit-2025-recap/"
          textDecoration="underline"
          _hover={{ opacity: 0.8 }}
        >
          recap and recordings
        </Link>{' '}
        are live!
      </Box>

      <Box textStyle="body" w="100%" maxW="container.xl" mx="auto">
        <Header />
        <Component {...pageProps} />
        <Footer />
      </Box>
    </>
  )
}
