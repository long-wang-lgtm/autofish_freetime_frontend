'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOpportunity } from '@/lib/api/opportunities'
import { createPublishedItem } from '@/lib/api/publish-items'
import { Modal } from '@/components/ui/overlay'

interface NewOpportunityModalProps {
  onClose: () => void
}

export function NewOpportunityModal({ onClose }: NewOpportunityModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [instanceCount, setInstanceCount] = useState('1')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const count = parseInt(instanceCount) || 1
      const opp = await createOpportunity({
        name: name.trim(),
        source_type: 'manual',
        source_description: description,
        price: price ? parseFloat(price) : 0,
      })
      // 批量创建发布素材（账号留空）
      await Promise.all(
        Array.from({ length: count }, () =>
          createPublishedItem(opp.id, '', '', price ? parseFloat(price) : 0)
        )
      )
      return opp
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['published-items'] })
      onClose()
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('商机名称不能为空')
      return
    }
    const count = parseInt(instanceCount)
    if (isNaN(count) || count < 1 || count > 20) {
      setError('发布素材数量需在 1~20 之间')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="新建商机"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            form="new-opportunity-form"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '创建中...' : '创建商机'}
          </button>
        </div>
      }
    >
      <form id="new-opportunity-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            商机名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例如：绝版书-文学类"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 h-24"
            placeholder="从采集或手动输入的商品描述，作为 AI 改写的原材料..."
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">价格</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              发布素材 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={instanceCount}
              onChange={e => setInstanceCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="1"
              min="1"
              max="20"
            />
            <p className="text-xs text-gray-400 mt-0.5">1~20 个素材，账号后续选择</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </form>
    </Modal>
  )
}
