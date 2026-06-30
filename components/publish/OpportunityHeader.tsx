'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Opportunity, updateOpportunity } from '@/lib/api/opportunities'

interface OpportunityHeaderProps {
  opportunity: Opportunity
  accounts: { uid: string; name: string }[]
  onRefreshOpportunities: () => void
}

export function OpportunityHeader({ opportunity, accounts, onRefreshOpportunities }: OpportunityHeaderProps) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('publish_header_expanded') === 'true'
    }
    return false
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editingName, setEditingName] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    name: opportunity.name,
    price: opportunity.price,
    item_group_id: opportunity.item_group_id ?? '',
    source_description: opportunity.source_description,
  })

  // 切换商机时重置表单
  useEffect(() => {
    setForm({
      name: opportunity.name,
      price: opportunity.price,
      item_group_id: opportunity.item_group_id ?? '',
      source_description: opportunity.source_description,
    })
    setSaveStatus('idle')
    setEditingName(false)
  }, [opportunity.id])

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

  const toggleExpanded = () => {
    setExpanded(prev => {
      const next = !prev
      localStorage.setItem('publish_header_expanded', String(next))
      return next
    })
  }

  const images = opportunity.images

  return (
    <div className="flex-shrink-0">
      {/* 折叠行 — 始终可见 */}
      <div className="flex items-center gap-2.5 px-4 h-[44px]">
        {/* 展开/折叠 — 左置 */}
        <button
          onClick={toggleExpanded}
          className="text-gray-400 hover:text-gray-600 transition-colors select-none flex-shrink-0 leading-none"
          title={expanded ? '折叠' : '展开'}
        >
          <span className="text-xs">{expanded ? '▼' : '▶'}</span>
        </button>

        {/* 名称 — 点击编辑 */}
        {editingName ? (
          <input
            value={form.name}
            onChange={e => updateField('name', e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => {
              if (e.key === 'Enter') setEditingName(false)
            }}
            className="font-semibold text-sm text-gray-900 bg-white border border-blue-400 rounded-lg px-1.5 py-0.5 focus:outline-none flex-shrink-0 w-auto max-w-[360px]"
            placeholder="商机名称"
            autoFocus
          />
        ) : (
          <span
            onClick={() => setEditingName(true)}
            className="font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 rounded-lg px-1.5 py-0.5 truncate transition-colors flex-shrink-0 max-w-[240px]"
            title="点击编辑名称"
          >
            {form.name || <span className="text-gray-300">商机名称</span>}
          </span>
        )}

        {/* 徽章 + 元信息 — 自然跟随名称，不推到最右 */}
        <span className={`px-1.5 py-0.5 rounded-full border text-sm flex-shrink-0 ${statusBadge.color}`}>
          {statusBadge.label}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full border text-sm flex-shrink-0 ${sourceBadge.color}`}>
          {sourceBadge.label}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{opportunity.item_count} 素材</span>
        <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">¥{form.price}</span>
      </div>

      {/* 展开的详情区 */}
      {expanded && (
        <div className="flex gap-4 px-4 pb-3 border-t border-gray-100">
          {/* 左栏：图片 + 辅助字段 */}
          <div className="flex-shrink-0 w-[136px] pt-3 flex flex-col gap-3">
            {/* 商品图片 */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img.url}
                    alt={`商品图${i + 1}`}
                    className="w-[62px] h-[62px] object-cover rounded-lg border border-gray-100 hover:ring-2 hover:ring-blue-300 hover:scale-105 transition-all cursor-pointer"
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-[100px] bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                <span className="text-3xl text-gray-300">📷</span>
              </div>
            )}

            {/* 价格 */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">价格</span>
              <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-blue-400 transition-all">
                <span className="text-gray-400 text-sm">¥</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => updateField('price', parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent focus:outline-none text-right font-medium text-gray-700 tabular-nums text-sm"
                  step="0.01"
                />
              </div>
            </div>

            {/* 商品组 */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">商品组</span>
              <input
                value={form.item_group_id}
                onChange={e => updateField('item_group_id', e.target.value)}
                className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-400 rounded-lg px-3 py-1 focus:outline-none text-gray-600 font-mono text-sm transition-all"
                placeholder="—"
              />
            </div>
          </div>

          {/* 右栏：来源描述 — 主角，给足高度 */}
          <div className="flex-1 min-w-0 pt-3 flex flex-col min-h-0">
            <span className="text-xs text-gray-400 uppercase tracking-wide flex-shrink-0 mb-1">描述</span>
            <textarea
              value={form.source_description}
              onChange={e => updateField('source_description', e.target.value)}
              className="flex-1 w-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-100 hover:border-gray-200 focus:border-blue-400 rounded-lg px-3 py-2 focus:outline-none text-gray-700 resize-none text-sm leading-relaxed transition-all min-h-[140px]"
              placeholder="输入或粘贴来源描述（作为 AI 改写的核心参考）..."
            />
            {/* 保存状态 */}
            <div className="flex justify-end mt-1.5 flex-shrink-0">
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
      )}
    </div>
  )
}
