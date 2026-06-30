'use client'

import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Tab 样式变体（仅 overline） */
export type TabVariant = 'overline'

interface Tab {
  key: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  /** Tab 栏样式（栏在容器外，底部边框指示器） */
  variant?: TabVariant
}

function useTabSize() {
  const isMobile = useIsMobile()
  const isLandscape = useMediaQuery('(orientation: landscape)')

  if (!isMobile) return 'pc' as const
  if (isLandscape) return 'landscape-mobile' as const
  return 'portrait-mobile' as const
}

/** 各尺寸档位的样式：outer = 外层容器，button = 单个 tab 按钮 */
const SIZE_STYLES = {
  pc: {
    outer: 'gap-3',
    button: 'px-1 py-1 text-base',
  },
  'landscape-mobile': {
    outer: 'gap-2 overflow-x-auto hide-scrollbar',
    button: 'px-1 py-1 text-xs whitespace-nowrap',
  },
  'portrait-mobile': {
    outer: 'gap-2 overflow-x-auto hide-scrollbar',
    button: 'px-1 py-1 text-xs whitespace-nowrap',
  },
} as const

export function TabBar({ tabs, activeTab, onTabChange, variant = 'overline' }: TabBarProps) {
  const size = useTabSize()
  const sizeStyles = SIZE_STYLES[size]
  const isMobile = size !== 'pc'

  return (
    <div className={isMobile ? 'sticky top-0 z-10 bg-gray-50' : ''}>
      <div className={`flex items-center ${sizeStyles.outer} ${isMobile ? 'tab-mask' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`inline-flex items-center gap-1.5 transition-all border-b-2 font-semibold ${sizeStyles.button} ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon && tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border-b border-gray-200" />
    </div>
  )
}
