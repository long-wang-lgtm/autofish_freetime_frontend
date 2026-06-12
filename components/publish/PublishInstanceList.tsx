'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type PublishedItem,
  type ChannelCategory,
  listPublishedItems,
  updatePublishedItem,
  deletePublishedItem,
  triggerRewrite,
  triggerCoverPlan,
  triggerImageGenerate,
  triggerPublish,
  getChannelCategories,
  imageDisplayUrl,
  sortImages,
} from '@/lib/api/publish-items'
import { uploadFileToFlare } from '@/lib/api/upload'
import { CreationProgressBar } from './CreationProgressBar'
import { ImageLightbox } from './ImageLightbox'

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

interface PublishInstanceListProps {
  opportunityId: number
  accounts: { uid: string; name: string }[]
  onEditItem: (item: PublishedItem | null) => void
  selectedItemId?: number
}

export function PublishInstanceList({
  opportunityId,
  accounts,
  onEditItem,
  selectedItemId,
}: PublishInstanceListProps) {
  const queryClient = useQueryClient()
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [form, setForm] = useState<Partial<PublishedItem>>({})
  const [channelCategories, setChannelCategories] = useState<Record<number, ChannelCategory[]>>({})
  const fetchedChannelRef = useRef<Set<number>>(new Set())
  const sortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [uploadingItemIds, setUploadingItemIds] = useState<Set<number>>(new Set())
  const [dragKey, setDragKey] = useState<string | null>(null)

  const fetchChannelIfReady = (itemId: number) => {
    const cached = queryClient.getQueryData<{ items: PublishedItem[] }>(['published-items', opportunityId])
    const item = cached?.items.find(i => i.id === itemId)
    if (!item) return

    // 改写内容非空 + 已选账号 → 拉取类目
    if (item.description && item.account_id) {
      if (!item.category && !fetchedChannelRef.current.has(item.id)) {
        fetchedChannelRef.current.add(item.id)
        getChannelCategories(itemId).then(cats => {
          setChannelCategories(prev => ({ ...prev, [itemId]: cats }))
          if (cats.length > 0 && !item.category) {
            updatePublishedItem(itemId, { category: cats[0].channelCateName }).then(updated => {
              queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
                if (!old) return old
                return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
              })
            })
          }
        }).catch(() => {})
      }
    }
  }

  // 图片上传处理（多图并发，R2 直传）
  const handleImageUpload = useCallback(async (itemId: number, files: FileList | null) => {
    if (!files?.length) return
    const cached = queryClient.getQueryData<{ items: PublishedItem[] }>(['published-items', opportunityId])
    const item = cached?.items.find(i => i.id === itemId)
    if (!item) return
    if ((item.images || []).length + files.length > 9) {
      window.alert('最多9张附加图片')
      return
    }

    setUploadingItemIds(prev => new Set(prev).add(itemId))
    const fileArray = Array.from(files)

    // 并发上传所有图片到 R2，每张完成后独立更新缓存
    await Promise.all(
      fileArray.map(async (file) => {
        try {
          const uploaded = await uploadFileToFlare(file, item.account_id)
          queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
            if (!old) return old
            return {
              ...old,
              items: old.items.map((i: PublishedItem) =>
                i.id === itemId
                  ? { ...i, images: [...(i.images || []), uploaded] }
                  : i
              ),
            }
          })
        } catch (err) {
          console.error('图片上传失败:', err)
        }
      })
    )

    // 全部上传完成后，同步图片顺序到后端
    const updated = queryClient.getQueryData<{ items: PublishedItem[] }>(['published-items', opportunityId])
    const updatedItem = updated?.items.find(i => i.id === itemId)
    if (updatedItem?.images?.length) {
      sortImages(itemId, updatedItem.images)
    }

    setUploadingItemIds(prev => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }, [opportunityId, queryClient])

  // 删除图片
  const handleImageDelete = (itemId: number, idx: number) => {
    queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((i: PublishedItem) => {
          if (i.id !== itemId || !i.images) return i
          const newImages = i.images.filter((_, i) => i !== idx)
          sortImages(itemId, newImages)
          return { ...i, images: newImages }
        }),
      }
    })
  }

  // 拖拽排序
  const handleImageDragStart = (e: React.DragEvent, itemId: number, dragIndex: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-img-index', String(dragIndex))
    e.dataTransfer.setData('application/x-img-itemid', String(itemId))
    setDragKey(`${itemId}-${dragIndex}`)
  }

  const handleImageDragEnd = () => {
    setDragKey(null)
  }

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleImageDrop = (e: React.DragEvent, itemId: number, dropIndex: number) => {
    e.preventDefault()
    setDragKey(null)
    const dragIndex = Number(e.dataTransfer.getData('application/x-img-index'))
    const dragItemId = Number(e.dataTransfer.getData('application/x-img-itemid'))
    if (isNaN(dragIndex) || isNaN(dragItemId) || dragItemId !== itemId || dragIndex === dropIndex) return

    queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((i: PublishedItem) => {
          if (i.id !== itemId || !i.images) return i
          const newImages = [...i.images]
          const [moved] = newImages.splice(dragIndex, 1)
          newImages.splice(dropIndex, 0, moved)

          if (sortTimerRef.current) clearTimeout(sortTimerRef.current)
          sortTimerRef.current = setTimeout(() => {
            sortImages(itemId, newImages)
          }, 500)

          return { ...i, images: newImages }
        }),
      }
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['published-items', opportunityId],
    queryFn: () => listPublishedItems({ opportunity_id: opportunityId, page_size: 20 }),
  })

  const items: PublishedItem[] = data?.items ?? []

  // 轮询：检测进行中任务，每 3 秒刷新一次（仅用于 image_gen/publish 等异步任务）
  const activeRef = useRef(false)
  useEffect(() => {
    const hasActive = items.some(item =>
      ['image_generating', 'publishing'].includes(item.status)
    )
    if (hasActive && !activeRef.current) {
      activeRef.current = true
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['published-items', opportunityId] })
      }, 3000)
      return () => {
        clearInterval(interval)
        activeRef.current = false
      }
    }
  }, [items, queryClient, opportunityId])

  // 自动拉取渠道类目：封面图 + 改写内容 + 账号 三者就绪时触发（初始化）
  useEffect(() => {
    items.forEach(item => fetchChannelIfReady(item.id))
  }, [items])

  // 缓存中选中项变更时，通知上层编辑器同步
  useEffect(() => {
    if (selectedItemId != null) {
      const current = items.find(i => i.id === selectedItemId)
      if (current) onEditItem(current)
    }
  }, [items, selectedItemId, onEditItem])

  const saveMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<PublishedItem> }) =>
      updatePublishedItem(payload.id, payload.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
      })
    },
  })

  // 改写和封面规划：同步接口，返回部分字段，需合并到缓存
  const rewriteMutation = useMutation({
    mutationFn: (itemId: number) => triggerRewrite(itemId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
      })
      fetchChannelIfReady(updated.id)
    },
  })

  const coverPlanMutation = useMutation({
    mutationFn: (itemId: number) => triggerCoverPlan(itemId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
      })
    },
  })

  // 图片生成和发布：同步接口，直接合并返回的部分字段到缓存
  const imageGenMutation = useMutation({
    mutationFn: (itemId: number) => triggerImageGenerate(itemId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
      })
      fetchChannelIfReady(updated.id)
    },
  })

  const publishMutation = useMutation({
    mutationFn: (itemId: number) => triggerPublish(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['published-items', opportunityId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => deletePublishedItem(itemId),
    onSuccess: (_, itemId) => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.filter((i: PublishedItem) => i.id !== itemId) }
      })
      if (selectedItemId === itemId) onEditItem(null)
    },
  })

  const handleStageClick = (item: PublishedItem, stage: 'rewrite' | 'cover_plan' | 'image_gen' | 'publish') => {
    if (stage === 'publish' && !item.account_id) {
      window.alert('请先选择目标账号，再执行发布。')
      return
    }
    switch (stage) {
      case 'rewrite':
        rewriteMutation.mutate(item.id)
        break
      case 'cover_plan':
        coverPlanMutation.mutate(item.id)
        break
      case 'image_gen':
        imageGenMutation.mutate(item.id)
        break
      case 'publish':
        publishMutation.mutate(item.id)
        break
    }
  }

  const initForm = (item: PublishedItem) => {
    setForm({
      id: item.id,
      price: item.price,
      account_id: item.account_id,
      category: item.category,
    })
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i.id))
    )
  }

  const handleBatchPublish = () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id))
    const withoutAccount = selectedItems.filter(i => !i.account_id)
    if (withoutAccount.length > 0) {
      const lines = withoutAccount.map(i => '  - ' + (i.title || '#' + i.id)).join('\n')
      window.alert('以下 ' + withoutAccount.length + ' 个素材尚未选择账号，无法发布：\n\n' + lines + '\n\n请先选择目标账号。')
      return
    }
    const lines = selectedItems.map(i => {
      const accName = accounts.find(a => a.uid === i.account_id)?.name ?? i.account_id
      return '  - ' + (i.title || '#' + i.id) + ' -> ' + accName
    }).join('\n')
    if (window.confirm('确认批量发布 ' + selectedItems.length + ' 个商品？\n\n' + lines)) {
      selectedItems.forEach(item => {
        publishMutation.mutate(item.id)
      })
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 表头 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b text-xs font-medium text-gray-500 min-w-[900px]">
        <div className="w-[18px] flex-shrink-0">
          <input
            type="checkbox"
            checked={selectedIds.size === items.length && items.length > 0}
            onChange={toggleSelectAll}
            className="rounded"
          />
        </div>
        <div className="w-[280px] flex-shrink-0">封面</div>
        <div className="flex-1 min-w-[160px]">改写内容</div>
        <div className="flex-1 min-w-[200px]">封面规划</div>
        <div className="w-[70px] flex-shrink-0">价格</div>
        <div className="w-[90px] flex-shrink-0">账号</div>
        <div className="w-[100px] flex-shrink-0">类目</div>
        <div className="w-[130px] flex-shrink-0">创作进度</div>
        <div className="w-[60px] flex-shrink-0">状态</div>
        <div className="w-[40px] flex-shrink-0">操作</div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无发布素材</div>
        ) : (
          items.map(item => {
            const statusInfo = getStatusLabel(item)
            const isSelected = selectedItemId === item.id
            const isEditing = form.id === item.id

            return (
              <div
                key={item.id}
                onClick={() => {
                  onEditItem(item)
                }}
                className={
                  'flex items-stretch gap-1.5 px-3 min-h-[96px] border-b text-xs min-w-[900px] cursor-pointer select-none' +
                  (isEditing ? ' bg-blue-50 ring-1 ring-blue-300' : isSelected ? ' bg-blue-50/50' : ' hover:bg-gray-50')
                }
              >
                {/* checkbox */}
                <div className="w-[18px] flex-shrink-0 flex items-center" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded"
                  />
                </div>

                {/* 封面图 + 附加图片 */}
                <div
                  className="w-[280px] flex-shrink-0 flex items-center gap-1.5 overflow-x-auto"
                  onClick={e => e.stopPropagation()}
                  onWheel={e => {
                    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                      e.currentTarget.scrollLeft += e.deltaY
                      e.preventDefault()
                    }
                  }}
                >
                  {/* 封面 */}
                  {/* {item.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageDisplayUrl(item.images[0])}
                      alt="封面"
                      className="w-14 h-14 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-400 flex-shrink-0"
                      onClick={() => setLightboxSrc(imageDisplayUrl(item.images[0]))}
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xl flex-shrink-0">📷</div>
                  )} */}

                  {/* 附加图片缩略图（可拖拽排序） */}
                  {(item.images || []).map((img, idx) => {
                    const key = `${item.id}-${idx}`
                    const isDragging = dragKey === key
                    return (
                    <div
                      key={img.md5 || idx}
                      draggable
                      onDragStart={e => handleImageDragStart(e, item.id, idx)}
                      onDragOver={handleImageDragOver}
                      onDragEnd={handleImageDragEnd}
                      onDrop={e => handleImageDrop(e, item.id, idx)}
                      className={`relative w-14 h-14 flex-shrink-0 group cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : ''}`}
                      onClick={() => setLightboxSrc(imageDisplayUrl(img))}
                    >
                      <img
                        src={imageDisplayUrl(img)}
                        alt=""
                        draggable={false}
                        className="w-14 h-14 object-cover rounded border border-gray-200 pointer-events-none"
                      />
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleImageDelete(item.id, idx)
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center leading-none text-[9px]"
                      >
                        ✕
                      </button>
                    </div>
                    )
                  })}

                  {/* + 号上传入口（末尾） */}
                  {(item.images || []).length < 8 ? (
                    <label className={
                      'w-14 h-14 flex-shrink-0 flex items-center justify-center rounded border border-dashed cursor-pointer ' +
                      (uploadingItemIds.has(item.id)
                        ? 'border-blue-300 bg-blue-50 text-blue-400'
                        : 'border-gray-300 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500')
                    }>
                      {uploadingItemIds.has(item.id) ? (
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => {
                          handleImageUpload(item.id, e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  ) : null}
                </div>

                {/* 改写内容 — 只读，点击行在抽屉编辑 */}
                <div className="flex-1 min-w-[160px] flex items-center">
                  <div
                    className="w-full text-gray-700 leading-tight"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description || <span className="text-gray-300">（空）</span>}
                  </div>
                </div>

                {/* 封面规划 — 只读，点击行在抽屉编辑 */}
                <div className="flex-1 min-w-[200px] flex items-center">
                  <div
                    className="w-full text-gray-400 leading-tight"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.cover_plan_prompt || <span className="text-gray-300">（空）</span>}
                  </div>
                </div>

                {/* 价格 — 点击编辑 */}
                <div className="w-[70px] flex-shrink-0 flex items-center">
                  <input
                    type="number"
                    value={isEditing ? (form.price ?? 0) : item.price}
                    onChange={e => {
                      if (form.id !== item.id) initForm(item)
                      setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                    }}
                    onClick={e => {
                      e.stopPropagation()
                      if (form.id !== item.id) initForm(item)
                    }}
                    onBlur={e => {
                      e.stopPropagation()
                      if (form.id === item.id && form.price !== undefined) {
                        updatePublishedItem(item.id, { price: form.price }).then(updated => {
                          queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
                            if (!old) return old
                            return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
                          })
                        })
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        if (form.id === item.id && form.price !== undefined) {
                          updatePublishedItem(item.id, { price: form.price }).then(updated => {
                            queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
                              if (!old) return old
                              return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
                            })
                          })
                        }
                      }
                    }}
                    className="w-full p-1 border border-blue-400 rounded text-xs bg-white"
                    step="0.01"
                  />
                </div>

                {/* 账号 — 下拉即时保存 */}
                <div className="w-[90px] flex-shrink-0 flex items-center">
                  <select
                    value={isEditing ? (form.account_id ?? '') : (item.account_id ?? '')}
                    onChange={e => {
                      e.stopPropagation()
                      if (form.id !== item.id) initForm(item)
                      setForm(f => ({ ...f, account_id: e.target.value }))
                      updatePublishedItem(item.id, { account_id: e.target.value }).then(updated => {
                        queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
                          if (!old) return old
                          return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
                        })
                        fetchChannelIfReady(item.id)
                      })
                    }}
                    onClick={e => {
                      e.stopPropagation()
                      if (form.id !== item.id) initForm(item)
                    }}
                    className="w-full p-1 border border-blue-400 rounded text-xs bg-white cursor-pointer"
                  >
                    <option value="">未选择</option>
                    {accounts.map(acc => (
                      <option key={acc.uid} value={acc.uid}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                {/* 类目 — 下拉即时保存 */}
                <div className="w-[100px] flex-shrink-0 flex items-center">
                  <select
                    value={item.category ?? ''}
                    onChange={e => {
                      e.stopPropagation()
                      if (form.id !== item.id) initForm(item)
                      setForm(f => ({ ...f, category: e.target.value }))
                      updatePublishedItem(item.id, { category: e.target.value }).then(updated => {
                        queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
                          if (!old) return old
                          return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
                        })
                      })
                    }}
                    onClick={e => {
                      e.stopPropagation()
                      if (form.id !== item.id) initForm(item)
                    }}
                    className="w-full p-1 border border-blue-400 rounded text-xs bg-white cursor-pointer"
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
                <div className="w-[130px] flex-shrink-0 flex items-center">
                  <CreationProgressBar
                    item={item}
                    onStageClick={stage => handleStageClick(item, stage)}
                    size="sm"
                  />
                </div>

                {/* 状态 */}
                <div className={'w-[60px] flex-shrink-0 flex items-center text-xs ' + statusInfo.color}>
                  {statusInfo.label}
                </div>

                {/* 删除 */}
                <div className="w-[40px] flex-shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      if (window.confirm('确认删除该发布素材？')) {
                        deleteMutation.mutate(item.id)
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
        )}
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-t">
          <span className="text-sm text-blue-700">已选择 {selectedIds.size} 项</span>
          <button
            onClick={handleBatchPublish}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            批量发布 ▶
          </button>
        </div>
      )}

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}
