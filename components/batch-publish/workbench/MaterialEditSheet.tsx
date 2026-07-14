'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import { useIsMobile } from '@/hooks/useIsMobile'
import { listMonitoredItems } from '@/lib/api/batch-publish'
import { uploadFileToFlare, imageDisplayUrl } from '@/lib/api/upload'
import { fmtGrowth, fmtNumber } from '@/lib/utils/format'
import type { MaterialListResponse, MonitoredItem, TemplateType, MaterialImage } from '@/lib/api/batch-publish'
import type { MaterialImage as UploadMaterialImage } from '@/lib/api/upload'

interface MaterialEditSheetProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
}

export function MaterialEditSheet({ materialId, selectedOid, open, onClose }: MaterialEditSheetProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { editMaterialMutation, updateContextMutation } = useWorkbenchMutations(selectedOid)

  // 从缓存读取素材数据
  const cached = queryClient.getQueryData<MaterialListResponse>(['batch-publish', 'materials', selectedOid])
  const materials = cached?.items ?? []
  const material = materialId ? materials.find(m => m.id === materialId) : null

  // 表单字段
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<MaterialImage[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [templateType, setTemplateType] = useState<TemplateType>('only_opportunity')
  const [selectedGids, setSelectedGids] = useState<string[]>([])

  // 监控商品列表
  const [monitoredItems, setMonitoredItems] = useState<MonitoredItem[]>([])

  // 初始化表单
  useEffect(() => {
    if (material) {
      setDescription(material.description ?? '')
      setImages(material.images ?? [])
      setTemplateType((material.ai_context?.template as TemplateType) ?? 'only_opportunity')
      setSelectedGids(material.ai_context?.items ?? [])
    }
  }, [material])

  // 加载监控商品
  useEffect(() => {
    if (selectedOid && open) {
      listMonitoredItems({ oid: selectedOid, page_size: 100 }).then(res => {
        setMonitoredItems(res.items ?? [])
      }).catch(() => {})
    }
  }, [selectedOid, open])

  if (!material) return null

  // ---- Image management ----
  const handleImageUpload = async (file: File) => {
    setUploadingIndex(images.length)
    try {
      const uploaded = await uploadFileToFlare(file, material.to_uid ?? undefined)
      setImages(prev => [...prev, uploaded as MaterialImage])
    } catch {
      // silent
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleImageDelete = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleImageMoveUp = (index: number) => {
    if (index <= 0) return
    setImages(prev => {
      const next = [...prev]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      return next
    })
  }

  const handleImageMoveDown = (index: number) => {
    if (index >= images.length - 1) return
    setImages(prev => {
      const next = [...prev]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      return next
    })
  }

  const handleSaveMaterial = () => {
    editMaterialMutation.mutate({
      id: material.id,
      description: description || undefined,
      images: images.length > 0 ? images : undefined,
    })
  }

  const handleSaveContext = () => {
    updateContextMutation.mutate({
      id: material.id,
      templateType,
      gids: templateType === 'with_item' ? selectedGids : undefined,
    })
  }

  const toggleGid = (gid: string) => {
    setSelectedGids(prev =>
      prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid]
    )
  }

  const isSaving = editMaterialMutation.isPending || updateContextMutation.isPending
  const padding = isMobile ? 'p-4' : 'p-6'

  const formContent = (
    <div className={`flex-1 overflow-y-auto ${padding} space-y-6`}>
      {/* 商品图片 */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">商品图片</h4>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.md5 || i} className="relative group">
              <img
                src={imageDisplayUrl(img as UploadMaterialImage) || undefined}
                alt=""
                className="w-[120px] h-[120px] object-cover rounded-lg border border-gray-200"
                loading="lazy"
              />
              <div className="absolute top-0 right-0 p-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleImageMoveUp(i)}
                  disabled={i === 0}
                  className="w-5 h-5 bg-white/90 rounded text-gray-600 text-xs disabled:opacity-30"
                  title="上移"
                >↑</button>
                <button
                  onClick={() => handleImageMoveDown(i)}
                  disabled={i === images.length - 1}
                  className="w-5 h-5 bg-white/90 rounded text-gray-600 text-xs disabled:opacity-30"
                  title="下移"
                >↓</button>
                <button
                  onClick={() => handleImageDelete(i)}
                  className="w-5 h-5 bg-red-500 text-white rounded text-xs"
                  title="删除"
                >×</button>
              </div>
            </div>
          ))}
          {images.length < 8 && (
            <label className="w-[120px] h-[120px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
              {uploadingIndex !== null ? (
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-2xl">+</span>
                  <span className="text-xs mt-1">上传图片</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
        <p className="text-xs text-gray-400">最多 8 张，支持 JPG/PNG/WebP，单张不超过 10MB</p>
      </section>

      {/* 描述 */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">描述文案</h4>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          style={{ minHeight: 200 }}
          placeholder="商品描述文案"
        />
      </section>

      {/* AI 上下文配置 */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">AI 上下文配置</h4>

        <div>
          <label className="text-sm font-medium text-gray-700">注入模板</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as TemplateType)}
            className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="only_opportunity">{TEMPLATE_TYPE_LABELS.only_opportunity}</option>
            <option value="with_item">{TEMPLATE_TYPE_LABELS.with_item}</option>
          </select>
        </div>

        {templateType === 'with_item' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              注入监控商品（{selectedGids.length} 个已选）
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {monitoredItems.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">该商机下暂无绑定商品</p>
              ) : (
                monitoredItems.map((item) => (
                  <label
                    key={item.gid}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGids.includes(item.gid)}
                      onChange={() => toggleGid(item.gid)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-gray-700 line-clamp-1">{item.title || item.gid}</span>
                    {item.wantSlope != null && (
                      <span className={`text-xs tabular-nums ${item.wantSlope >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtGrowth(item.wantSlope)}
                      </span>
                    )}
                    {item.wantAvg != null && (
                      <span className="text-xs text-gray-500 tabular-nums">{fmtNumber(item.wantAvg)}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 leading-relaxed">
          {templateType === 'only_opportunity'
            ? '将注入：仅商机信息'
            : `将注入：商机信息 + ${selectedGids.length} 个监控商品${
              selectedGids.length > 0
                ? '（' + selectedGids.map(g => {
                    const found = monitoredItems.find(m => m.gid === g)
                    return found?.title ?? g
                  }).join('、') + '）'
                : ''
            }`
          }
        </p>

        <button
          onClick={handleSaveContext}
          disabled={isSaving}
          className="h-10 px-5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {updateContextMutation.isPending ? '保存中...' : '保存 AI 上下文'}
        </button>
      </section>

      {/* 保存素材 */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={handleSaveMaterial}
          disabled={isSaving}
          className="flex-1 h-10 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {editMaterialMutation.isPending ? '保存中...' : '保存素材'}
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={`编辑素材 #${material.id}`}
        heightRatio={0.85}
      >
        {formContent}
      </BottomSheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`编辑素材 #${material.id}`}
      subtitle={material.description?.slice(0, 40) ?? ''}
      width="500px"
    >
      {formContent}
    </Sheet>
  )
}
