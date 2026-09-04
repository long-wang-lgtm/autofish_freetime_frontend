'use client'

import { useState } from 'react'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface CreateMaterialModalProps {
  open: boolean
  onClose: () => void
  item: MonitoredItem | null
  onCreate: (num: number) => void
  isPending: boolean
}

export function CreateMaterialModal({ open, onClose, item, onCreate, isPending }: CreateMaterialModalProps) {
  const [num, setNum] = useState(1)

  if (!open || !item) return null

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-lg p-6 w-[360px]">
        <h3 className="text-base font-semibold text-gray-900 mb-1">批量创建素材</h3>
        <p className="text-sm text-gray-500 mb-4">
          商品：{item.title || '未命名'}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">创建数量</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={10}
                value={num}
                onChange={(e) => setNum(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-800 w-8 text-right tabular-nums">{num}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onCreate(num)}
            disabled={isPending}
            className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending ? '创建中...' : `创建 ${num} 份`}
          </button>
        </div>
      </div>
    </>
  )
}
