'use client'

import { useMemo, useState, useCallback } from 'react'
import { NativeTable } from '@/components/ui/data/NativeTable'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { Pagination } from '@/components/ui/data/Pagination'
import { MaterialTableRow } from '@/components/batch-publish/workbench/MaterialTableRow'
import { MaterialEditSheet } from '@/components/batch-publish/workbench/MaterialEditSheet'
import { MATERIAL_COLUMNS } from '@/components/batch-publish/workbench/materialColumns'
import { DRAFT_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'
import { useDraftsPage } from '@/hooks/batch-publish/useDraftsPage'
import { useAccounts } from '@/hooks/useAccounts'
import type { PublishMaterial } from '@/lib/api/batch-publish'

/**
 * 草稿箱表格列——素材创作行去掉多选列（草稿箱不承载批量操作），其余列与工作台一致。
 * 列顺序由单一来源 MATERIAL_COLUMNS 控制，此处仅做剔除。
 */
const DRAFT_COLUMNS = MATERIAL_COLUMNS.filter((col) => col.key !== 'checkbox')

/**
 * 草稿箱 Tab —— 把原本只嵌在工作台（按监控商品进入）的素材创作行 MaterialTableRow
 * 平铺为独立视图：跨全部监控商品展示未发布素材，可直接内联创作（改写/封面/生图/发布）。
 */
export function DraftsTab() {
  const {
    search, status, toUid, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    listQueryKey,
  } = useDraftsPage()

  // 账号筛选项——列全部账号（含已停用），否则分配给停用账号的草稿将无法筛出
  const { accounts } = useAccounts()

  const [editingId, setEditingId] = useState<number | null>(null)

  // 素材列表缓存定位——草稿箱维度（乐观更新 + 失效均命中草稿箱列表，而非工作台某 gid）
  const listPrefix = useMemo(() => ['batch-publish', 'materials', 'drafts'], [])
  const listKey = listQueryKey

  const RowWrapper = useCallback(
    ({ item, index }: { item: PublishMaterial; index: number }) => (
      <MaterialTableRow
        item={item}
        index={index}
        columns={DRAFT_COLUMNS}
        isSelected={false}
        onToggleSelect={() => {}}
        onOpenEditor={(id) => setEditingId(id)}
        selectedGid={undefined}
        materialPage={page}
        materialListKey={listKey}
        materialListPrefix={listPrefix}
      />
    ),
    [listKey, listPrefix, page],
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <SearchToolbar>
        <input
          type="text"
          placeholder="搜索描述..."
          value={search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 max-w-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
        />
        <select
          value={toUid}
          onChange={(e) => onFilterChange('toUid', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="">全部账号</option>
          {accounts.map((a) => (
            <option key={a.uid} value={a.uid}>{a.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
        >
          {DRAFT_STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SearchToolbar>

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-700">
        <div className="flex-1 min-h-0">
          <NativeTable
            columns={DRAFT_COLUMNS}
            data={data}
            keyExtractor={(m) => String(m.id)}
            isLoading={isLoading}
            error={error}
            errorMessage="加载草稿失败"
            onRetry={() => refetch()}
            emptyTitle="暂无草稿素材"
            emptyDescription="前往「商品发布」选择监控商品创建素材，未发布的素材会沉淀在这里"
            stickyHeader
            tableLayout="fixed"
            RowComponent={RowWrapper}
            onRowClick={(m) => setEditingId(m.id)}
            className="h-full"
          />
        </div>

        <div className="border-t border-gray-100 flex-shrink-0 dark:border-gray-800">
          <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
        </div>
      </div>

      {/* 行内编辑器——与工作台共用，关闭时自动保存 */}
      <MaterialEditSheet
        materialId={editingId}
        selectedGid={undefined}
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        materials={data}
        materialListPrefix={listPrefix}
      />
    </div>
  )
}
