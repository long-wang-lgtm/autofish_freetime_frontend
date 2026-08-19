'use client'

import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { OpportunityListPanel } from './OpportunityListPanel'
import type { OpportunityItem } from '@/lib/api/batch-publish'

/**
 * 切换商机弹窗（v6 唯一新增弹窗）— 轻量容器
 *
 * PC：居中 Modal（lg）｜移动端：BottomSheet
 * 内容复用 OpportunityListPanel picker 变体：纯选择器，隐藏新建/编辑/删除，
 * 行点击调 onPick(oid) 后由父组件关闭弹窗并切换 URL。
 */

interface OpportunitySwitchModalProps {
  open: boolean
  onClose: () => void
  opportunities: OpportunityItem[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  onPageChange: (p: number) => void
  search: string
  onSearchChange: (v: string) => void
  status: string
  onStatusChange: (v: string) => void
  summaryStatus: string
  onSummaryStatusChange: (v: string) => void
  /** 当前商机（picker 内高亮） */
  selectedOid: number | undefined
  /** 选中即切换商机（父组件：set oid + 关弹窗 + push URL） */
  onPick: (oid: number) => void
  /** rejected「待重提炼」徽章点击 → 先关弹窗再切换商机 + 聚焦判定区 */
  onFocusReview?: (oid: number) => void
}

export function OpportunitySwitchModal({
  open,
  onClose,
  opportunities, total, isLoading, error, onRetry,
  page, onPageChange,
  search, onSearchChange, status, onStatusChange, summaryStatus, onSummaryStatusChange,
  selectedOid, onPick, onFocusReview,
}: OpportunitySwitchModalProps) {
  const isMobile = useIsMobile()

  const picker = (
    <OpportunityListPanel
      variant="picker"
      opportunities={opportunities}
      total={total}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      page={page}
      onPageChange={onPageChange}
      search={search}
      onSearchChange={onSearchChange}
      status={status}
      onStatusChange={onStatusChange}
      summaryStatus={summaryStatus}
      onSummaryStatusChange={onSummaryStatusChange}
      selectedOid={selectedOid}
      onSelectOid={onPick}
      onPick={onPick}
      onFocusReview={onFocusReview}
      onCreateOpportunity={() => {}}
      onUpdateOpportunity={() => {}}
      onDeleteOpportunity={() => {}}
      isMutating={false}
    />
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title="切换商机" subtitle="选择一个商机进入详情">
        <div className="h-[60vh]">{picker}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="切换商机" size="lg">
      <div className="h-[60vh]">{picker}</div>
    </Modal>
  )
}
