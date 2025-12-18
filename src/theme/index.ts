import { extendTheme } from '@chakra-ui/react'
import { config, textStyles } from './foundations'
const overrides = {
  config,
  colors: {
    purple: {
      300: '#9F94E8',
      500: '#5554D9',
      600: '#672AC8',
      900: '#2B247C',
    },
    blue: {
      200: '#AEC0F1',
      900: '#110C4E',
    },
    gray: {
      50: '#FAF8FF',
      200: '#E6E3EC',
    },
  },
  components: {},
  fonts: {
    heading: "'Overpass', sans-serif",
    body: "'Overpass', sans-serif",
    mono: "'Overpass Mono', monospace",
  },
  fontSizes: {
    '2xl': '1.5rem',
    '3xl': '2rem',
    '4xl': '2.375rem',
    '5xl': '2.75rem',
    '6xl': '3.25rem',
    '7xl': '4rem',
  },
  shadows: {},
  styles: {
    global: () => ({
      '*': {
        boxSizing: 'border-box',
        scrollBehavior: 'smooth',
        scrollMarginTop: '5rem',
        padding: 0,
        margin: 0,
      },
      body: {
        transition: 'background 200ms linear !important',
        bg: 'bg',
        color: 'text',
      },
      p: {
        lineHeight: '1.7',
        '&:not(:last-of-type)': { mb: '4' },
      },
      ul: {
        listStyleType: 'disc',
        listStylePosition: 'outside',
        pl: '6',
        '& li': {
          mb: '2',
        },
      },
      ol: {
        listStyleType: 'decimal',
        listStylePosition: 'outside',
        pl: '6',
        '& li': {
          mb: '2',
        },
      },
    }),
  },
  textStyles,
  semanticTokens: {
    colors: {
      a: { _light: 'purple.900', _dark: 'gray.200' }, // text
      b: { _light: 'purple.600', _dark: 'blue.200' },
      c: { _light: 'purple.500', _dark: 'purple.300' },
      d: { _light: 'purple.300', _dark: 'purple.500' },
      e: { _light: 'blue.200', _dark: 'purple.600' },
      f: { _light: 'gray.200', _dark: 'purple.900' }, // background
      mode: { _light: 'gray.50', _dark: 'blue.900' },

      text: 'a',
      secondary: 'b',
      primary: 'c',
      highlight: 'd',
      bg: 'f',

      border: 'a',
      header: 'c',
      error: { _light: 'red.500', _dark: 'red.300' },
    },
  },
}

export default extendTheme(overrides)
