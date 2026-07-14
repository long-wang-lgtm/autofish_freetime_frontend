'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet } from '@/components/ui/overlay/Sheet'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import { listMonitoredItems } from '@/lib/api/batch-publish'
import { fmtGrowth, fmtNumber } from '@/lib/utils/format'
import type { MaterialListResponse, MonitoredItem, TemplateType } from '@/lib/api/batch-publish'

interface MaterialEditSheetProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
}

export function MaterialEditSheet({ materialId, selectedOid, open, onClose }: MaterialEditSheetProps) {
  const queryClient = useQueryClient()
  const { editMaterialMutation, updateContextMutation } = useWorkbenchMutations(selectedOid)

  // 从缓存读取素材数据
  const cached = queryClient.getQueryData<MaterialListResponse>(['batch-publish', 'materials', selectedOid])
  const materials = cached?.items ?? []
  const material = materialId ? materials.find(m => m.id === materialId) : null

  // 表单字段
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [toUid, setToUid] = useState('')
  const [templateType, setTemplateType] = useState<TemplateType>('only_opportunity')
  const [selectedGids, setSelectedGids] = useState<string[]>([])

  // 监控商品列表（用于 AI 上下文勾选）
  const [monitoredItems, setMonitoredItems] = useState<MonitoredItem[]>([])

  // 初始化表单
  useEffect(() => {
    if (material) {
      setDescription(material.description ?? '')
      setPrice(material.price != null ? String(material.price) : '')
      setCategory(material.category ?? '')
      setToUid(material.to_uid ?? '')
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

  const handleSaveMaterial = () => {
    editMaterialMutation.mutate({
      id: material.id,
      description: description || undefined,
      price: price ? Number(price) : undefined,
      category: category || undefined,
      to_uid: toUid || undefined,
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

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`编辑素材 #${material.id}`}
      subtitle={material.description?.slice(0, 40) ?? ''}
      width="500px"
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 素材基本信息 */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">素材信息</h4>

          <div>
            <label className="text-sm font-medium text-gray-700">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
              placeholder="商品描述文案"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">价格</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step={0.01}
              className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">类目</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="如：手机配件"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">发布账号 (to_uid)</label>
            <input
              type="text"
              value={toUid}
              onChange={(e) => setToUid(e.target.value)}
              className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="选择发布账号"
            />
          </div>

          <button
            onClick={handleSaveMaterial}
            disabled={isSaving}
            className="h-10 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {editMaterialMutation.isPending ? '保存中...' : '保存素材信息'}
          </button>
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
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGids.includes(item.gid)}
                        onChange={() => toggleGid(item.gid)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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

          {/* 配置摘要 */}
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
      </div>
    </Sheet>
  )
}
