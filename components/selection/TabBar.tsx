'use client'

import { FileText, BarChart2, Settings } from 'lucide-react'

export type TabName = 'content' | 'report' | 'settings'

interface TabBarProps {
  activeTab: TabName
  onTabChange: (tab: TabName) => void
}

const tabs: { name: TabName; label: string; icon: React.ReactNode }[] = [
  { name: 'content', label: '商品采集', icon: <FileText className="w-4 h-4" /> },
  { name: 'report', label: '选品分析', icon: <BarChart2 className="w-4 h-4" /> },
  { name: 'settings', label: '监控设置', icon: <Settings className="w-4 h-4" /> },
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
