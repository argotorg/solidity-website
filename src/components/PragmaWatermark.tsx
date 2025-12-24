import { Box } from '@chakra-ui/react'
import { motion, useTransform, useScroll } from 'framer-motion'

const labels = [
  'pragma',
  'contract',
  'function',
  'modifier',
  'event',
  'struct',
  'enum',
  'require',
  'address',
]

export const PragmaWatermark: React.FC = () => {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 200, 300], [0, 200, 250], {
    clamp: false,
  })
  const lineHeight = useTransform(scrollY, [200, 2000], [1.4, 2])
  return (
    <Box
      display={{ base: 'none', md: 'flex' }}
      position="absolute"
      top={0}
      insetEnd={8}
      zIndex={-2}
      aria-hidden
    >
      <motion.aside style={{ y }}>
        {labels.map((label) => (
          <Box
            key={label}
            fontFamily="mono"
            fontSize={{ base: '5xl', lg: '6xl' }}
            opacity="5%"
            textAlign="end"
          >
            <motion.p style={{ lineHeight, fontSize: 'inherit' }}>
              {label}
            </motion.p>
          </Box>
        ))}
      </motion.aside>
    </Box>
  )
}
