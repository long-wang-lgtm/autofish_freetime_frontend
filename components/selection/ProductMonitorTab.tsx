'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMonitorItems,
  removeMonitorItem,
  activateMonitorItem,
  cancelMonitorItem,
  dtoToProductItem,
  getProductSortValue,
  type ProductSortKey,
} from '@/lib/api/selection'
import { ChevronUp, ChevronDown, Search, Trash2, ChevronRight, Check } from 'lucide-react'

// ===== 格式化工具 =====

function fmtPercent(rate: number | null): string {
  if (rate === null) return '-'
  return `${(rate * 100).toFixed(1)}%`
}

function fmtRatio(ratio: number | null): string {
  if (ratio === null) return '-'
  return ratio.toFixed(1)
}

function fmtDaily(daily: number | null): string {
  if (daily === null) return '-'
  return daily.toFixed(1)
}

function fmtMoney(amount: number | null): string {
  if (amount === null) return '-'
  return `¥${amount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
}

function fmtOrders(orders: number | null): string {
  if (orders === null) return '-'
  return String(Math.round(orders))
}

function fmtDays(days: number | null): string {
  if (days === null) return '-'
  return String(Math.round(days))
}

function fmtCount(count: number): string {
  return count.toLocaleString('zh-CN')
}

function fmtPrice(price: number): string {
  return `¥${price.toLocaleString('zh-CN')}`
}

function fmtDate(isoString: string | null): string {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return '-'
  }
}

// ===== 列分组定义 =====

type ColumnGroup = 'identity' | 'core' | 'conversion' | 'time' | 'value' | 'meta'

const GROUP_STYLE: Record<ColumnGroup, { bar: string }> = {
  identity:   { bar: '' },
  core:       { bar: 'bg-gradient-to-r from-amber-300 to-amber-400' },
  conversion: { bar: 'bg-gradient-to-r from-sky-300 to-sky-400' },
  time:       { bar: 'bg-gradient-to-r from-gray-300 to-gray-400' },
  value:      { bar: 'bg-gradient-to-r from-emerald-300 to-emerald-400' },
  meta:       { bar: 'bg-gradient-to-r from-violet-300 to-violet-400' },
}

interface ColumnDef {
  key: ProductSortKey | 'keywords' | 'monitorStatus'
  label: string
  width: string
  group: ColumnGroup
  groupStart: boolean
  dataBar?: boolean
}

const GROUP_GAP = 'ml-2'

const COLUMNS: ColumnDef[] = [
  // ── 📦 商品标识 ──
  { key: 'title',             label: '商品信息',       width: 'flex-1 min-w-[160px] max-w-[220px]', group: 'identity',   groupStart: true },
  // ── 📊 核心指标（amber）──
  { key: 'price',             label: '价格',           width: 'w-[72px] shrink-0',  group: 'core',       groupStart: true,  dataBar: true },
  { key: 'lookCount',         label: '浏览数',         width: 'w-[68px] shrink-0',  group: 'core',       groupStart: false, dataBar: true },
  { key: 'wantCount',         label: '想要数',         width: 'w-[64px] shrink-0',  group: 'core',       groupStart: false, dataBar: true },
  // ── 📈 转化效率（sky）──
  { key: 'wantCollectRatio',  label: '询藏比',         width: 'w-[64px] shrink-0',  group: 'conversion', groupStart: true },
  { key: 'inquiryRate',       label: '询单率',         width: 'w-[64px] shrink-0',  group: 'conversion', groupStart: false },
  { key: 'collectRate',       label: '收藏率',         width: 'w-[64px] shrink-0',  group: 'conversion', groupStart: false },
  // ── ⏱️ 时间规模（gray）──
  { key: 'dailyWant',         label: '日均询单',       width: 'w-[68px] shrink-0',  group: 'time',       groupStart: true },
  { key: 'daysSincePublish',  label: '上架天数',       width: 'w-[72px] shrink-0',  group: 'time',       groupStart: false },
  { key: 'publishedAt',       label: '上架时间',       width: 'w-[88px] shrink-0',  group: 'time',       groupStart: false },
  // ── 💰 商业价值（emerald）──
  { key: 'estimatedOrders',   label: '预估订单',       width: 'w-[80px] shrink-0',  group: 'value',      groupStart: true },
  { key: 'estimatedSales',    label: '预估销售额',     width: 'w-[104px] shrink-0', group: 'value',      groupStart: false },
  // ── 🏷️ 元数据（violet）──
  { key: 'keywords',          label: '关键词',         width: 'w-[110px] shrink-0', group: 'meta',       groupStart: true },
  { key: 'priority',          label: '优先级',         width: 'w-[56px] shrink-0',  group: 'meta',       groupStart: false },
  { key: 'monitorStatus',     label: '监控状态',       width: 'w-[72px] shrink-0',  group: 'meta',       groupStart: false },
]

// ===== 组件 =====

export function ProductMonitorTab() {
  const [searchText, setSearchText] = useState('')
  const [sortKey, setSortKey] = useState<ProductSortKey>('estimatedSales')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [copiedGid, setCopiedGid] = useState<string | null>(null)
  const [aiReportOpen, setAiReportOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['monitor-items'],
    queryFn: listMonitorItems,
  })

  const handleRemove = useCallback(async (gid: string) => {
    await removeMonitorItem(gid)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const handleActivate = useCallback(async (gid: string) => {
    await activateMonitorItem(gid)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const handleCancel = useCallback(async (gid: string) => {
    await cancelMonitorItem(gid)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const handleCopyGid = useCallback(async (gid: string) => {
    try {
      await navigator.clipboard.writeText(gid)
      setCopiedGid(gid)
      setTimeout(() => setCopiedGid(null), 2000)
    } catch {
      // clipboard not available
    }
  }, [])

  const handleSort = useCallback((key: ProductSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const products = useMemo(() => items.map(dtoToProductItem), [items])

  const filtered = useMemo(() => {
    let result = products
    if (searchText) {
      const q = searchText.toLowerCase()
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.shopName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.keywords.some(k => k.toLowerCase().includes(q))
      )
    }
    return [...result].sort((a, b) => {
      const va = getProductSortValue(a, sortKey)
      const vb = getProductSortValue(b, sortKey)
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      const na = typeof va === 'number' ? va : 0
      const nb = typeof vb === 'number' ? vb : 0
      return sortDir === 'asc' ? na - nb : nb - na
    })
  }, [products, searchText, sortKey, sortDir])

  // 数据条最大值
  const dataBarMax = useMemo(() => ({
    price: Math.max(...filtered.map(p => p.price), 1),
    lookCount: Math.max(...filtered.map(p => p.lookCount), 1),
    wantCount: Math.max(...filtered.map(p => p.wantCount), 1),
  }), [filtered])

  const getBarPct = (val: number, max: number) =>
    max > 0 && val > 0 ? `${Math.max(3, Math.round((val / max) * 100))}%` : '0%'

  // ===== 单元格渲染 =====

  const renderCell = useCallback((p: typeof filtered[number], col: ColumnDef) => {
    switch (col.key) {
      // ── 商品信息（描述 + GID，不显示标题）──
      case 'title':
        return (
          <div className="min-w-0 py-0.5 pr-2" title={p.description || p.id}>
            {p.description ? (
              <div className="text-[13px] text-gray-800 leading-snug line-clamp-2">
                {p.description}
              </div>
            ) : (
              <div className="text-[13px] text-gray-400 leading-snug italic">
                无描述
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleCopyGid(p.id) }}
              className="mt-0.5 text-[9px] text-gray-400 hover:text-gray-600 font-mono leading-snug truncate block w-full text-left transition-colors cursor-pointer select-none"
              title="点击复制商品 GID"
            >
              {copiedGid === p.id ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-500">
                  <Check className="w-2.5 h-2.5" /> 已复制
                </span>
              ) : (
                p.id
              )}
            </button>
          </div>
        )

      // ── 核心指标（带数据条）──
      case 'price': {
        const pct = getBarPct(p.price, dataBarMax.price)
        return (
          <span className="relative block w-full text-center px-1">
            <span className="absolute left-0 top-0 bottom-0 rounded-sm bg-gradient-to-r from-amber-200/50 to-amber-100/20" style={{ width: pct }} />
            <span className="relative text-[13px] font-semibold text-gray-900 tabular-nums">{fmtPrice(p.price)}</span>
          </span>
        )
      }
      case 'lookCount': {
        const pct = getBarPct(p.lookCount, dataBarMax.lookCount)
        return (
          <span className="relative block w-full text-center px-1">
            <span className="absolute left-0 top-0 bottom-0 rounded-sm bg-gradient-to-r from-amber-200/40 to-amber-100/10" style={{ width: pct }} />
            <span className="relative text-[13px] font-semibold text-gray-900 tabular-nums">{fmtCount(p.lookCount)}</span>
          </span>
        )
      }
      case 'wantCount': {
        const pct = getBarPct(p.wantCount, dataBarMax.wantCount)
        return (
          <span className="relative block w-full text-center px-1">
            <span className="absolute left-0 top-0 bottom-0 rounded-sm bg-gradient-to-r from-amber-200/60 to-amber-100/20" style={{ width: pct }} />
            <span className="relative text-[13px] font-semibold text-gray-900 tabular-nums">{fmtCount(p.wantCount)}</span>
          </span>
        )
      }

      // ── 转化效率 ──
      case 'wantCollectRatio':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtRatio(p.wantCollectRatio)}</span>
      case 'inquiryRate':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtPercent(p.inquiryRate)}</span>
      case 'collectRate':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtPercent(p.collectRate)}</span>

      // ── 时间规模 ──
      case 'dailyWant':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDaily(p.dailyWant)}</span>
      case 'daysSincePublish':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDays(p.daysSincePublish)}</span>
      case 'publishedAt':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDate(p.publishedAt)}</span>

      // ── 商业价值（绿色 pill）──
      case 'estimatedOrders':
        return (
          <span className="inline-flex items-center justify-center w-full text-xs font-semibold text-emerald-700 tabular-nums bg-gradient-to-br from-emerald-100/70 to-emerald-50/30 rounded-lg px-2 py-1">
            {fmtOrders(p.estimatedOrders)}
          </span>
        )
      case 'estimatedSales':
        return (
          <span className="inline-flex items-center justify-center w-full text-xs font-semibold text-emerald-700 tabular-nums bg-gradient-to-br from-emerald-100/70 to-emerald-50/30 rounded-lg px-2 py-1">
            {fmtMoney(p.estimatedSales)}
          </span>
        )

      // ── 元数据 ──
      case 'keywords':
        return (
          <div className="flex flex-wrap gap-1 justify-center">
            {p.keywords.length === 0 ? (
              <span className="text-xs text-gray-400">-</span>
            ) : (
              <>
                {p.keywords.slice(0, 2).map(kw => (
                  <span key={kw} className="text-[10px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 truncate max-w-[60px]" title={kw}>
                    {kw}
                  </span>
                ))}
                {p.keywords.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{p.keywords.length - 2}</span>
                )}
              </>
            )}
          </div>
        )
      case 'priority':
        return (
          <span className={`text-xs font-semibold tabular-nums ${
            p.priority === null ? 'text-gray-400' :
            p.priority >= 7 ? 'text-red-600' :
            p.priority >= 4 ? 'text-amber-600' :
            'text-gray-500'
          }`}>
            {p.priority ?? '-'}
          </span>
        )
      case 'monitorStatus': {
        const STATUS_MAP: Record<number, { label: string; dot: string; bg: string; text: string; interactive: boolean }> = {
          0: { label: '已暂停',   dot: 'bg-gray-400',   bg: 'bg-gray-100',   text: 'text-gray-500',   interactive: true },
          1: { label: '监控中',   dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', interactive: true },
          2: { label: '已分析',   dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    interactive: false },
          3: { label: '已发布',   dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700',  interactive: false },
        }
        const s = STATUS_MAP[p.monitorStatus ?? -1]
        if (!s) return <span className="text-xs text-gray-400">-</span>

        const badge = (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        )

        if (!s.interactive) return badge

        // 监控中 → 点击取消；已暂停 → 点击启用
        const isActive = p.monitorStatus === 1
        return (
          <button
            onClick={(e) => { e.stopPropagation(); isActive ? handleCancel(p.id) : handleActivate(p.id) }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
            title={isActive ? '点击暂停监控' : '点击启用监控'}
          >
            {badge}
          </button>
        )
      }

      default:
        return null
    }
  }, [copiedGid, dataBarMax, handleCopyGid, handleActivate, handleCancel])

  // ===== 排序图标 =====

  const SortIcon = useCallback(({ colKey }: { colKey: ProductSortKey }) => {
    if (sortKey !== colKey) return null
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 shrink-0" />
      : <ChevronDown className="w-3 h-3 shrink-0" />
  }, [sortKey, sortDir])

  // ===== 渲染 =====

  return (
    <div className="space-y-3">
      {/* ── 工具栏 ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索描述、标题、关键词..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
            />
          </div>
          <div className="ml-auto text-sm text-gray-500">
            监控中 <span className="font-semibold text-gray-700">{items.length}</span> 件
          </div>
        </div>
      </div>

      {/* ── 数据表格 ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <p className="text-center py-12 text-gray-400">加载中...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500 text-sm">
                {searchText ? '无匹配商品，试试其他关键词' : '暂无监控商品'}
              </p>
              {!searchText && (
                <p className="text-gray-400 text-xs mt-1.5">
                  请在「关键词采集」中添加关键词并触发采集
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1340px]">
                {/* ── 表头 ── */}
                <div className="flex px-5 pt-2.5 pb-2 text-[11px] font-medium text-gray-500 bg-gradient-to-b from-gray-50 to-gray-50/50 select-none">
                  {COLUMNS.map(col => {
                    const isActive = sortKey === col.key
                    const isGroupStart = col.groupStart && col.group !== 'identity'
                    const isIdentity = col.group === 'identity'
                    const unsortable = col.key === 'keywords' || col.key === 'monitorStatus'
                    return !unsortable ? (
                      <button
                        key={col.key}
                        onClick={() => handleSort(col.key as ProductSortKey)}
                        className={`
                          group flex items-center gap-1 ${col.width}
                          transition-all duration-150
                          ${isIdentity ? 'justify-start' : 'justify-center'}
                          ${isActive
                            ? 'text-blue-700 bg-blue-50/60 rounded-md -mx-0.5 px-0.5'
                            : 'hover:text-gray-700'
                          }
                          ${isGroupStart ? GROUP_GAP : ''}
                        `}
                      >
                        {!isIdentity && <SortIcon colKey={col.key as ProductSortKey} />}
                        <span>{col.label}</span>
                        {isIdentity && <SortIcon colKey={col.key as ProductSortKey} />}
                      </button>
                    ) : (
                      <div
                        key={col.key}
                        className={`flex items-center justify-center ${col.width} ${isGroupStart ? GROUP_GAP : ''}`}
                      >
                        <span>{col.label}</span>
                      </div>
                    )
                  })}
                  <div className="w-[40px] shrink-0" />
                </div>

                {/* ── 分组色条（表头下方）── */}
                <div className="flex px-5 pb-1 border-b border-gray-100">
                  {COLUMNS.map(col => {
                    const isGroupStart = col.groupStart && col.group !== 'identity'
                    return (
                      <div key={`bar-${col.key}`} className={`${col.width} ${isGroupStart ? GROUP_GAP : ''}`}>
                        {col.group !== 'identity' && (
                          <div className={`h-[3px] rounded-t-sm ${GROUP_STYLE[col.group].bar}`} />
                        )}
                      </div>
                    )
                  })}
                  <div className="w-[40px] shrink-0" />
                </div>

                {/* ── 数据行 ── */}
                <div className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <div
                      key={p.id}
                      className="group flex px-5 py-[12px] items-center hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-200"
                    >
                      {COLUMNS.map(col => {
                        const isGroupStart = col.groupStart && col.group !== 'identity'
                        const isIdentity = col.group === 'identity'
                        return (
                          <div
                            key={col.key}
                            className={`
                              ${col.width}
                              ${isIdentity ? 'text-left' : 'text-center flex items-center justify-center'}
                              ${isGroupStart ? GROUP_GAP : ''}
                            `}
                          >
                            {renderCell(p, col)}
                          </div>
                        )
                      })}

                      {/* 行操作 */}
                      <div className="w-[40px] shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleRemove(p.id)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AI 分析报告（折叠）── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setAiReportOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
        >
          <h3 className="font-semibold text-gray-900 text-sm">AI 商品分析报告</h3>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${aiReportOpen ? 'rotate-90' : ''}`} />
        </button>
        {aiReportOpen && (
          <div className="px-5 pb-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center py-4">
              基于监控商品的 AI 潜力分析报告将展示在这里
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
