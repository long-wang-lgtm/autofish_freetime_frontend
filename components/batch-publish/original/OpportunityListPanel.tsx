'use client'

import { useState } from 'react'
import { Pagination } from '@/components/ui/data/Pagination'
import { DataTable } from '@/components/ui/data/DataTable'
import type { DataTableColumn } from '@/components/ui/data/DataTable'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useIsMobile } from '@/hooks/useIsMobile'
import { fmtRelative } from '@/lib/utils/format'
import {
  OPPORTUNITY_STATUS_FILTER_OPTIONS,
  OPPORTUNITY_SUMMARY_STATUS_FILTER_OPTIONS,
} from '@/components/batch-publish/shared/constants'
import { OpportunityForm } from './OpportunityForm'
import type { OpportunityItem, OpportunityParams } from '@/lib/api/batch-publish'

interface OpportunityListPanelProps {
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
  /** 提炼状态筛选（见 OPPORTUNITY_SUMMARY_STATUS_FILTER_OPTIONS） */
  summaryStatus: string
  onSummaryStatusChange: (v: string) => void
  selectedOid: number | undefined
  onSelectOid: (oid: number) => void
  onCreateOpportunity: (values: OpportunityParams) => void
  onUpdateOpportunity: (oid: number, values: Partial<OpportunityParams>) => void
  onDeleteOpportunity: (oid: number) => void
  isMutating: boolean
  /** manage=全宽管理列表（含新建/编辑/删除）；picker=纯选择器（隐藏管理操作，行点击调 onPick） */
  variant?: 'manage' | 'picker'
  /** picker 模式行点击（选中即切换） */
  onPick?: (oid: number) => void
  /** rejected「待重提炼」徽章点击 → 选中商机 + 聚焦判定区 */
  onFocusReview?: (oid: number) => void
}

/** summary_status 角标 — 四态常驻：未提炼（summary 空）/ user_confirmed / operator_verified / rejected */
function renderSummaryBadge(item: OpportunityItem, onRejected: () => void): React.ReactNode {
  if (!item.summary) {
    return <span className="text-xs font-medium text-gray-400">未提炼</span>
  }
  switch (item.summary_status) {
    case 'operator_verified':
      return <span className="text-xs font-medium text-green-700">已验证</span>
    case 'user_confirmed':
      return <span className="text-xs font-medium text-green-600">用户已确认</span>
    case 'rejected':
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onRejected() }}
          className="text-xs font-medium text-red-600 hover:underline"
          title="该提炼被判为不合格，点击打开资料卡判定区重新提炼"
        >
          待重提炼
        </button>
      )
    case 'ai_draft':
      return <span className="text-xs text-gray-500">AI 提炼</span>
    default:
      return null
  }
}

/**
 * 分发进度列 — 两行微布局：第一行总数 + 色点数字，第二行分段条。
 * 处理中 = boundCount − publishedCount − failedCount（已绑定但未到终态，可能为 0）。
 */
function renderDistributionProgress(item: OpportunityItem): React.ReactNode {
  const total = item.materialCount ?? 0
  const bound = item.boundCount ?? 0
  const published = item.publishedCount ?? 0
  const failed = item.failedCount ?? 0
  const unassigned = item.unassignedCount ?? 0
  const processing = bound - published - failed

  // 总数 0：整列灰色「-」，不放条、不放数字
  if (total <= 0) {
    return <span className="text-sm text-gray-300" title="素材 0">-</span>
  }

  // hover title 全称（0 值项不出现）
  const titleParts = [
    `素材 ${total}`,
    ...(bound > 0 ? [`已绑定 ${bound}`] : []),
    ...(published > 0 ? [`已发布 ${published}`] : []),
    ...(failed > 0 ? [`发布失败 ${failed}`] : []),
    ...(unassigned > 0 ? [`未绑定 ${unassigned}`] : []),
    ...(processing > 0 ? [`处理中 ${processing}`] : []),
  ].join(' · ')

  return (
    <div className="min-w-0 w-full" title={titleParts}>
      {/* 第一行：总数 + 色点数字（已发布=绿 / 发布失败=红 / 未绑定=灰，0 值不渲染） */}
      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
        <span className="text-sm text-gray-700 tabular-nums">{total}</span>
        {published > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
            <span className="text-xs text-green-600 tabular-nums">{published}</span>
          </span>
        )}
        {failed > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
            <span className="text-xs text-red-600 tabular-nums">{failed}</span>
          </span>
        )}
        {unassigned > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" aria-hidden="true" />
            <span className="text-xs text-gray-500 tabular-nums">{unassigned}</span>
          </span>
        )}
      </div>
      {/* 第二行：分段条（绿=已发布 / 红=发布失败 / 蓝=处理中 / 灰=未绑定，0 值不渲染段） */}
      <div className="mt-1 h-1.5 rounded-full overflow-hidden flex">
        {published > 0 && <div className="bg-green-500" style={{ flexGrow: published }} />}
        {failed > 0 && <div className="bg-red-500" style={{ flexGrow: failed }} />}
        {processing > 0 && <div className="bg-blue-400" style={{ flexGrow: processing }} />}
        {unassigned > 0 && <div className="bg-gray-300" style={{ flexGrow: unassigned }} />}
      </div>
    </div>
  )
}

export function OpportunityListPanel({
  opportunities, total, isLoading, error, onRetry,
  page, onPageChange,
  search, onSearchChange, status, onStatusChange, summaryStatus, onSummaryStatusChange,
  selectedOid, onSelectOid,
  onCreateOpportunity, onUpdateOpportunity, onDeleteOpportunity,
  isMutating,
  variant = 'manage', onPick, onFocusReview,
}: OpportunityListPanelProps) {
  const isMobile = useIsMobile()
  const isPicker = variant === 'picker'

  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OpportunityItem | null>(null)

  const handleCreate = () => {
    setSheetOpen(true)
  }

  /** 行点击：picker 走 onPick，manage 走 onSelectOid */
  const handleRowClick = (item: OpportunityItem) => {
    if (isPicker) {
      onPick?.(item.id)
    } else {
      onSelectOid(item.id)
    }
  }

  const editorTitle = '新建商机'

  // ---- 表格列定义 — manage 与 picker 共用列结构，picker 隐藏操作列 ----
  // 用项目标准 DataTable（gridTemplateColumns 定义列宽比例，不硬编码 px）
  const columns: DataTableColumn<OpportunityItem>[] = [
    {
      key: 'name',
      header: '商机线索',
      align: 'left',
      render: (item) => (
        <span className={`text-sm font-medium line-clamp-1 ${item.id === selectedOid ? 'text-blue-700' : 'text-gray-800'}`}>
          {item.name || '未命名商机'}
        </span>
      ),
    },
    {
      key: 'description',
      header: '商机描述',
      align: 'left',
      render: (item) => (
        <div className="min-w-0 flex items-start gap-1.5">
          {/* 提炼状态徽章 — 附属信息，作为描述开头同行展示 */}
          <span className="flex-shrink-0">
            {renderSummaryBadge(item, () => {
              if (onFocusReview) onFocusReview(item.id)
              else handleRowClick(item)
            })}
          </span>
          {item.summary && (
            <>
              <span className="text-gray-300 flex-shrink-0 text-xs leading-5" aria-hidden="true">|</span>
              <span className="block text-xs text-gray-500 line-clamp-2 break-words min-w-0 flex-1" title={item.summary.article}>
                {item.summary.article.slice(0, 60)}
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'distribution',
      header: '分发进度',
      align: 'center',
      render: (item) => renderDistributionProgress(item),
    },
    {
      key: 'updatedAt',
      header: '更新时间',
      align: 'center',
      render: (item) => (
        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
          {item.updated_at ? fmtRelative(item.updated_at) : '-'}
        </span>
      ),
    },
  ]

  // 操作列（manage 模式）：仅删除（编辑入口在详情页左栏常驻编辑；picker 模式隐藏整列）
  if (!isPicker) {
    columns.push({
      key: 'actions',
      header: '操作',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-0.5">
          <button
            onClick={() => setDeleteTarget(item)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    })
  }

  // 列宽比例（gridTemplateColumns）：五列均配 1fr 起步，描述是主体略宽（1.5fr），前后列不再克扣
  // 线索 1fr · 描述 1.5fr · 分发 1fr · 时间 1fr · 操作 1fr
  // manage：1fr 1.5fr 1fr 1fr 1fr
  // picker：1fr 1.5fr 1fr 1fr
  const gridTemplateColumns = isPicker
    ? '1fr 1.5fr 1fr 1fr'
    : '1fr 1.5fr 1fr 1fr 1fr'

  // 弹窗打开时才挂载表单：确保 OpportunityForm 的「刷新恢复草稿」检查在每次打开时触发
  // （常驻渲染时 useEffect([]) 只在页面加载执行一次，打开弹窗不会重新查草稿）
  const formContent = sheetOpen ? (
    <OpportunityForm
      onSubmit={(values) => {
        onCreateOpportunity(values)
        setSheetOpen(false)
      }}
      isPending={isMutating}
      submitLabel="创建商机"
    />
  ) : null

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* 工具条（单行）：搜索 + 启用状态下拉 + 提炼状态下拉 + 新建 */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索商机名"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 启用状态筛选 */}
          <label className="flex items-center gap-1 h-10 pl-2.5 pr-1 border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 flex-shrink-0 cursor-pointer">
            <span className="hidden sm:inline text-xs text-gray-500 whitespace-nowrap">启用状态</span>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="h-full bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              {OPPORTUNITY_STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          {/* 提炼状态筛选 */}
          <label className="flex items-center gap-1 h-10 pl-2.5 pr-1 border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 flex-shrink-0 cursor-pointer">
            <span className="hidden sm:inline text-xs text-gray-500 whitespace-nowrap">提炼状态</span>
            <select
              value={summaryStatus}
              onChange={(e) => onSummaryStatusChange(e.target.value)}
              className="h-full bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              {OPPORTUNITY_SUMMARY_STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          {/* 新建商机 — picker 模式隐藏 */}
          {!isPicker && (
            <button
              onClick={handleCreate}
              className="h-10 px-3.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              + 新建商机
            </button>
          )}
        </div>
      </div>

      {/* 商机表格（DataTable，grid 布局） */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={opportunities}
          keyExtractor={(item) => String(item.id)}
          gridTemplateColumns={gridTemplateColumns}
          isLoading={isLoading}
          error={error}
          errorMessage="加载失败"
          onRetry={onRetry}
          emptyTitle="暂无商机"
          emptyDescription={isPicker ? '没有符合条件的商机' : '点击「+ 新建商机」创建第一个商机'}
          emptyAction={!isPicker ? { label: '新建商机', onClick: handleCreate } : undefined}
          onRowClick={(item) => handleRowClick(item)}
          rowClassName={(item) => (item.id === selectedOid ? 'bg-blue-50/50' : '')}
          stickyHeader
          className="h-full"
        />
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
      </div>

      {/* 新建/编辑商机 — 仅 manage 模式；PC 居中 Modal，移动端 BottomSheet */}
      {!isPicker && (
        <>
          {isMobile ? (
            <BottomSheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              title={editorTitle}
            >
              <div className="p-4">{formContent}</div>
            </BottomSheet>
          ) : (
            <Modal
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              title={editorTitle}
              size="md"
            >
              {formContent}
            </Modal>
          )}

          {/* 删除确认 */}
          <ConfirmDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
            title="删除商机"
            description={
              (deleteTarget?.materialCount ?? 0) > 0
                ? `该商机下有 ${deleteTarget!.materialCount} 份素材将被一并删除，确定删除吗？`
                : `确定要删除商机「${deleteTarget?.name ?? ''}」吗？`
            }
            confirmLabel="删除"
            variant="danger"
            loading={isMutating}
            onConfirm={() => {
              if (deleteTarget) {
                onDeleteOpportunity(deleteTarget.id)
                setDeleteTarget(null)
              }
            }}
          />
        </>
      )}
    </div>
  )
}
