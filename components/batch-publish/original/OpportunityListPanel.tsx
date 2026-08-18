'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useIsMobile } from '@/hooks/useIsMobile'
import { OPPORTUNITY_STATUS_CONFIG, OPPORTUNITY_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'
import { OpportunityForm } from './OpportunityForm'
import { fmtPrice } from '@/lib/utils/format'
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
  selectedOid: number | undefined
  onSelectOid: (oid: number) => void
  onCreateOpportunity: (values: OpportunityParams) => void
  onUpdateOpportunity: (oid: number, values: Partial<OpportunityParams>) => void
  onDeleteOpportunity: (oid: number) => void
  isMutating: boolean
}

/** article = 「标题行 + 正文」，列表行取首行为文章标题 */
function getArticleTitle(article: string): string {
  return article.trim().split('\n')[0]?.trim() ?? ''
}

/** summary_status 角标（user_confirmed 为默认态，不显示角标） */
function renderSummaryBadge(item: OpportunityItem, onSelectOid: (oid: number) => void): React.ReactNode | null {
  if (!item.summary) return null
  switch (item.summary_status) {
    case 'operator_verified':
      return <span className="text-xs font-medium text-green-700 flex-shrink-0">已验证</span>
    case 'rejected':
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onSelectOid(item.id) }}
          className="text-xs font-medium text-red-600 hover:underline flex-shrink-0"
          title="该提炼被判为不合格，点击打开资料卡判定区重新提炼"
        >
          待重提炼
        </button>
      )
    case 'ai_draft':
      return <span className="text-xs text-gray-500 flex-shrink-0">AI 提炼</span>
    default:
      return null
  }
}

export function OpportunityListPanel({
  opportunities, total, isLoading, error, onRetry,
  page, onPageChange,
  search, onSearchChange, status, onStatusChange,
  selectedOid, onSelectOid,
  onCreateOpportunity, onUpdateOpportunity, onDeleteOpportunity,
  isMutating,
}: OpportunityListPanelProps) {
  const isMobile = useIsMobile()
  const [editingItem, setEditingItem] = useState<OpportunityItem | null>(null)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OpportunityItem | null>(null)

  const handleEdit = (item: OpportunityItem) => {
    setEditingItem(item)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    setSheetMode('create')
    setSheetOpen(true)
  }

  const editorTitle = sheetMode === 'create' ? '新建商机' : '编辑商机'

  // 弹窗打开时才挂载表单：确保 OpportunityForm 的「刷新恢复草稿」检查在每次打开时触发
  // （常驻渲染时 useEffect([]) 只在页面加载执行一次，打开弹窗不会重新查草稿）
  const formContent = sheetOpen ? (
    <OpportunityForm
      defaultValues={editingItem ?? undefined}
      onSubmit={(values) => {
        if (sheetMode === 'create') {
          onCreateOpportunity(values)
        } else if (editingItem) {
          onUpdateOpportunity(editingItem.id, values)
        }
        setSheetOpen(false)
      }}
      isPending={isMutating}
      submitLabel={sheetMode === 'create' ? '创建商机' : '保存修改'}
    />
  ) : null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 搜索 + 筛选 + 新建 */}
      <div className="p-3 space-y-2 border-b border-gray-100 flex-shrink-0">
        <input
          type="text"
          placeholder="搜索商机..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-1">
            {OPPORTUNITY_STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                  status === opt.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            + 新建
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <ErrorBanner variant="inline" message="加载失败" onRetry={onRetry} />
        ) : opportunities.length === 0 ? (
          <EmptyState size="sm" title="暂无商机" description="点击「+ 新建」创建第一个商机" />
        ) : (
          opportunities.map((item) => {
            const isSelected = item.id === selectedOid
            return (
              <div
                key={item.id}
                onClick={() => onSelectOid(item.id)}
                className={`px-3 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer ${
                  isSelected ? 'border-l-2 border-l-blue-600 bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium line-clamp-1 ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {item.name || '未命名商机'}
                    </p>
                    {item.summary && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={item.summary.article}>
                        {getArticleTitle(item.summary.article)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {renderSummaryBadge(item, onSelectOid)}
                    {isSelected && (
                      <span className="text-blue-600 text-xs">✓</span>
                    )}
                  </div>
                </div>

                {/* 底部信息 + 操作按钮 */}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    <span>📦 {item.monitoredItemCount ?? 0}</span>
                    <span>📝 {item.materialCount ?? 0}</span>
                    {(item.price ?? 0) > 0 && <span>{fmtPrice(item.price!)}</span>}
                    <StatusBadge status={item.status} config={OPPORTUNITY_STATUS_CONFIG} />
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
      </div>

      {/* 新建/编辑商机 — PC 居中 Modal，移动端 BottomSheet */}
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
    </div>
  )
}
