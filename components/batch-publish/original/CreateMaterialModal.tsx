'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getAccountNames, type AccountName } from '@/lib/api/accounts'
import type { OpportunityItem, MonitoredItem } from '@/lib/api/batch-publish'

/**
 * 创建素材弹窗 — 双来源
 * - opp：按商机创建
 * - item：按监控商品创建
 * - batch：按选中监控商品批量创建
 */
export type CreateMaterialSource =
  | { type: 'opp'; opportunity: OpportunityItem }
  | { type: 'item'; item: MonitoredItem }
  | { type: 'batch'; count: number }

interface CreateMaterialModalProps {
  open: boolean
  onClose: () => void
  isPending: boolean
  onCreate: (num: number, toUid?: string) => void
  /** 关闭状态下传 null，组件直接返回 null 不渲染 */
  source: CreateMaterialSource | null
}

function resolveTitle(source: CreateMaterialSource): { title: string; subtitle: string } {
  switch (source.type) {
    case 'opp':
      return { title: '创建素材', subtitle: `商机：${source.opportunity.name}` }
    case 'item':
      return { title: '创建素材', subtitle: `源商品：${source.item.title || source.item.gid}` }
    case 'batch':
      return { title: '批量创建素材', subtitle: `将批量创建 ${source.count} 个商品的素材` }
  }
}

export function CreateMaterialModal({ open, onClose, isPending, onCreate, source }: CreateMaterialModalProps) {
  const isMobile = useIsMobile()
  const [num, setNum] = useState(1)
  const [toUid, setToUid] = useState('')

  // 发布账号列表（uid → name），用于「发布账号（可选）」下拉
  const { data: accountNames = [] } = useQuery<AccountName[]>({
    queryKey: ['batch-publish', 'account-names'],
    queryFn: () => getAccountNames(),
  })

  if (!source) return null

  const { title, subtitle } = resolveTitle(source)

  const content = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">创建数量</label>
        <div className="flex items-center gap-2 mt-2">
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

      <div>
        <label className="text-sm font-medium text-gray-700">发布账号（可选）</label>
        <select
          value={toUid}
          onChange={(e) => setToUid(e.target.value)}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">暂不分配（草稿）</option>
          {accountNames.map((acc) => (
            <option key={acc.uid} value={acc.uid}>{acc.name}</option>
          ))}
        </select>
      </div>
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        disabled={isPending}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        取消
      </button>
      <button
        onClick={() => onCreate(num, toUid || undefined)}
        disabled={isPending}
        className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isPending ? '创建中...' : `创建 ${num} 份`}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
        <div className="p-4">{content}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" footer={footer}>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      {content}
    </Modal>
  )
}
