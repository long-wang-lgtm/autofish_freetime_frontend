'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import {
  ItemsFilterBarDesktop,
  type ItemsFilterBarProps,
} from '@/components/items/parts/ItemsFilterBarDesktop'
import { ItemsFilterBarMobile } from '@/components/items/parts/ItemsFilterBarMobile'

export type { ItemsFilterBarProps }

export function ItemsFilterBar(props: ItemsFilterBarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <ItemsFilterBarMobile {...props} />
  }
  return <ItemsFilterBarDesktop {...props} />
}
