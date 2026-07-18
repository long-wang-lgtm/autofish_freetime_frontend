'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { InlineEditCell } from './InlineEditCell'
import { MaterialImageCell } from './MaterialImageCell'
import { ProgressActionCell } from './ProgressActionCell'
import { MATERIAL_GRID_COLS } from '@/components/batch-publish/shared/constants'
import { editMaterial, getChannel, triggerWork, publishMaterial, deleteMaterial } from '@/lib/api/batch-publish'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useToast } from '@/components/ui/Toaster'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useState } from 'react'
import type { PublishMaterial, MaterialListResponse, MaterialImage, ChannelItemResponse, RewriteStage } from '@/lib/api/batch-publish'
import type { Account } from '@/lib/api/accounts'

interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenSheet: (id: number) => void
  selectedOid: number | undefined
  materialPage: number
}

export function MaterialRow({
  materialId, isSelected, onToggleSelect, onOpenSheet, selectedOid, materialPage,
}: MaterialRowProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showDelete, setShowDelete] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)

  // 1. Material data from cache
  const cached = queryClient.getQueryData<MaterialListResponse>(
    ['batch-publish', 'materials', selectedOid, { page: materialPage }]
  )
  const material = cached?.items.find(m => m.id === materialId)

  // 2. Accounts (filtered: only status === 1 = normal)
  const accounts = queryClient.getQueryData<Account[]>(['accounts'])
  const activeAccounts = (accounts ?? []).filter(a => a.status === 1)

  // 3. Channel options (lazy: only fetch when to_uid is set AND category is empty;
  //    if category already selected, defer fetch until user clicks the dropdown)
  const { data: channels = [], refetch: refetchChannels } = useQuery<ChannelItemResponse[]>({
    queryKey: ['batch-publish', 'channel', materialId],
    queryFn: () => getChannel(materialId),
    enabled: !!material?.to_uid && !!material?.description && !material?.category,
    staleTime: 10 * 60 * 1000,
  })

  if (!material) {
    return (
      <div
        className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100"
        style={{ gridTemplateColumns: MATERIAL_GRID_COLS }}
      >
        <span />
        <span />
        <span className="inline-flex items-center gap-1 text-gray-400">
          <LoadingSpinner size="sm" />
        </span>
      </div>
    )
  }

  // ---- Inline save helpers (silent — no toast on success) ----

  const optimisticUpdate = (field: string, value: unknown) => {
    queryClient.setQueryData<MaterialListResponse>(
      ['batch-publish', 'materials', selectedOid, { page: materialPage }],
      (old) => old ? {
        ...old,
        items: old.items.map(m => m.id === materialId ? { ...m, [field]: value } : m)
      } : old
    )
  }

  const handleInlineSave = async (field: string, value: unknown) => {
    setSavingField(field)
    // to_uid 不乐观更新 — getChannel 须在后端确认 + description 非空后才触发
    if (field !== 'to_uid') {
      optimisticUpdate(field, value)
    }
    try {
      await editMaterial({ id: materialId, [field]: value } as Parameters<typeof editMaterial>[0])
      if (field === 'to_uid') {
        // 后端确认后刷新素材缓存（to_uid 就绪 → enabled → getChannel 触发）
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'channel', materialId] })
      }
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: `保存失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    } finally {
      setSavingField(null)
    }
  }

  const handleImagesChange = (images: MaterialImage[]) => {
    optimisticUpdate('images', images)
  }

  const handleTriggerWork = async (stage: RewriteStage) => {
    try {
      await triggerWork(materialId, stage)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}完成`, variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `操作失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    }
  }

  const handlePublish = async () => {
    try {
      await publishMaterial(materialId)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '发布成功', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `发布失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    }
  }

  const handleDeleteMaterial = async () => {
    setSavingField('delete')
    try {
      await deleteMaterial(materialId)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '素材已删除', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `删除失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    } finally {
      setSavingField(null)
    }
    setShowDelete(false)
  }

  const isAnyLoading = savingField !== null

  // Row click: navigate to Sheet (except on interactive elements)
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('input') ||
      target.closest('select') ||
      target.closest('button') ||
      target.closest('img')
    ) return
    onOpenSheet(materialId)
  }

  return (
    <>
      <div
        className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
        style={{ gridTemplateColumns: MATERIAL_GRID_COLS }}
        onClick={handleRowClick}
      >
        {/* ☐ 复选框 */}
        <div>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(materialId)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* 🖼 封面图 */}
        <MaterialImageCell
          images={material.images ?? []}
          materialId={materialId}
          toUid={material.to_uid}
          onImagesChange={handleImagesChange}
        />

        {/* 📝 描述 */}
        <span className="text-sm text-gray-800 leading-snug line-clamp-2">
          {material.description || '(无描述)'}
        </span>

        {/* 💰 价格（行内编辑） */}
        <InlineEditCell
          value={material.price}
          onSave={(v) => handleInlineSave('price', v)}
          isSaving={savingField === 'price'}
        />

        {/* 👤 账号（行内下拉） */}
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={material.to_uid ?? ''}
            onChange={(e) => handleInlineSave('to_uid', e.target.value || undefined)}
            disabled={savingField === 'to_uid'}
            className="w-full h-8 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
          >
            <option value="">未选择</option>
            {activeAccounts.map((a) => (
              <option key={a.uid} value={a.uid}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* 📂 类目（行内下拉） — 已有类目时不自动拉取 channel，点击下拉时按需加载 */}
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={material.category ?? ''}
            onChange={(e) => handleInlineSave('category', e.target.value || undefined)}
            onMouseDown={() => {
              // Lazy-load channel options on first interaction when category is already set
              if (material.to_uid && material.category && channels.length === 0) {
                refetchChannels()
              }
            }}
            disabled={!material.to_uid || savingField === 'category'}
            className="w-full h-8 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:bg-gray-50"
          >
            <option value="">{material.to_uid ? '请选择' : '请先选账号'}</option>
            {/* Fallback: when channels haven't loaded yet but category is set,
                render the current value so the select doesn't appear blank */}
            {channels.length === 0 && material.category ? (
              <option value={material.category}>{material.category}</option>
            ) : (
              channels.map((ch) => (
                <option key={ch.channelCateId} value={ch.channelCateName}>{ch.channelCateName}</option>
              ))
            )}
          </select>
        </div>

        {/* 📊 进度+操作 */}
        <ProgressActionCell
          status={material.status}
          onTriggerWork={handleTriggerWork}
          onPublish={handlePublish}
          isAnyLoading={isAnyLoading}
        />

        {/* 🗑 删除 */}
        <div className="flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            title="删除素材"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="删除素材"
        description={`确定要删除素材 #${materialId} 吗？此操作不可撤销。`}
        confirmLabel="删除"
        variant="danger"
        loading={savingField === 'delete'}
        onConfirm={handleDeleteMaterial}
      />
    </>
  )
}
