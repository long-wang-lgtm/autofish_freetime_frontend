'use client'

import { MaterialImageCell } from './MaterialImageCell'
import { ProgressActionCell } from './ProgressActionCell'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { deleteMaterial, triggerWork, publishMaterial, editMaterial } from '@/lib/api/batch-publish'
import { getChannel } from '@/lib/api/batch-publish'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toaster'
import { useState } from 'react'
import type { PublishMaterial, MaterialListResponse, MaterialImage, RewriteStage, ChannelItemResponse } from '@/lib/api/batch-publish'
import type { Account } from '@/lib/api/accounts'

interface MaterialCardProps {
  materialId: number
  selectedOid: number | undefined
  onOpenSheet: (id: number) => void
}

export function MaterialCard({ materialId, selectedOid, onOpenSheet }: MaterialCardProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showDelete, setShowDelete] = useState(false)

  const cached = queryClient.getQueryData<MaterialListResponse>(['batch-publish', 'materials', selectedOid])
  const material = cached?.items.find(m => m.id === materialId)

  const accounts = queryClient.getQueryData<Account[]>(['accounts'])
  const activeAccounts = (accounts ?? []).filter(a => a.status === 1)

  const { data: channels = [], refetch: refetchChannels } = useQuery<ChannelItemResponse[]>({
    queryKey: ['batch-publish', 'channel', materialId],
    queryFn: () => getChannel(materialId),
    enabled: !!material?.to_uid && !!material?.description && !material?.category,
    staleTime: 10 * 60 * 1000,
  })

  if (!material) return null

  const handleImagesChange = (images: MaterialImage[]) => {
    queryClient.setQueryData<MaterialListResponse>(
      ['batch-publish', 'materials', selectedOid],
      (old) => old ? {
        ...old,
        items: old.items.map(m => m.id === materialId ? { ...m, images } : m)
      } : old
    )
  }

  const handleTriggerWork = async (stage: RewriteStage) => {
    try {
      await triggerWork(materialId, stage)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '操作完成', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `操作失败：${(err as Error)?.message || ''}`, variant: 'error' })
    }
  }

  const handlePublish = async () => {
    try {
      await publishMaterial(materialId)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '发布成功', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `发布失败：${(err as Error)?.message || ''}`, variant: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMaterial(materialId)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '素材已删除', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `删除失败：${(err as Error)?.message || ''}`, variant: 'error' })
    }
    setShowDelete(false)
  }

  const handleAccountChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const val = e.target.value
    try {
      await editMaterial({ id: materialId, to_uid: val || undefined })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      if (val) {
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'channel', materialId] })
      }
    } catch { /* silent */ }
  }

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    try {
      await editMaterial({ id: materialId, category: e.target.value || undefined })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch { /* silent */ }
  }

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl p-3 space-y-3 cursor-pointer hover:border-blue-300 transition-colors"
        onClick={() => onOpenSheet(materialId)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <MaterialImageCell
            images={material.images ?? []}
            materialId={materialId}
            toUid={material.to_uid}
            onImagesChange={handleImagesChange}
          />
        </div>

        <p className="text-sm text-gray-800 line-clamp-2">
          {material.description || '(无描述)'}
        </p>

        {/* 🎨 封面提示词 */}
        <p className="text-xs text-gray-500 truncate">
          {material.produceState?.coverprompt || '（未设置封面提示词）'}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            ¥{material.price != null ? material.price.toFixed(2) : '-'}
          </span>

          <select
            value={material.to_uid ?? ''}
            onChange={handleAccountChange}
            onClick={(e) => e.stopPropagation()}
            className="h-8 px-2 py-1 text-xs border border-gray-200 rounded bg-white"
          >
            <option value="">未选择</option>
            {activeAccounts.map((a) => (
              <option key={a.uid} value={a.uid}>{a.name}</option>
            ))}
          </select>

          <select
            value={material.category ?? ''}
            onChange={handleCategoryChange}
            onMouseDown={() => {
              if (material.to_uid && material.category && channels.length === 0) {
                refetchChannels()
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={!material.to_uid}
            className="h-8 px-2 py-1 text-xs border border-gray-200 rounded bg-white disabled:opacity-50 disabled:bg-gray-50"
          >
            <option value="">{material.to_uid ? '请选择' : '请先选账号'}</option>
            {channels.length === 0 && material.category ? (
              <option value={material.category}>{material.category}</option>
            ) : (
              channels.map((ch) => (
                <option key={ch.channelCateId} value={ch.channelCateName}>{ch.channelCateName}</option>
              ))
            )}
          </select>

        </div>

        <div className="flex items-center justify-between">
          <div onClick={(e) => e.stopPropagation()}>
            <ProgressActionCell
              status={material.status}
              onTriggerWork={handleTriggerWork}
              onPublish={handlePublish}
              isAnyLoading={false}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            title="删除"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="删除素材"
        description={`确定要删除素材 #${materialId} 吗？`}
        confirmLabel="删除"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
