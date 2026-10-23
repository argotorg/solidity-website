import { CategoryPill } from '@/components'
import { CATEGORIES_PATH_MAP } from '@/constants'
import type { Category } from '@/interfaces'
import { Flex, type FlexProps } from '@chakra-ui/react'

const categories: string[] = Object.keys(CATEGORIES_PATH_MAP)
export const BlogCategories: React.FC<FlexProps> = (props) => (
  <Flex columnGap={4} flexWrap="wrap" {...props}>
    {categories.map((category) => (
      <CategoryPill key={category} category={category as Category} />
    ))}
  </Flex>
)
