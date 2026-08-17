'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  listOpportunities,
  listMonitoredItems,
  type OpportunityItem,
  type MonitoredItem,
} from '@/lib/api/batch-publish'

interface SourcePickerModalProps {
  open: boolean
  onClose: () => void
  /** 「下一步」回调——把勾选的商机与选品交给父组件 */
  onConfirm: (opps: OpportunityItem[], items: MonitoredItem[]) => void
}

/**
 * 跨源批量创建入口 — 源选择弹窗。
 * 商机 + 选品两个多选区，可混合勾选后进入 CreateMaterialModal 批量创建。
 */
export function SourcePickerModal({ open, onClose, onConfirm }: SourcePickerModalProps) {
  const isMobile = useIsMobile()
  const [selectedOppIds, setSelectedOppIds] = useState<Set<number>>(new Set())
  const [selectedItemGids, setSelectedItemGids] = useState<Set<string>>(new Set())

  // 每次打开重置勾选
  useEffect(() => {
    if (open) {
      setSelectedOppIds(new Set())
      setSelectedItemGids(new Set())
    }
  }, [open])

  // 仅在打开时拉取（cache 命中后复用，批量创建后由前缀 invalidate 刷新）
  const { data: oppData } = useQuery({
    queryKey: ['batch-publish', 'opportunities', 'picker'],
    queryFn: () => listOpportunities({ page_size: 100 }),
    enabled: open,
  })
  const { data: itemData } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', 'picker'],
    queryFn: () => listMonitoredItems({ page_size: 100 }),
    enabled: open,
  })

  const opps = oppData?.items ?? []
  const items = itemData?.items ?? []
  const count = selectedOppIds.size + selectedItemGids.size

  const toggleOpp = (id: number) => {
    setSelectedOppIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleItem = (gid: string) => {
    setSelectedItemGids((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid); else next.add(gid)
      return next
    })
  }

  const handleNext = () => {
    onConfirm(
      opps.filter((o) => selectedOppIds.has(o.id)),
      items.filter((i) => selectedItemGids.has(i.gid)),
    )
  }

  // checkbox 行 — h-11 保证 ≥44px 触控目标，整行可点
  const checkboxRow = (checked: boolean, onToggle: () => void, label: ReactNode) => (
    <label className="flex items-center gap-3 h-11 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
      />
      <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{label}</span>
    </label>
  )

  const section = (title: string, children: ReactNode) => (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
        {children}
      </div>
    </div>
  )

  const content = (
    <div className="space-y-4">
      {section(
        '商机',
        opps.length === 0
          ? <p className="px-3 py-4 text-sm text-gray-400 text-center">暂无商机</p>
          : opps.map((o) => (
              <div key={o.id}>
                {checkboxRow(
                  selectedOppIds.has(o.id),
                  () => toggleOpp(o.id),
                  <span className="flex items-center gap-2">
                    <span className="truncate">{o.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">#{o.id}</span>
                  </span>,
                )}
              </div>
            )),
      )}
      {section(
        '选品',
        items.length === 0
          ? <p className="px-3 py-4 text-sm text-gray-400 text-center">暂无监控选品</p>
          : items.map((i) => (
              <div key={i.gid}>
                {checkboxRow(
                  selectedItemGids.has(i.gid),
                  () => toggleItem(i.gid),
                  <span className="flex items-center gap-2">
                    <span className="truncate">{i.title || i.gid}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{i.gid}</span>
                  </span>,
                )}
              </div>
            )),
      )}
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        取消
      </button>
      <button
        onClick={handleNext}
        disabled={count === 0}
        className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        下一步：创建素材{count > 0 ? `（${count}）` : ''}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title="选择素材来源" subtitle="商机与选品可混合勾选" footer={footer}>
        <div className="p-4">{content}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="选择素材来源" size="lg" footer={footer}>
      <p className="text-sm text-gray-500 mb-4">商机与选品可混合勾选，下一步批量创建素材</p>
      {content}
    </Modal>
  )
}
