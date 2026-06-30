'use client'
import { memo, useCallback } from 'react'
import type { PublishedItem, ChannelCategory } from '@/lib/api/publish-items'
import { imageDisplayUrl } from '@/lib/api/publish-items'
import { CreationProgressBar } from './CreationProgressBar'
import { PUBLISH_GRID_COLS } from './constants'

function getStatusLabel(item: PublishedItem): { label: string; color: string } {
  if (item.status === 'publish_failed') return { label: '失败', color: 'text-red-500' }
  if (item.item_gid) return { label: '已发布', color: 'text-green-600' }
  if (item.status === 'publishing') return { label: '发布中', color: 'text-teal-500' }
  if (item.images?.length) return { label: '生图完成', color: 'text-orange-500' }
  if (item.status === 'image_generating') return { label: '生图中', color: 'text-orange-500' }
  if (item.cover_plan_prompt) return { label: '封面完成', color: 'text-purple-500' }
  if (item.status === 'cover_planning') return { label: '封面规划中', color: 'text-purple-500' }
  if (item.description) return { label: '改写完成', color: 'text-blue-500' }
  if (item.status === 'rewriting') return { label: '改写中', color: 'text-blue-500' }
  if (item.status === 'rewrite_done') return { label: '改写完成', color: 'text-blue-500' }
  return { label: item.status, color: 'text-gray-400' }
}

interface PublishInstanceRowProps {
  item: PublishedItem
  accounts: { uid: string; name: string }[]
  channelCategories: Record<number, ChannelCategory[]>
  isSelected: boolean
  isEditing: boolean
  isChecked: boolean
  dragKey: string | null
  isUploading: boolean
  form: Partial<PublishedItem>
  onToggleSelect: (id: number) => void
  onSelect: (item: PublishedItem) => void
  onDelete: (itemId: number) => void
  onSaveField: (itemId: number, data: Partial<PublishedItem>) => void
  onFetchChannel: (itemId: number) => void
  onStageClick: (item: PublishedItem, stage: 'rewrite' | 'cover_plan' | 'image_gen' | 'publish') => void
  onImageUpload: (itemId: number, files: FileList | null) => void
  onImageDelete: (itemId: number, idx: number) => void
  onImageDragStart: (e: React.DragEvent, itemId: number, dragIndex: number) => void
  onImageDragOver: (e: React.DragEvent) => void
  onImageDragEnd: () => void
  onImageDrop: (e: React.DragEvent, itemId: number, dropIndex: number) => void
  onLightbox: (src: string | null) => void
  onFormInit: (item: PublishedItem) => void
  onFormUpdate: (updates: Partial<PublishedItem>) => void
}

export const PublishInstanceRow = memo(function PublishInstanceRow({
  item,
  accounts,
  channelCategories,
  isSelected,
  isEditing,
  isChecked,
  dragKey,
  isUploading,
  form,
  onToggleSelect,
  onSelect,
  onDelete,
  onSaveField,
  onFetchChannel,
  onStageClick,
  onImageUpload,
  onImageDelete,
  onImageDragStart,
  onImageDragOver,
  onImageDragEnd,
  onImageDrop,
  onLightbox,
  onFormInit,
  onFormUpdate,
}: PublishInstanceRowProps) {
  const statusInfo = getStatusLabel(item)

  const ensureFormInit = useCallback(() => {
    if (form.id !== item.id) onFormInit(item)
  }, [form.id, item.id, onFormInit, item])

  const rowClassName =
    'grid items-stretch gap-1.5 px-3 min-h-[96px] border-b text-xs cursor-pointer select-none' +
    (isEditing ? ' bg-blue-50 ring-1 ring-blue-300' : isSelected ? ' bg-blue-50/50' : ' hover:bg-gray-50')

  return (
    <div
      className={rowClassName}
      style={{ gridTemplateColumns: PUBLISH_GRID_COLS }}
      onClick={() => onSelect(item)}
    >
      {/* checkbox */}
      <div className="flex items-center" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggleSelect(item.id)}
          className="rounded-lg"
        />
      </div>

      {/* 封面图 + 附加图片 */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto"
        onClick={e => e.stopPropagation()}
        onWheel={e => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY
            e.preventDefault()
          }
        }}
      >
        {/* 附加图片缩略图（可拖拽排序） */}
        {(item.images || []).map((img, idx) => {
          const key = `${item.id}-${idx}`
          const isDragging = dragKey === key
          return (
            <div
              key={img.md5 || idx}
              draggable
              onDragStart={e => onImageDragStart(e, item.id, idx)}
              onDragOver={onImageDragOver}
              onDragEnd={onImageDragEnd}
              onDrop={e => onImageDrop(e, item.id, idx)}
              className={`relative w-14 h-14 flex-shrink-0 group cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : ''}`}
              onClick={() => onLightbox(imageDisplayUrl(img))}
            >
              <img
                src={imageDisplayUrl(img)}
                alt=""
                draggable={false}
                className="w-14 h-14 object-cover rounded-lg border border-gray-200 pointer-events-none"
              />
              <button
                onClick={e => {
                  e.stopPropagation()
                  onImageDelete(item.id, idx)
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center leading-none text-xs"
              >
                ✕
              </button>
            </div>
          )
        })}

        {/* + 号上传入口（末尾） */}
        {(item.images || []).length < 8 ? (
          <label className={
            'w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-lg border border-dashed cursor-pointer ' +
            (isUploading
              ? 'border-blue-300 bg-blue-50 text-blue-400'
              : 'border-gray-300 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500')
          }>
            {isUploading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                onImageUpload(item.id, e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        ) : null}
      </div>

      {/* 改写内容 — 只读，点击行在抽屉编辑 */}
      <div className="flex items-center">
        <div className="w-full text-gray-700 leading-tight line-clamp-3">
          {item.description || <span className="text-gray-300">（空）</span>}
        </div>
      </div>

      {/* 封面规划 — 只读，点击行在抽屉编辑 */}
      <div className="flex items-center">
        <div className="w-full text-gray-400 leading-tight line-clamp-3">
          {item.cover_plan_prompt || <span className="text-gray-300">（空）</span>}
        </div>
      </div>

      {/* 价格 — 点击编辑 */}
      <div className="flex items-center">
        <input
          type="number"
          value={isEditing ? (form.price ?? 0) : item.price}
          onChange={e => {
            ensureFormInit()
            onFormUpdate({ price: parseFloat(e.target.value) || 0 })
          }}
          onClick={e => {
            e.stopPropagation()
            ensureFormInit()
          }}
          onBlur={e => {
            e.stopPropagation()
            if (form.id === item.id && form.price !== undefined) {
              onSaveField(item.id, { price: form.price })
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              if (form.id === item.id && form.price !== undefined) {
                onSaveField(item.id, { price: form.price })
              }
            }
          }}
          className="w-full p-1 border border-blue-400 rounded-lg text-xs bg-white"
          step="0.01"
        />
      </div>

      {/* 账号 — 下拉即时保存 */}
      <div className="flex items-center">
        <select
          value={isEditing ? (form.account_id ?? '') : (item.account_id ?? '')}
          onChange={e => {
            e.stopPropagation()
            ensureFormInit()
            const value = e.target.value
            onFormUpdate({ account_id: value })
            onSaveField(item.id, { account_id: value })
            onFetchChannel(item.id)
          }}
          onClick={e => {
            e.stopPropagation()
            ensureFormInit()
          }}
          className="w-full p-1 border border-blue-400 rounded-lg text-xs bg-white cursor-pointer"
        >
          <option value="">未选择</option>
          {accounts.map(acc => (
            <option key={acc.uid} value={acc.uid}>{acc.name}</option>
          ))}
        </select>
      </div>

      {/* 类目 — 下拉即时保存 */}
      <div className="flex items-center">
        <select
          value={item.category ?? ''}
          onChange={e => {
            e.stopPropagation()
            ensureFormInit()
            const value = e.target.value
            onFormUpdate({ category: value })
            onSaveField(item.id, { category: value })
          }}
          onClick={e => {
            e.stopPropagation()
            ensureFormInit()
          }}
          className="w-full p-1 border border-blue-400 rounded-lg text-xs bg-white cursor-pointer"
        >
          <option value="">未选择</option>
          {item.category && !channelCategories[item.id]?.some(c => c.channelCateName === item.category) && (
            <option value={item.category}>{item.category}</option>
          )}
          {channelCategories[item.id]?.map(cat => (
            <option key={cat.channelCateId} value={cat.channelCateName}>{cat.channelCateName}</option>
          ))}
        </select>
      </div>

      {/* 创作进度 */}
      <div
        className="flex items-center"
        onClick={e => e.stopPropagation()}
      >
        <CreationProgressBar
          item={item}
          onStageClick={stage => onStageClick(item, stage)}
          size="sm"
        />
      </div>

      {/* 状态 */}
      <div className={'w-[60px] flex-shrink-0 flex items-center text-xs ' + statusInfo.color}>
        {statusInfo.label}
      </div>

      {/* 删除 */}
      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => {
            if (window.confirm('确认删除该发布素材？')) {
              onDelete(item.id)
            }
          }}
          className="text-gray-300 hover:text-red-500 text-sm"
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  )
})
