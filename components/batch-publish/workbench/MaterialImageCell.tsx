'use client'

import { useRef, useState, useCallback } from 'react'
import { uploadFileToFlare, imageDisplayUrl } from '@/lib/api/upload'
import { editMaterial } from '@/lib/api/batch-publish'
import type { MaterialImage as UploadMaterialImage } from '@/lib/api/upload'
import type { MaterialImage } from '@/lib/api/batch-publish'

interface MaterialImageCellProps {
  images: MaterialImage[]
  materialId: number
  toUid?: string | null
  onImagesChange: (images: MaterialImage[]) => void
}

const MAX_IMAGES = 8
const THUMB_SIZE = 48

export function MaterialImageCell({ images, materialId, toUid, onImagesChange }: MaterialImageCellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return

    setUploading(true)
    try {
      const uploaded = await uploadFileToFlare(file, toUid ?? undefined)
      // Cast: upload.ts MaterialImage and batch-publish.ts MaterialImage are structurally compatible
      const newImages = [...images, uploaded as MaterialImage]
      onImagesChange(newImages)
      await editMaterial({ id: materialId, images: newImages })
    } catch {
      // Silent fail — will be corrected on next cache refresh
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [images, materialId, toUid, onImagesChange])

  const handleDelete = useCallback(async (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
    try {
      await editMaterial({ id: materialId, images: newImages })
    } catch {
      onImagesChange(images) // Revert
    }
  }, [images, materialId, onImagesChange])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const newImages = [...images]
    const [removed] = newImages.splice(dragIndex, 1)
    newImages.splice(index, 0, removed)
    onImagesChange(newImages)
    setDragIndex(index)
  }

  const handleDragEnd = async () => {
    setDragIndex(null)
    try {
      await editMaterial({ id: materialId, images })
    } catch {
      // Will be corrected on next refresh
    }
  }

  const canUpload = images.length < MAX_IMAGES

  return (
    <div className="overflow-x-auto" onClick={(e) => e.stopPropagation()}>
      <div className="inline-flex items-center gap-1.5 min-w-max">
        {images.map((img, i) => (
        <div
          key={img.md5 || i}
          className="relative group flex-shrink-0"
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnd={handleDragEnd}
        >
          <img
            src={imageDisplayUrl(img as UploadMaterialImage) || undefined}
            alt=""
            className="w-12 h-12 object-cover rounded-lg border border-gray-200 cursor-pointer"
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
            onClick={() => setLightboxIndex(i)}
            loading="lazy"
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(i) }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="删除图片"
          >
            ×
          </button>
        </div>
      ))}

      {images.length === 0 && (
        <div
          className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-300 text-xs flex-shrink-0"
          style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
        >
          无图
        </div>
      )}

      {canUpload && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50 flex-shrink-0"
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-lg">+</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </>
      )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={imageDisplayUrl(images[lightboxIndex] as UploadMaterialImage) || undefined}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white text-xl flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
