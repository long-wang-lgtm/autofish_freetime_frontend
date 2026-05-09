'use client'

import { Search, BarChart2, Users } from 'lucide-react'

export type TabName = 'keyword' | 'product' | 'merchant'

interface TabBarProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
}

const tabs: { name: TabName; label: string; icon: React.ReactNode }[] = [
  { name: 'keyword', label: '关键词采集', icon: <Search className="w-4 h-4" /> },
  { name: 'product', label: '商品监控', icon: <BarChart2 className="w-4 h-4" /> },
  { name: 'merchant', label: '商家监控', icon: <Users className="w-4 h-4" /> },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="bg-white rounded-xl px-5">
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => onTabChange(tab.name)}
            className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.name
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
