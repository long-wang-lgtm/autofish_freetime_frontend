'use client'

import { useState, useEffect } from 'react'
import type { MonitoredItem } from '@/lib/api/batch-publish'
import { ReferenceCard } from './ReferenceCard'

interface ReferencePanelProps {
  items: MonitoredItem[]
  isLoading: boolean
  opportunityId: number
}

const STORAGE_KEY_PREFIX = 'bp-ref-panel-'

export function ReferencePanel({ items, isLoading, opportunityId }: ReferencePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  // 从 localStorage 恢复折叠状态
  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${opportunityId}`)
    if (saved === 'collapsed') setCollapsed(true)
  }, [opportunityId])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${opportunityId}`, next ? 'collapsed' : 'expanded')
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
        加载监控商品数据...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100">
        该商机下暂无绑定的监控商品
      </div>
    )
  }

  return (
    <div className="border-b border-gray-100 flex-shrink-0">
      {/* 折叠标题栏 */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>参考信息（{items.length} 个监控商品）</span>
      </button>

      {/* 横向滚动卡片 */}
      {!collapsed && (
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-3" style={{ scrollSnapType: 'x mandatory' }}>
            {items.slice(0, 5).map((item) => (
              <div key={item.gid} style={{ scrollSnapAlign: 'start' }}>
                <ReferenceCard item={item} />
              </div>
            ))}
            {items.length > 5 && (
              <span
                className="flex-shrink-0 inline-flex items-center px-3 py-2 text-xs text-gray-400"
                style={{ scrollSnapAlign: 'start' }}
              >
                +{items.length - 5} 更多 →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
