'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createPublishedItem, triggerRewrite } from '@/lib/api/publish-items'

interface NewPublishedItemModalProps {
  opportunityId: number
  defaultPrice?: number
  onClose: () => void
  onCreated: () => void
}

export function NewPublishedItemModal({
  opportunityId,
  defaultPrice,
  onClose,
  onCreated,
}: NewPublishedItemModalProps) {
  const [count, setCount] = useState('1')
  const [price, setPrice] = useState(defaultPrice ? String(defaultPrice) : '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const n = parseInt(count)
      if (isNaN(n) || n < 1 || n > 20) throw new Error('数量需在 1~20 之间')
      const p = price ? parseFloat(price) : 0
      const items = await Promise.all(
        Array.from({ length: n }, () =>
          createPublishedItem(opportunityId, '', '', p)
        )
      )
      // 每个新建的发布素材自动触发改写
      for (const item of items) {
        await triggerRewrite(item.id)
      }
    },
    onSuccess: () => {
      onCreated()
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">新增发布素材</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="1"
              max="20"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-0.5">每个发布素材账号留空，后续在编辑区选择</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">价格（可选）</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="留空则不设置价格"
              min="0"
              step="0.01"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100">
            取消
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
