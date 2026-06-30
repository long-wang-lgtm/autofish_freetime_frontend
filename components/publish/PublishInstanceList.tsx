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
  sortImages,
} from '@/lib/api/publish-items'
import { uploadFileToFlare } from '@/lib/api/upload'
import { ImageLightbox } from './ImageLightbox'
import { PublishInstanceRow } from './PublishInstanceRow'


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

  const handleSaveField = useCallback((itemId: number, data: Partial<PublishedItem>) => {
    saveMutation.mutate({ id: itemId, data })
  }, [saveMutation.mutate])

  const handleFormInit = useCallback((item: PublishedItem) => {
    setForm({
      id: item.id,
      price: item.price,
      account_id: item.account_id,
      category: item.category,
    })
  }, [])

  const handleFormUpdate = useCallback((updates: Partial<PublishedItem>) => {
    setForm(f => ({ ...f, ...updates }))
  }, [])

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
      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border-b text-xs font-medium text-gray-500 min-w-[900px]">
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
          items.map(item => (
            <PublishInstanceRow
              key={item.id}
              item={item}
              accounts={accounts}
              channelCategories={channelCategories}
              isSelected={selectedItemId === item.id}
              isEditing={form.id === item.id}
              isChecked={selectedIds.has(item.id)}
              dragKey={dragKey}
              isUploading={uploadingItemIds.has(item.id)}
              form={form}
              onToggleSelect={toggleSelect}
              onSelect={onEditItem}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSaveField={handleSaveField}
              onFetchChannel={fetchChannelIfReady}
              onStageClick={handleStageClick}
              onImageUpload={handleImageUpload}
              onImageDelete={handleImageDelete}
              onImageDragStart={handleImageDragStart}
              onImageDragOver={handleImageDragOver}
              onImageDragEnd={handleImageDragEnd}
              onImageDrop={handleImageDrop}
              onLightbox={setLightboxSrc}
              onFormInit={handleFormInit}
              onFormUpdate={handleFormUpdate}
            />
          ))
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
