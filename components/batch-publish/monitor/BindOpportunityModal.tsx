'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/overlay/Modal'
import { useQuery } from '@tanstack/react-query'
import { listOpportunities, createOpportunity, type OpportunityParams } from '@/lib/api/batch-publish'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

interface BindOpportunityModalProps {
  open: boolean
  onClose: () => void
  selectedCount: number
  mode?: 'batch' | 'single'
  onConfirm: (opportunityId: number) => void
  isPending: boolean
}

export function BindOpportunityModal({
  open,
  onClose,
  selectedCount,
  mode = 'batch',
  onConfirm,
  isPending,
}: BindOpportunityModalProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  const [selectedOID, setSelectedOID] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTemplate, setNewTemplate] = useState<'only_opportunity' | 'with_item'>('only_opportunity')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { search, page }],
    queryFn: () => listOpportunities({ name: search || undefined, page, page_size: 10 }),
    enabled: open && activeTab === 'existing',
  })

  const handleCreateAndBind = async () => {
    if (!newName.trim()) {
      setCreateError('请输入商机名称')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      const input: OpportunityParams = {
        name: newName.trim(),
        description: newDescription || undefined,
        ai_context_template: newTemplate,
      }
      const opp = await createOpportunity(input)
      onConfirm(opp.id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '创建失败'
      setCreateError(message)
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === 'single'
          ? '绑定商品到商机'
          : `绑定商品到商机（已选 ${selectedCount} 个）`
      }
      size="md"
    >
      {/* Tab 切换 */}
      <div className="flex gap-0 border-b border-gray-100 mb-4">
        <button
          onClick={() => setActiveTab('existing')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'existing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          选择已有商机
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'new'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          创建新商机
        </button>
      </div>

      {activeTab === 'existing' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="搜索商机..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {(data?.items ?? []).map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => setSelectedOID(opp.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedOID === opp.id
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{opp.name}</p>
                  <p className="text-xs text-gray-400">
                    {opp.monitoredItemCount ?? 0} 商品 · {opp.materialCount ?? 0} 素材
                  </p>
                </button>
              ))}
              {!data?.items?.length && (
                <p className="text-sm text-gray-400 text-center py-4">暂无商机</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="h-10 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => selectedOID && onConfirm(selectedOID)}
              disabled={!selectedOID || isPending}
              className="h-10 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '绑定中...' : '确认绑定'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">商机名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              placeholder="如：日系简约风手机壳"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">描述</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical mt-1"
              placeholder="选填"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">AI 上下文模板</label>
            <select
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value as 'only_opportunity' | 'with_item')}
              className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white mt-1"
            >
              <option value="only_opportunity">{TEMPLATE_TYPE_LABELS.only_opportunity}</option>
              <option value="with_item">{TEMPLATE_TYPE_LABELS.with_item}</option>
            </select>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="h-10 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleCreateAndBind}
              disabled={createLoading || isPending}
              className="h-10 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createLoading ? '创建中...' : '创建并绑定'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
