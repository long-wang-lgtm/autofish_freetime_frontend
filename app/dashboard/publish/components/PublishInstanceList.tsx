'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type PublishedItem,
  listPublishedItems,
  triggerRewrite,
  triggerCoverPlan,
  triggerImageGenerate,
  triggerPublish,
} from '@/lib/api/publish-items'
import { CreationProgressBar } from './CreationProgressBar'
import { ImageLightbox } from './ImageLightbox'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未开始', color: 'text-gray-400' },
  rewriting: { label: '改写中', color: 'text-blue-500' },
  rewrite_done: { label: '改写完成', color: 'text-blue-500' },
  cover_planning: { label: '封面规划中', color: 'text-purple-500' },
  cover_plan_done: { label: '封面完成', color: 'text-purple-500' },
  image_generating: { label: '生图中', color: 'text-orange-500' },
  image_done: { label: '生图完成', color: 'text-orange-500' },
  publishing: { label: '发布中', color: 'text-teal-500' },
  published: { label: '已发布', color: 'text-green-600' },
  publish_failed: { label: '失败', color: 'text-red-500' },
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['published-items', opportunityId],
    queryFn: () => listPublishedItems({ opportunity_id: opportunityId, page_size: 100 }),
    refetchInterval: 5000,
  })

  const items: PublishedItem[] = data?.items ?? []

  const triggerMutation = useMutation({
    mutationFn: async ({ itemId, action }: { itemId: number; action: string }) => {
      switch (action) {
        case 'rewrite': return triggerRewrite(itemId)
        case 'cover_plan': return triggerCoverPlan(itemId)
        case 'image_gen': return triggerImageGenerate(itemId)
        case 'publish': return triggerPublish(itemId)
        default: throw new Error(`Unknown action: ${action}`)
      }
    },
    onSuccess: () => refetch(),
  })

  const handleStageClick = (item: PublishedItem, stage: 'rewrite' | 'cover_plan' | 'image_gen' | 'publish') => {
    const actionMap: Record<string, string> = {
      rewrite: 'rewrite',
      cover_plan: 'cover_plan',
      image_gen: 'image_gen',
      publish: 'publish',
    }
    triggerMutation.mutate({ itemId: item.id, action: actionMap[stage] })
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
    const confirmMsg = `确认批量发布 ${selectedItems.length} 个商品？\n\n${
      selectedItems.map(i =>
        `- ${i.title || `#${i.id}`} → ${accounts.find(a => a.uid === i.account_uid)?.name ?? i.account_uid}`
      ).join('\n')
    }`
    if (window.confirm(confirmMsg)) {
      selectedItems.forEach(item => {
        triggerMutation.mutate({ itemId: item.id, action: 'publish' })
      })
      setSelectedIds(new Set())
    }
  }

  const truncateDescription = (desc: string, maxLen = 50) =>
    desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc

  return (
    <div className="flex flex-col h-full">
      {/* 表头 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500">
        <input
          type="checkbox"
          checked={selectedIds.size === items.length && items.length > 0}
          onChange={toggleSelectAll}
          className="rounded flex-shrink-0"
        />
        <span className="w-14 flex-shrink-0">封面</span>
        <span className="flex-1 min-w-0">改写内容</span>
        <span className="w-16 flex-shrink-0 text-right">价格</span>
        <span className="w-20 flex-shrink-0">账号</span>
        <span className="w-44 flex-shrink-0">创作进度</span>
        <span className="w-16 flex-shrink-0">状态</span>
        <span className="w-12 flex-shrink-0 text-right">操作</span>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无发布实例</div>
        ) : (
          items.map(item => {
            const statusInfo = STATUS_LABELS[item.status] ?? { label: item.status, color: 'text-gray-400' }
            const accountName = accounts.find(a => a.uid === item.account_uid)?.name ?? item.account_uid
            const isSelected = selectedItemId === item.id

            return (
              <div
                key={item.id}
                className={`
                  flex items-center gap-3 px-4 py-2 border-b text-xs
                  ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  ${selectedIds.has(item.id) ? 'bg-blue-50/50' : ''}
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="rounded flex-shrink-0"
                />

                {/* 封面图 */}
                <div className="w-14 flex-shrink-0">
                  {item.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_image.startsWith('data:') ? item.cover_image : `data:image/jpeg;base64,${item.cover_image}`}
                      alt="封面"
                      className="w-12 h-12 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-400"
                      onClick={() => setLightboxSrc(item.cover_image)}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-lg">
                      📷
                    </div>
                  )}
                </div>

                {/* 改写内容摘要 */}
                <div className="flex-1 min-w-0 text-gray-700 truncate" title={item.description}>
                  {item.description ? truncateDescription(item.description) : (
                    <span className="text-gray-300">（空）</span>
                  )}
                </div>

                {/* 价格 */}
                <div className="w-16 flex-shrink-0 text-right text-gray-700">
                  {item.price > 0 ? `￥${item.price}` : '-'}
                </div>

                {/* 账号 */}
                <div className="w-20 flex-shrink-0 text-gray-600 truncate" title={accountName}>
                  {accountName}
                </div>

                {/* 创作进度 */}
                <div className="w-44 flex-shrink-0">
                  <CreationProgressBar
                    status={item.status}
                    onStageClick={stage => handleStageClick(item, stage)}
                    size="sm"
                  />
                </div>

                {/* 状态 */}
                <div className={`w-16 flex-shrink-0 text-xs ${statusInfo.color}`}>
                  {statusInfo.label}
                </div>

                {/* 操作 */}
                <div className="w-12 flex-shrink-0 text-right">
                  <button
                    onClick={() => onEditItem(item)}
                    className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                  >
                    编辑
                  </button>
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

      {/* 灯箱 */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}
