import { Text, useColorMode } from '@chakra-ui/react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  oneLight,
  dracula,
} from 'react-syntax-highlighter/dist/cjs/styles/prism'
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash'
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json'
import cpp from 'react-syntax-highlighter/dist/cjs/languages/prism/cpp'
import solidity from 'react-syntax-highlighter/dist/cjs/languages/prism/solidity'
import { getLanguageFromCodeProperties } from '@/utils'

SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('cpp', cpp)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('solidity', solidity)

interface CodeProps {
  children: string[]
  inline?: boolean
  properties: {
    className: string[]
  }
}
export const Code: React.FC<CodeProps> = ({ children, inline, properties }) => {
  const language = getLanguageFromCodeProperties(properties)
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'
  return !!inline ? (
    <Text as={'span'} textStyle="code">
      {children[0]}
    </Text>
  ) : (
    <SyntaxHighlighter style={isDark ? dracula : oneLight} language={language}>
      {children[0]}
    </SyntaxHighlighter>
  )
}
