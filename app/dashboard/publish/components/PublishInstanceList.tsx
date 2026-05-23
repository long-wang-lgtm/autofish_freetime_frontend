'use client'
import { useState, useEffect, useRef } from 'react'
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
  coverImageUrl,
} from '@/lib/api/publish-items'
import { CreationProgressBar } from './CreationProgressBar'
import { ImageLightbox } from './ImageLightbox'

function getStatusLabel(item: PublishedItem): { label: string; color: string } {
  if (item.status === 'publish_failed') return { label: '失败', color: 'text-red-500' }
  if (item.item_gid) return { label: '已发布', color: 'text-green-600' }
  if (item.status === 'publishing') return { label: '发布中', color: 'text-teal-500' }
  if (item.cover_image) return { label: '生图完成', color: 'text-orange-500' }
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
  onEditItem: (item: PublishedItem) => void
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
  const [editingField, setEditingField] = useState<{ itemId: number; field: 'description' | 'cover_plan_prompt' } | null>(null)
  const [channelCategories, setChannelCategories] = useState<Record<number, ChannelCategory[]>>({})
  const fetchedChannelRef = useRef<Set<number>>(new Set())

  const fetchChannelIfReady = (itemId: number) => {
    const cached = queryClient.getQueryData<{ items: PublishedItem[] }>(['published-items', opportunityId])
    const item = cached?.items.find(i => i.id === itemId)
    if (!item) return
    if (
      // item.cover_image &&
      item.description &&
      item.account_id &&
      !item.category &&
      !fetchedChannelRef.current.has(item.id)
    ) {
      fetchedChannelRef.current.add(item.id)
      getChannelCategories(itemId).then(cats => {
        setChannelCategories(prev => ({ ...prev, [itemId]: cats }))
        // 首次拉取到渠道类目时，若类目字段为空，自动设为第一项
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
      if (selectedItemId === itemId) onEditItem(null as any)
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
      description: item.description,
      cover_plan_prompt: item.cover_plan_prompt,
      price: item.price,
      account_id: item.account_id,
      category: item.category,
    })
  }

  const saveField = (itemId: number, field: 'description' | 'cover_plan_prompt') => {
    const data: Partial<PublishedItem> = {}
    if (field === 'description') data.description = form.description
    if (field === 'cover_plan_prompt') data.cover_plan_prompt = form.cover_plan_prompt
    if (Object.keys(data).length === 0) return
    updatePublishedItem(itemId, data).then(updated => {
      queryClient.setQueryData(['published-items', opportunityId], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.map((i: PublishedItem) => i.id === updated.id ? { ...i, ...updated } : i) }
      })
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
      window.alert('以下 ' + withoutAccount.length + ' 个实例尚未选择账号，无法发布：\n\n' + lines + '\n\n请先选择目标账号。')
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
        <div className="w-[48px] flex-shrink-0">封面</div>
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
          <div className="text-center py-8 text-gray-400">暂无发布实例</div>
        ) : (
          items.map(item => {
            const statusInfo = getStatusLabel(item)
            const isSelected = selectedItemId === item.id
            const isEditing = form.id === item.id || editingField?.itemId === item.id

            return (
              <div
                key={item.id}
                onClick={() => {
                  // 单击选中行，触发右侧编辑面板（不进入行内编辑模式）
                  onEditItem(item)
                }}
                className={
                  'flex items-stretch gap-1.5 px-3 min-h-[72px] border-b text-xs min-w-[900px] cursor-pointer select-none' +
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

                {/* 封面图 */}
                <div className="w-[48px] flex-shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
                  {item.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl(item.cover_image)}
                      alt="封面"
                      className="w-11 h-11 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-400"
                      onClick={() => setLightboxSrc(coverImageUrl(item.cover_image))}
                    />
                  ) : (
                    <div className="w-11 h-11 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-lg">📷</div>
                  )}
                </div>

                {/* 改写内容 — 双击进入编辑 */}
                <div
                  className="flex-1 min-w-[160px] flex items-center"
                  onDoubleClick={e => {
                    e.stopPropagation()
                    initForm(item)
                    setEditingField({ itemId: item.id, field: 'description' })
                  }}
                  title={item.description || '双击编辑改写内容'}
                >
                  {editingField?.itemId === item.id && editingField?.field === 'description' ? (
                    <textarea
                      value={form.description ?? ''}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); saveField(item.id, 'description'); setEditingField(null) }
                      }}
                      onBlur={e => {
                        e.stopPropagation()
                        saveField(item.id, 'description')
                        setEditingField(null)
                      }}
                      className="w-full p-1 border border-blue-400 rounded text-xs resize-none"
                      rows={3}
                      autoFocus
                    />
                  ) : (
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
                  )}
                </div>

                {/* 封面规划 — 双击进入编辑 */}
                <div
                  className="flex-1 min-w-[200px] flex items-center"
                  onDoubleClick={e => {
                    e.stopPropagation()
                    initForm(item)
                    setEditingField({ itemId: item.id, field: 'cover_plan_prompt' })
                  }}
                  title={item.cover_plan_prompt || '双击编辑封面规划'}
                >
                  {editingField?.itemId === item.id && editingField?.field === 'cover_plan_prompt' ? (
                    <textarea
                      value={form.cover_plan_prompt ?? ''}
                      onChange={e => setForm(f => ({ ...f, cover_plan_prompt: e.target.value }))}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); saveField(item.id, 'cover_plan_prompt'); setEditingField(null) }
                      }}
                      onBlur={e => {
                        e.stopPropagation()
                        saveField(item.id, 'cover_plan_prompt')
                        setEditingField(null)
                      }}
                      className="w-full p-1 border border-blue-400 rounded text-xs resize-none"
                      rows={3}
                      autoFocus
                    />
                  ) : (
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
                  )}
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
                      if (window.confirm('确认删除该发布实例？')) {
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
