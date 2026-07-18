'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/overlay/Modal'
import { fmtGrowth, fmtNumber } from '@/lib/utils/format'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import type { MonitoredItem, TemplateType, PublishMaterial } from '@/lib/api/batch-publish'

interface AIContextModalProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
  monitoredItems: MonitoredItem[]
  materials: PublishMaterial[]
}

function getConfidence(fetchCount: number): { label: string; color: string } {
  if (fetchCount >= 12) return { label: '高置信度', color: 'text-gray-400' }
  if (fetchCount >= 6) return { label: '中等置信度', color: 'text-gray-400' }
  if (fetchCount >= 1) return { label: '低置信度', color: 'text-amber-500' }
  return { label: '无采集数据', color: 'text-gray-400' }
}

export function AIContextModal({
  materialId, selectedOid, open, onClose, monitoredItems, materials,
}: AIContextModalProps) {
  const { updateContextMutation } = useWorkbenchMutations(selectedOid)
  const material = materialId ? materials.find(m => m.id === materialId) : null

  const [templateType, setTemplateType] = useState<TemplateType>('only_opportunity')
  const [selectedGids, setSelectedGids] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // 初始化本地状态
  useEffect(() => {
    if (material) {
      setTemplateType((material.ai_context?.template as TemplateType) ?? 'only_opportunity')
      setSelectedGids(material.ai_context?.items ?? [])
    }
  }, [material])

  if (!material) return null

  const saveContext = (tt: TemplateType, gids: string[]) => {
    updateContextMutation.mutate({ id: material.id, templateType: tt, gids })
  }

  const handleTemplateChange = (tt: TemplateType) => {
    setTemplateType(tt)
    saveContext(tt, selectedGids)
  }

  const toggleGid = (gid: string) => {
    const next = selectedGids.includes(gid)
      ? selectedGids.filter(g => g !== gid)
      : [...selectedGids, gid]
    setSelectedGids(next)
    saveContext(templateType, next)
  }

  const isSaving = updateContextMutation.isPending

  return (
    <Modal
      open={open}
      onClose={isSaving ? () => {} : onClose}
      title={`编辑 AI 上下文 — ${material.description?.slice(0, 20) ?? `#${material.id}`}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* 注入模板 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">注入模板</label>
          <select
            value={templateType}
            onChange={(e) => handleTemplateChange(e.target.value as TemplateType)}
            disabled={isSaving}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="only_opportunity">仅商机信息</option>
            <option value="with_item">商机 + 指定监控商品</option>
          </select>
        </div>

        {/* 监控商品列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">绑定监控商品</span>
            <span className="text-xs text-gray-500">
              已选 <span className="text-blue-600 font-semibold">{selectedGids.length}</span> 个
            </span>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索监控商品..."
              className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          {(() => {
            const q = searchQuery.trim().toLowerCase()
            const filtered = q
              ? monitoredItems.filter(item =>
                  (item.title || item.gid).toLowerCase().includes(q) ||
                  item.gid.toLowerCase().includes(q)
                )
              : monitoredItems

            if (monitoredItems.length === 0) {
              return (
                <p className="text-sm text-gray-400 py-4 text-center border border-gray-200 rounded-lg">
                  该商机下暂无绑定商品
                </p>
              )
            }

            if (filtered.length === 0) {
              return (
                <p className="text-sm text-gray-400 py-4 text-center border border-gray-200 rounded-lg">
                  无匹配商品
                </p>
              )
            }

            return (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {filtered.map((item) => {
                const checked = selectedGids.includes(item.gid)
                const trendData = item.trendData as { fetchCount?: number } | null | undefined
                const fetchCount = trendData?.fetchCount ?? 0
                const conf = getConfidence(fetchCount)

                return (
                  <label
                    key={item.gid}
                    className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGid(item.gid)}
                      disabled={isSaving}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 leading-snug line-clamp-1">
                        {item.title || item.gid}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-xs text-gray-500">
                        {item.price != null && <span>¥{item.price}</span>}
                        {item.convertRate != null && (
                          <span>
                            转化 <span className="text-gray-700">{item.convertRate}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      {item.wantSlope != null && (
                        <span className={`text-xs font-medium tabular-nums ${
                          (item.wantSlope ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {fmtGrowth(item.wantSlope)}
                        </span>
                      )}
                      {item.wantAvg != null && (
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          日均 {fmtNumber(item.wantAvg)}
                        </span>
                      )}
                      <span className={`text-[10px] ${conf.color}`}>
                        采集 {fetchCount} 次 · {conf.label}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
            )
          })()}
        </div>

        {/* 注入摘要 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 leading-relaxed">
          {templateType === 'only_opportunity' ? (
            '将注入：仅商机信息'
          ) : selectedGids.length === 0 ? (
            '将注入：商机信息（未选择监控商品）'
          ) : (
            <>将注入：<strong>商机信息</strong> + <strong>{selectedGids.length} 个监控商品</strong>（{
              selectedGids.map(g => {
                const found = monitoredItems.find(m => m.gid === g)
                return found?.title ?? g
              }).join('、')
            }）</>
          )}
        </div>

        {/* 保存状态提示 */}
        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            保存中...
          </div>
        )}
      </div>
    </Modal>
  )
}
