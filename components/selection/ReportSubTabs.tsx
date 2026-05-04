'use client'

import { FileText, BarChart2 } from 'lucide-react'

export type ReportSubTab = 'daily' | 'summary'

interface ReportSubTabsProps {
  activeSubTab: ReportSubTab
  onSubTabChange: (subTab: ReportSubTab) => void
}

const subtabs: { name: ReportSubTab; label: string; icon: React.ReactNode }[] = [
  { name: 'daily', label: '每日报告', icon: <FileText className="w-4 h-4" /> },
  { name: 'summary', label: '选品汇总', icon: <BarChart2 className="w-4 h-4" /> },
]

export function ReportSubTabs({ activeSubTab, onSubTabChange }: ReportSubTabsProps) {
  return (
    <div className="bg-white rounded-lg px-3 py-2 border border-gray-100 w-fit">
      <div className="flex gap-2">
        {subtabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => onSubTabChange(tab.name)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === tab.name
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
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