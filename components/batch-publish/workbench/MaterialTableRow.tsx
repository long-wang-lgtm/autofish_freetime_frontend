'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { InlineEditCell } from './InlineEditCell'
import { MaterialImageCell } from './MaterialImageCell'
import { ProgressActionCell } from './ProgressActionCell'
import { editMaterial, getChannel, triggerWork, publishMaterial, deleteMaterial } from '@/lib/api/batch-publish'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useToast } from '@/components/ui/Toaster'
import { useState } from 'react'
import type { PublishMaterial, MaterialListResponse, MaterialImage, ChannelItemResponse, RewriteStage } from '@/lib/api/batch-publish'
import type { Account } from '@/lib/api/accounts'

export interface MaterialTableRowProps {
  item: PublishMaterial
  index: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenEditor: (id: number) => void
  onOpenContextModal: (id: number) => void
  selectedOid: number | undefined
  materialPage: number
}

export function MaterialTableRow({
  item: material, index: _index, isSelected, onToggleSelect, onOpenEditor,
  onOpenContextModal, selectedOid, materialPage,
}: MaterialTableRowProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showDelete, setShowDelete] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)

  // 1. Accounts（仅 status === 1 = 正常）
  const accounts = queryClient.getQueryData<Account[]>(['accounts'])
  const activeAccounts = (accounts ?? []).filter(a => a.status === 1)

  // 2. Channel 选项（惰性加载：to_uid 存在且 category 为空时自动拉取；
  //    若已有 category，等用户点击下拉时再按需加载）
  const { data: channels = [], refetch: refetchChannels } = useQuery<ChannelItemResponse[]>({
    queryKey: ['batch-publish', 'channel', material.id],
    queryFn: () => getChannel(material.id),
    enabled: !!material.to_uid && !!material.description && !material.category,
    staleTime: 10 * 60 * 1000,
  })

  // ---- 行内保存辅助函数 ----

  const optimisticUpdate = (field: string, value: unknown) => {
    queryClient.setQueryData<MaterialListResponse>(
      ['batch-publish', 'materials', selectedOid, { page: materialPage }],
      (old) => old ? {
        ...old,
        items: old.items.map(m => m.id === material.id ? { ...m, [field]: value } : m)
      } : old
    )
  }

  const handleInlineSave = async (field: string, value: unknown) => {
    setSavingField(field)
    // to_uid 不乐观更新——getChannel 需等后端确认 + description 非空
    if (field !== 'to_uid') {
      optimisticUpdate(field, value)
    }
    try {
      await editMaterial({ id: material.id, [field]: value } as Parameters<typeof editMaterial>[0])
      if (field === 'to_uid') {
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'channel', material.id] })
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
      await triggerWork(material.id, stage)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}完成`, variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `操作失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    }
  }

  const handlePublish = async () => {
    try {
      await publishMaterial(material.id)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '发布成功', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `发布失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    }
  }

  const handleDeleteMaterial = async () => {
    setSavingField('delete')
    try {
      await deleteMaterial(material.id)
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

  return (
    <>
      {/* ☐ 复选框 */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(material.id)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>

      {/* 🖼 封面图 */}
      <td className="px-2 py-2 text-center">
        <MaterialImageCell
          images={material.images ?? []}
          materialId={material.id}
          toUid={material.to_uid}
          onImagesChange={handleImagesChange}
        />
      </td>

      {/* 📝 描述 */}
      <td className="px-2 py-2">
        <span className="text-sm text-gray-800 leading-snug line-clamp-2 dark:text-gray-200">
          {material.description || '(无描述)'}
        </span>
      </td>

      {/* 🎨 封面提示词 */}
      <td className="px-2 py-2">
        <span className="text-sm text-gray-800 leading-snug line-clamp-2 dark:text-gray-200">
          {material.ai_context?.coverprompt || <span className="text-gray-400">（未设置）</span>}
        </span>
      </td>

      {/* 💰 价格 */}
      <td className="px-2 py-2 text-center">
        <InlineEditCell
          value={material.price}
          onSave={(v) => handleInlineSave('price', v)}
          isSaving={savingField === 'price'}
        />
      </td>

      {/* 👤 账号 */}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <select
          value={material.to_uid ?? ''}
          onChange={(e) => handleInlineSave('to_uid', e.target.value || undefined)}
          disabled={savingField === 'to_uid'}
          className="h-8 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="">未选择</option>
          {activeAccounts.map((a) => (
            <option key={a.uid} value={a.uid}>{a.name}</option>
          ))}
        </select>
      </td>

      {/* 📂 类目 */}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <select
          value={material.category ?? ''}
          onChange={(e) => handleInlineSave('category', e.target.value || undefined)}
          onMouseDown={() => {
            if (material.to_uid && material.category && channels.length === 0) {
              refetchChannels()
            }
          }}
          disabled={!material.to_uid || savingField === 'category'}
          className="h-8 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:disabled:bg-gray-800"
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
      </td>

      {/* 🤖 AI 上下文 */}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpenContextModal(material.id)}
          className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          {material.ai_context?.template === 'with_item'
            ? `商机 + ${(material.ai_context?.items?.length ?? 0)} 商品`
            : material.ai_context?.template === 'only_opportunity'
              ? '仅商机'
              : '未配置'}
        </button>
      </td>

      {/* 📊 进度+操作 */}
      <td className="px-2 py-2 text-center">
        <ProgressActionCell
          status={material.status}
          onTriggerWork={handleTriggerWork}
          onPublish={handlePublish}
          isAnyLoading={isAnyLoading}
        />
      </td>

      {/* 🗑 删除 */}
      <td className="px-2 py-2 text-center">
        <button
          onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors dark:hover:bg-red-950"
          title="删除素材"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>

      {/* ConfirmDialog 通过 portal 渲染到 body，避免放在 <tr> 内导致无效 DOM 嵌套 */}
      {showDelete && createPortal(
        <ConfirmDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          title="删除素材"
          description={`确定要删除素材 #${material.id} 吗？此操作不可撤销。`}
          confirmLabel="删除"
          variant="danger"
          loading={savingField === 'delete'}
          onConfirm={handleDeleteMaterial}
        />,
        document.body
      )}
    </>
  )
}
