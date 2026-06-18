'use client'

import { type ReactNode } from 'react'

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
  /** inset = 栏在容器内（selection风格），overline = 栏在容器外（settings 风格） */
  variant?: TabVariant
}

export function TabBar({ tabs, activeTab, onTabChange, variant = 'inset' }: TabBarProps) {
  if (variant === 'overline') {
    // 一级 Tab 栏在容器外 — settings 风格
    return (
      <div className="flex items-center gap-0 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`inline-flex items-center gap-1.5 px-5 py-3 text-base font-semibold transition-all border-b-2 -mb-[2px] ${
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
    )
  }

  // inset — 栏在容器内，tab 栏本身带卡片背景
  return (
    <div className="bg-white rounded-xl px-5">
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all ${
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