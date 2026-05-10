'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type PublishedItem,
  listPublishedItems,
  updatePublishedItem,
  triggerRewrite,
  triggerCoverPlan,
  triggerImageGenerate,
  triggerPublish,
} from '@/lib/api/publish-items'
import { CreationProgressBar } from './CreationProgressBar'
import { ImageLightbox } from './ImageLightbox'

function getStatusLabel(item: PublishedItem): { label: string; color: string } {
  if (item.status === 'publish_failed') return { label: '失败', color: 'text-red-500' }
  if (item.item_gid) return { label: '已发布', color: 'text-green-600' }
  if (item.status === 'publishing') return { label: '发布中', color: 'text-teal-500' }
  if (item.cover_image) return { label: '生图完成', color: 'text-orange-500' }
  if (item.status === 'image_generating') return { label: '生图中', color: 'text-orange-500' }
  if (item.cover_plan_prompt) return { label: '封面完成', color: 'text-purple-500' }
  if (item.status === 'cover_planning') return { label: '封面规划中', color: 'text-purple-500' }
  if (item.description) return { label: '改写完成', color: 'text-blue-500' }
  if (item.status === 'rewriting') return { label: '改写中', color: 'text-blue-500' }
  if (item.status === 'rewrite_done') return { label: '改写完成', color: 'text-blue-500' }
  return { label: item.status, color: 'text-gray-400' }
}

interface PublishInstanceListProps {
  opportunityId: number
  accounts: { uid: string; name: string }[]
  onEditItem: (item: PublishedItem) => void
  selectedItemId?: number
}

export function PublishInstanceList({
  opportunityId,
  accounts,
  onEditItem,
  selectedItemId,
}: PublishInstanceListProps) {
  const queryClient = useQueryClient()
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<PublishedItem>>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['published-items', opportunityId],
    queryFn: () => listPublishedItems({ opportunity_id: opportunityId, page_size: 100 }),
  })

  const items: PublishedItem[] = data?.items ?? []

  const saveEditMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<PublishedItem> }) =>
      updatePublishedItem(payload.id, payload.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? updated : i) }
      })
      setEditingId(null)
    },
  })

  const triggerMutation = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: number; action: string }) => {
      switch (action) {
        case 'rewrite': return triggerRewrite(itemId)
        case 'cover_plan': return triggerCoverPlan(itemId)
        case 'image_gen': return triggerImageGenerate(itemId)
        case 'publish': return triggerPublish(itemId)
        default: throw new Error('Unknown action: ' + action)
      }
    },
    onSuccess: () => refetch(),
  })

  const handleStageClick = (item: PublishedItem, stage: 'rewrite' | 'cover_plan' | 'image_gen' | 'publish') => {
    if (stage === 'publish' && !item.account_uid) {
      window.alert('请先在编辑区为该实例选择目标账号，再执行发布。')
      return
    }
    const actionMap: Record<string, string> = {
      rewrite: 'rewrite',
      cover_plan: 'cover_plan',
      image_gen: 'image_gen',
      publish: 'publish',
    }
    triggerMutation.mutate({ itemId: item.id, action: actionMap[stage] })
  }

  const handleStartEdit = (item: PublishedItem) => {
    setEditingId(item.id)
    setEditForm({
      description: item.description,
      cover_plan_prompt: item.cover_plan_prompt,
      price: item.price,
      account_uid: item.account_uid,
      category: item.category,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    saveEditMutation.mutate({ id: editingId, data: editForm })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i.id))
    )
  }

  const handleBatchPublish = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id))
    const withoutAccount = selectedItems.filter(i => !i.account_uid)
    if (withoutAccount.length > 0) {
      const lines = withoutAccount.map(i => '  - ' + (i.title || '#' + i.id)).join('\n')
      window.alert('以下 ' + withoutAccount.length + ' 个实例尚未选择账号，无法发布：\n\n' + lines + '\n\n请先选择目标账号。')
      return
    }
    const lines = selectedItems.map(i => {
      const accName = accounts.find(a => a.uid === i.account_uid)?.name ?? i.account_uid
      return '  - ' + (i.title || '#' + i.id) + ' -> ' + accName
    }).join('\n')
    if (window.confirm('确认批量发布 ' + selectedItems.length + ' 个商品？\n\n' + lines)) {
      selectedItems.forEach(item => {
        triggerMutation.mutate({ itemId: item.id, action: 'publish' })
      })
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 表头 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b text-xs font-medium text-gray-500 min-w-[900px]">
        <div className="w-[18px] flex-shrink-0">
          <input
            type="checkbox"
            checked={selectedIds.size === items.length && items.length > 0}
            onChange={toggleSelectAll}
            className="rounded"
          />
        </div>
        <div className="w-[48px] flex-shrink-0">封面</div>
        <div className="flex-1 min-w-[160px]">改写内容</div>
        <div className="flex-1 min-w-[200px]">封面规划</div>
        <div className="w-[70px] flex-shrink-0 text-right">价格</div>
        <div className="w-[90px] flex-shrink-0">账号</div>
        <div className="w-[100px] flex-shrink-0">类目</div>
        <div className="w-[130px] flex-shrink-0">创作进度</div>
        <div className="w-[60px] flex-shrink-0">状态</div>
        <div className="w-[40px] flex-shrink-0 text-right">操作</div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无发布实例</div>
        ) : (
          items.map(item => {
            const statusInfo = getStatusLabel(item)
            const accountName = accounts.find(a => a.uid === item.account_uid)?.name ?? item.account_uid
            const isSelected = selectedItemId === item.id
            const isEditing = editingId === item.id

            return (
              <div
                key={item.id}
                className={
                  'flex items-stretch gap-1.5 px-3 py-1.5 border-b text-xs min-w-[900px]' +
                  (isEditing ? ' bg-blue-50' : isSelected ? ' bg-blue-50/50' : ' hover:bg-gray-50')
                }
              >
                {/* checkbox */}
                <div className="w-[18px] flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded"
                  />
                </div>

                {/* 封面图 */}
                <div className="w-[48px] flex-shrink-0">
                  {item.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_image.startsWith('data:') ? item.cover_image : 'data:image/jpeg;base64,' + item.cover_image}
                      alt="封面"
                      className="w-11 h-11 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-400"
                      onClick={() => setLightboxSrc(item.cover_image)}
                    />
                  ) : (
                    <div className="w-11 h-11 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-lg">📷</div>
                  )}
                </div>

                {/* 改写内容 */}
                {isEditing ? (
                  <div className="flex-1 min-w-[160px]">
                    <textarea
                      value={editForm.description ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full p-1 border border-blue-400 rounded text-xs resize-none"
                      rows={3}
                    />
                  </div>
                ) : (
                  <div
                    className="flex-1 min-w-[160px] truncate text-gray-700"
                    title={item.description}
                  >
                    {item.description ? item.description.slice(0, 30) + '...' : <span className="text-gray-300">（空）</span>}
                  </div>
                )}

                {/* 封面规划 */}
                {isEditing ? (
                  <div className="flex-1 min-w-[200px]">
                    <textarea
                      value={editForm.cover_plan_prompt ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, cover_plan_prompt: e.target.value }))}
                      className="w-full p-1 border border-blue-400 rounded text-xs resize-none"
                      rows={3}
                    />
                  </div>
                ) : (
                  <div
                    className="flex-1 min-w-[200px] truncate text-gray-400"
                    title={item.cover_plan_prompt}
                  >
                    {item.cover_plan_prompt ? item.cover_plan_prompt.slice(0, 40) + '...' : <span className="text-gray-300">（空）</span>}
                  </div>
                )}

                {/* 价格 */}
                {isEditing ? (
                  <div className="w-[70px] flex-shrink-0">
                    <input
                      type="number"
                      value={editForm.price ?? 0}
                      onChange={e => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-1 border border-blue-400 rounded text-xs text-right"
                      step="0.01"
                    />
                  </div>
                ) : (
                  <div className="w-[70px] flex-shrink-0 text-right text-gray-700">
                    {item.price > 0 ? '￥' + item.price : '-'}
                  </div>
                )}

                {/* 账号 */}
                {isEditing ? (
                  <div className="w-[90px] flex-shrink-0">
                    <select
                      value={editForm.account_uid ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, account_uid: e.target.value }))}
                      className="w-full p-1 border border-blue-400 rounded text-xs"
                    >
                      <option value="">未选择</option>
                      {accounts.map(acc => (
                        <option key={acc.uid} value={acc.uid}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="w-[90px] flex-shrink-0 truncate text-gray-600" title={accountName}>
                    {accountName || <span className="text-gray-300">-</span>}
                  </div>
                )}

                {/* 类目 */}
                {isEditing ? (
                  <div className="w-[100px] flex-shrink-0">
                    <input
                      type="text"
                      value={editForm.category ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full p-1 border border-blue-400 rounded text-xs"
                      placeholder="类目"
                    />
                  </div>
                ) : (
                  <div className="w-[100px] flex-shrink-0 truncate text-gray-500" title={item.category}>
                    {item.category || <span className="text-gray-300">-</span>}
                  </div>
                )}

                {/* 创作进度（只读） */}
                <div className="w-[130px] flex-shrink-0">
                  <CreationProgressBar
                    item={item}
                    onStageClick={stage => handleStageClick(item, stage)}
                    size="sm"
                  />
                </div>

                {/* 状态（只读） */}
                <div className={'w-[60px] flex-shrink-0 text-xs ' + statusInfo.color}>
                  {statusInfo.label}
                </div>

                {/* 操作 */}
                <div className="w-[40px] flex-shrink-0 text-right flex gap-1 justify-end">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saveEditMutation.isPending}
                        className="text-green-600 hover:bg-green-50 px-1 rounded text-xs"
                      >
                        {saveEditMutation.isPending ? '...' : '保存'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-400 hover:text-gray-600 px-1 rounded text-xs"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-t">
          <span className="text-sm text-blue-700">已选择 {selectedIds.size} 项</span>
          <button
            onClick={handleBatchPublish}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            批量发布 ▶
          </button>
        </div>
      )}

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}
