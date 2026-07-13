'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/overlay'

interface NewKeywordModalProps {
  onClose: () => void
  onAdd: (keyword: string) => Promise<void>
}

export function NewKeywordModal({ onClose, onAdd }: NewKeywordModalProps) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) {
      setError('请输入关键词')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onAdd(keyword.trim())
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="新建关键词"
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="new-keyword-form"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '添加中...' : '添加'}
          </button>
        </div>
      }
    >
      <form id="new-keyword-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">关键词</label>
          <input
            type="text"
            value={keyword}
            onChange={ev => setKeyword(ev.target.value)}
            placeholder="输入闲鱼搜索关键词"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
