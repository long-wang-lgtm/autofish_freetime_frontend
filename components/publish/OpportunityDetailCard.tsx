'use client'
import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Opportunity, updateOpportunity } from '@/lib/api/opportunities'

interface OpportunityDetailCardProps {
  opportunity: Opportunity
  accounts: { uid: string; name: string }[]
  onRefreshOpportunities: () => void
}

export function OpportunityDetailCard({ opportunity, accounts, onRefreshOpportunities }: OpportunityDetailCardProps) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    name: opportunity.name,
    price: opportunity.price,
    tags: opportunity.tags.join(', '),
    item_group_id: opportunity.item_group_id ?? '',
    source_description: opportunity.source_description,
  })

  const statusBadge = {
    active: { label: '活跃', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    archived: { label: '已归档', color: 'bg-gray-50 text-gray-400 border-gray-200' },
  }[opportunity.status] ?? { label: opportunity.status, color: 'bg-gray-50 text-gray-400 border-gray-200' }

  const sourceBadge = {
    collection: { label: '采集', color: 'bg-indigo-50 text-indigo-500 border-indigo-100' },
    manual: { label: '手工', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  }[opportunity.source_type] ?? { label: opportunity.source_type, color: 'bg-gray-50 text-gray-500 border-gray-200' }

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Opportunity>) => updateOpportunity(opportunity.id, data),
    onSuccess: () => {
      setSaveStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      onRefreshOpportunities()
    },
    onError: () => setSaveStatus('error'),
  })

  const scheduleSave = useCallback((patch: Record<string, unknown>) => {
    setSaveStatus('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate(patch as Partial<Opportunity>)
    }, 500)
  }, [saveMutation])

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    scheduleSave({ [field]: value })
  }

  const images = opportunity.images

  return (
    <div className="flex gap-4 px-4 py-2 h-full overflow-hidden">
      {/* 左：图片栏 */}
      <div className="flex-shrink-0 w-[120px]">
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {images.slice(0, 4).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={img.url}
                alt={`商品图${i + 1}`}
                className="w-[56px] h-[56px] object-cover rounded-md border border-gray-100 hover:ring-2 hover:ring-blue-300 hover:scale-105 transition-all cursor-pointer"
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-[88px] bg-gray-50 rounded-md border border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-3xl text-gray-300">📷</span>
          </div>
        )}
      </div>

      {/* 右：信息区 */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* 固定行：名称 + 徽章 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <input
            value={form.name}
            onChange={e => updateField('name', e.target.value)}
            className="flex-1 min-w-0 font-semibold text-sm text-gray-900 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:bg-white"
            placeholder="商机名称"
          />
          <span className={`px-1.5 py-0.5 rounded border text-sm flex-shrink-0 ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
          <span className={`px-1.5 py-0.5 rounded border text-sm flex-shrink-0 ${sourceBadge.color}`}>
            {sourceBadge.label}
          </span>
          <span className="text-gray-400 flex-shrink-0 tabular-nums">{opportunity.item_count} 素材</span>
        </div>

        {/* 固定行：价格 + 商品组 */}
        <div className="flex items-center gap-4 mt-2 flex-shrink-0">
          <span className="text-gray-400 flex-shrink-0 text-sm uppercase tracking-wide">价格</span>
          <div className="flex items-center bg-gray-50 rounded-md px-2 py-0.5 hover:bg-white hover:shadow-sm focus-within:bg-white focus-within:shadow-sm focus-within:ring-2 focus-within:ring-blue-400 transition-all">
            <span className="text-gray-400 text-sm">¥</span>
            <input
              type="number"
              value={form.price}
              onChange={e => updateField('price', parseFloat(e.target.value) || 0)}
              className="w-24 bg-transparent focus:outline-none text-right font-medium text-gray-700 tabular-nums"
              step="0.01"
            />
          </div>
          <span className="text-gray-400 flex-shrink-0 text-sm uppercase tracking-wide ml-2">商品组</span>
          <input
            value={form.item_group_id}
            onChange={e => updateField('item_group_id', e.target.value)}
            className="flex-1 min-w-0 bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-400 rounded-md px-2 py-0.5 focus:outline-none text-gray-600 font-mono text-sm transition-all"
            placeholder="—"
          />
        </div>

        {/* 固定行：标签 */}
        <div className="flex items-center gap-2 mt-2 flex-shrink-0">
          <span className="text-gray-400 flex-shrink-0 text-sm uppercase tracking-wide">标签</span>
          <input
            value={form.tags}
            onChange={e => updateField('tags', e.target.value)}
            className="flex-1 min-w-0 bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-400 rounded-md px-2 py-0.5 focus:outline-none text-gray-600 transition-all"
            placeholder="逗号分隔"
          />
          {form.tags && (
            <div className="flex gap-1 flex-shrink-0">
              {form.tags.split(/[,，]/).filter(Boolean).map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs border border-gray-200/50">
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 展开/折叠按钮 — 在左侧 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-2 text-sm text-gray-400 hover:text-gray-600 transition-colors select-none group flex-shrink-0"
        >
          <span className="text-xs transition-transform duration-200 group-hover:translate-x-0.5">
            {expanded ? '▼' : '▶'}
          </span>
          <span className="tracking-wide">来源描述</span>
          {!expanded && form.source_description && (
            <span className="text-gray-300 truncate max-w-[200px]">— {form.source_description.slice(0, 40)}{form.source_description.length > 40 ? '...' : ''}</span>
          )}
        </button>

        {/* 展开区：来源描述 — 填充剩余高度 */}
        {expanded && (
          <div className="flex-1 min-h-0 mt-1 pl-3 border-l-2 border-blue-100">
            <textarea
              value={form.source_description}
              onChange={e => updateField('source_description', e.target.value)}
              className="w-full h-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-100 hover:border-gray-200 focus:border-blue-400 rounded-md px-2 py-1 focus:outline-none text-gray-600 resize-none text-sm leading-relaxed transition-all"
              placeholder="输入或粘贴来源描述..."
            />
          </div>
        )}

        {/* 保存状态 */}
        <div className="flex justify-end mt-1 flex-shrink-0">
          <span className={`text-xs transition-colors duration-300 ${
            saveStatus === 'idle' ? 'text-transparent' :
            saveStatus === 'saving' ? 'text-blue-400' :
            saveStatus === 'saved' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : saveStatus === 'error' ? '保存失败' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
