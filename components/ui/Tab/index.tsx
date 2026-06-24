'use client'

import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Tab 样式变体 */
export type TabVariant = 'inset' | 'overline'

interface Tab {
  key: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  /** inset = 栏在容器内，overline = 栏在容器外 */
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
    outer: 'gap-0',
    button: 'px-5 py-3 text-base',
  },
  'landscape-mobile': {
    outer: 'gap-1 overflow-x-auto hide-scrollbar',
    button: 'px-3 py-1.5 text-xs whitespace-nowrap',
  },
  'portrait-mobile': {
    outer: 'gap-1 overflow-x-auto hide-scrollbar',
    button: 'px-2 py-1 text-[11px] whitespace-nowrap',
  },
} as const

export function TabBar({ tabs, activeTab, onTabChange, variant = 'inset' }: TabBarProps) {
  const size = useTabSize()
  const sizeStyles = SIZE_STYLES[size]
  const isMobile = size !== 'pc'

  if (variant === 'overline') {
    return (
      <div className="border-b border-gray-200">
        <div className={`flex items-center ${sizeStyles.outer} ${isMobile ? 'tab-mask' : ''}`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`inline-flex items-center gap-1.5 transition-all border-b-2 -mb-[2px] font-semibold ${sizeStyles.button} ${
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
      </div>
    )
  }

  // inset — 栏在容器内，tab 栏本身带卡片背景
  return (
    <div className={`bg-white rounded-xl ${isMobile ? 'px-3' : 'px-5'}`}>
      <div className={`flex ${size === 'pc' ? 'gap-6' : 'gap-1 overflow-x-auto hide-scrollbar tab-mask'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 font-medium border-b-2 transition-all ${
              isMobile ? `whitespace-nowrap ${sizeStyles.button}` : 'py-4 text-sm'
            } ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
