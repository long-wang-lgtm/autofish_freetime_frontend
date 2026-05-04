'use client'

import { useSelectionStore } from '@/stores/selection.store'
import { CategoryType } from '@/lib/api/selection'

export function CategoryTypeTabs() {
  const { activeType, setActiveType } = useSelectionStore()

  const tabs: { label: string; value: CategoryType }[] = [
    { label: '场景分类', value: 'scene' },
    { label: '行业分类', value: 'industry' },
  ]

  return (
    <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setActiveType(tab.value)}
          className={`px-6 py-2.5 text-base font-medium rounded-lg transition-all ${
            activeType === tab.value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
