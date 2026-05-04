'use client'

import Link from 'next/link'
import { Category } from '@/lib/api/selection'
import { Tag, Users, ShoppingBag, Clock } from 'lucide-react'

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/dashboard/selection/${category.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
        {/* 标题行 */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{category.name}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              category.type === 'scene'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-green-50 text-green-600'
            }`}
          >
            {category.type === 'scene' ? '场景' : '行业'}
          </span>
        </div>

        {/* 统计行 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Tag className="w-4 h-4 text-gray-400" />
            <span>{category.keywordCount} 关键词</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{category.accountCount} 账号</span>
          </div>
        </div>

        {/* 底部 */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-900">
              今日 {category.todayCollectCount} 件
            </span>
          </div>
          {category.lastCollectTime && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{category.lastCollectTime}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
