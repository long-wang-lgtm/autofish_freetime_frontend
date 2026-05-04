'use client'

import { useSelectionStore } from '@/stores/selection.store'
import { CategoryCard } from './CategoryCard'

export function CategoryCardGrid() {
  const { categories } = useSelectionStore()

  if (categories.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">暂无分类，点击上方按钮创建第一个分类</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} />
      ))}
    </div>
  )
}
