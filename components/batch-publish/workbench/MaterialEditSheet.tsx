'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useQueryClient } from '@tanstack/react-query'
import { useIsMobile } from '@/hooks/useIsMobile'
import { uploadFileToFlare, imageDisplayUrl } from '@/lib/api/upload'
import { editMaterial, updateMaterialContext } from '@/lib/api/batch-publish'
import type { MaterialImage, PublishMaterial } from '@/lib/api/batch-publish'
import type { MaterialImage as UploadMaterialImage } from '@/lib/api/upload'

interface MaterialEditSheetProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
  /** 素材列表——从父组件传入，避免缓存 key 不匹配导致读不到数据 */
  materials: PublishMaterial[]
}

export function MaterialEditSheet({ materialId, selectedOid, open, onClose, materials }: MaterialEditSheetProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()

  const material = materialId ? materials.find(m => m.id === materialId) : null

  // ---- 表单字段 ----
  const [description, setDescription] = useState('')
  const [coverprompt, setCoverprompt] = useState('')
  const [images, setImages] = useState<MaterialImage[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  // ---- 自动保存状态 ----
  const descDirtyRef = useRef(false)
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const descSavingRef = useRef(false)

  const coverDirtyRef = useRef(false)
  const coverTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const coverSavingRef = useRef(false)

  // 初始化表单
  useEffect(() => {
    if (material) {
      setDescription(material.description ?? '')
      setCoverprompt(material.ai_context?.coverprompt ?? '')
      setImages(material.images ?? [])
    }
  }, [material])

  // ---- 自动保存函数（必须在 if (!material) return null 之前） ----

  const autoSaveDesc = useCallback(async (value: string) => {
    if (!material || descSavingRef.current) return
    descSavingRef.current = true
    try {
      await editMaterial({ id: material.id, description: value || undefined })
      descDirtyRef.current = false
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch {
      // 静默处理
    } finally {
      descSavingRef.current = false
    }
  }, [material, selectedOid, queryClient])

  const autoSaveCover = useCallback(async (value: string) => {
    if (!material || coverSavingRef.current) return
    coverSavingRef.current = true
    try {
      await updateMaterialContext({ id: material.id, coverprompt: value || undefined })
      coverDirtyRef.current = false
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch {
      // 静默处理
    } finally {
      coverSavingRef.current = false
    }
  }, [material, selectedOid, queryClient])

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setDescription(v)
    descDirtyRef.current = true
    if (descTimerRef.current) clearTimeout(descTimerRef.current)
    descTimerRef.current = setTimeout(() => autoSaveDesc(v), 1000)
  }

  const handleDescBlur = () => {
    if (descTimerRef.current) { clearTimeout(descTimerRef.current); descTimerRef.current = undefined }
    if (descDirtyRef.current) autoSaveDesc(description)
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setCoverprompt(v)
    coverDirtyRef.current = true
    if (coverTimerRef.current) clearTimeout(coverTimerRef.current)
    coverTimerRef.current = setTimeout(() => autoSaveCover(v), 1000)
  }

  const handleCoverBlur = () => {
    if (coverTimerRef.current) { clearTimeout(coverTimerRef.current); coverTimerRef.current = undefined }
    if (coverDirtyRef.current) autoSaveCover(coverprompt)
  }

  // Sheet 关闭时 flush 所有待保存内容
  const handleCloseWithFlush = useCallback(async () => {
    if (descTimerRef.current) { clearTimeout(descTimerRef.current); descTimerRef.current = undefined }
    if (coverTimerRef.current) { clearTimeout(coverTimerRef.current); coverTimerRef.current = undefined }
    const promises: Promise<void>[] = []
    if (descDirtyRef.current) promises.push(autoSaveDesc(description))
    if (coverDirtyRef.current) promises.push(autoSaveCover(coverprompt))
    await Promise.race([Promise.all(promises), new Promise<void>(r => setTimeout(r, 3000))])
    onClose()
  }, [description, coverprompt, autoSaveDesc, autoSaveCover, onClose])

  // ---- Image management (auto-save on change) ----

  const handleImageUpload = async (file: File) => {
    if (!material) return
    setUploadingIndex(images.length)
    try {
      const uploaded = await uploadFileToFlare(file, material.to_uid ?? undefined)
      const nextImages = [...images, uploaded as MaterialImage]
      setImages(nextImages)
      await editMaterial({ id: material.id, images: nextImages })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch {
      // silent
    } finally {
      setUploadingIndex(null)
    }
  }

  const handleImageDelete = async (index: number) => {
    if (!material) return
    const nextImages = images.filter((_, i) => i !== index)
    setImages(nextImages)
    try {
      await editMaterial({ id: material.id, images: nextImages.length > 0 ? nextImages : undefined })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch { /* silent */ }
  }

  const handleImageMoveUp = async (index: number) => {
    if (!material) return
    if (index <= 0) return
    const nextImages = [...images]
    const temp = nextImages[index - 1]
    nextImages[index - 1] = nextImages[index]
    nextImages[index] = temp
    setImages(nextImages)
    try {
      await editMaterial({ id: material.id, images: nextImages })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch { /* silent */ }
  }

  const handleImageMoveDown = async (index: number) => {
    if (!material) return
    if (index >= images.length - 1) return
    const nextImages = [...images]
    const temp = nextImages[index + 1]
    nextImages[index + 1] = nextImages[index]
    nextImages[index] = temp
    setImages(nextImages)
    try {
      await editMaterial({ id: material.id, images: nextImages })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    } catch { /* silent */ }
  }

  if (!material) return null

  const isAnySaving = descSavingRef.current || coverSavingRef.current
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
          onChange={handleDescChange}
          onBlur={handleDescBlur}
          rows={8}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          style={{ minHeight: 200 }}
          placeholder="商品描述文案"
        />
      </section>

      {/* 封面绘画提示词 */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">封面绘画提示词</h4>
        <textarea
          value={coverprompt}
          onChange={handleCoverChange}
          onBlur={handleCoverBlur}
          rows={4}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="例如：白色背景，柔和自然光，产品居中构图..."
        />
      </section>

      {/* 底部 — 自动保存状态 + 关闭 */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <p className="flex-1 flex items-center gap-1.5 text-xs text-green-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          所有改动已自动保存
        </p>
        <button
          onClick={handleCloseWithFlush}
          disabled={isAnySaving}
          className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isAnySaving ? '保存中...' : '关闭'}
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={handleCloseWithFlush}
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
      onClose={handleCloseWithFlush}
      title={`编辑素材 #${material.id}`}
      subtitle={material.description?.slice(0, 40) ?? ''}
      width="500px"
    >
      {formContent}
    </Sheet>
  )
}
