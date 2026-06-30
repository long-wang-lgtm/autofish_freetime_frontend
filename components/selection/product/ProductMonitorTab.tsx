'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMonitorItems,
  removeMonitorItem,
  activateMonitorItem,
  cancelMonitorItem,
  storedMonitorItem,
  updateMonitorItemPriority,
  dtoToProductItem,
  getProductSortValue,
  type ProductSortKey,
  type ProductItem,
} from '@/lib/api/selection'
import { ChevronUp, ChevronDown, Search, Trash2, ChevronRight, Filter } from 'lucide-react'
import { MiniTrendChart } from '@/components/selection/product/MiniTrendChart'
import { ProductDiagnosticDrawer } from '@/components/selection/product/ProductDiagnosticDrawer'
import { ProductFocusCard } from '@/components/selection/product/ProductFocusCard'
import {
  STATUS_MAP,
  ANOMALY_CATEGORY_MAP,
  ANOMALY_DISPLAY,
  type AnomalyDisplayCategory,
} from '@/components/selection/product/constants'
import { COLUMNS, GRID_COLS, GROUP_STYLE, type ColumnDef } from '@/components/selection/product/columnDefs'
import { detectAnomalies } from '@/components/selection/product/hourlyTrendUtils'
import { fmtPrice, fmtPercent, fmtGrowth, fmtAcceleration } from '@/lib/utils/format'
import { useIsMobile } from '@/hooks/useIsMobile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/EmptyState'

// ===== 格式化工具（仅本文件使用） =====

function fmtRatio(ratio: number | null): string {
  if (ratio === null) return '-'
  return ratio.toFixed(2)
}

function fmtDaily(daily: number | null): string {
  if (daily === null) return '-'
  return daily.toFixed(1)
}

function getBarPct(val: number, max: number): string {
  return max > 0 && val > 0 ? `${Math.max(3, Math.round((val / max) * 100))}%` : '0%'
}

/** 从 ProductItem 提取归类后的异常类别列表（去重，按展示优先级排序） */
function getAnomalyCategories(product: ProductItem): AnomalyDisplayCategory[] {
  const alerts = detectAnomalies(product.windowsMetrics, product.hourlyTrend)

  // 额外检测 acceleration 升温信号（detectAnomalies 不包含此逻辑）
  if (product.acceleration != null && product.acceleration > 0.3) {
    alerts.push({
      type: 'acceleration_heat',
      severity: 'red',
      message: `升温信号 +${(product.acceleration * 100).toFixed(0)}%`,
    })
  }

  const categories = new Set<AnomalyDisplayCategory>()
  for (const a of alerts) {
    const cat = ANOMALY_CATEGORY_MAP[a.type]
    if (cat) categories.add(cat)
  }

  // 按严重度排序：heat > price > inventory
  const order: AnomalyDisplayCategory[] = ['heat', 'price', 'inventory']
  return order.filter(c => categories.has(c))
}

// ===== 组件 =====

export function ProductMonitorTab() {
  const [searchText, setSearchText] = useState('')
  const [sortKey, setSortKey] = useState<ProductSortKey>('d7DailyWant')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingPriority, setEditingPriority] = useState<string | null>(null)
  const [aiReportOpen, setAiReportOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [anomalyFilterOn, setAnomalyFilterOn] = useState(false)
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const PAGE_SIZE = 20

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['monitor-items'],
    queryFn: ({ pageParam = 1 }) => listMonitorItems(pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) => {
      // 返回条数少于 pageSize 说明已是最后一页
      if (lastPage.items.length < PAGE_SIZE) return undefined
      return allPages.length + 1
    },
    initialPageParam: 1,
  })

  const items = useMemo(() => data?.pages.flatMap(p => p.items) ?? [], [data])
  const lastFetchLogs = useMemo(() => data?.pages.flatMap(p => p.lastFetchLogs) ?? [], [data])

  // 哨兵可见时加载下一页
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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

  const handleStored = useCallback(async (gid: string) => {
    await storedMonitorItem(gid)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const handlePriorityChange = useCallback(async (gid: string, priority: number) => {
    await updateMonitorItemPriority(gid, priority)
    setEditingPriority(null)
    queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
  }, [queryClient])

  const handleSort = useCallback((key: ProductSortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const logMap = useMemo(() => new Map(lastFetchLogs.map(l => [l.gid, l])), [lastFetchLogs])

  const products = useMemo(() =>
    items.map(item => dtoToProductItem(item, logMap.get(item.gid))),
    [items, logMap]
  )

  // 预计算每个商品的异常类别（供列表列和筛选使用）
  const anomalyMap = useMemo(() => {
    const map = new Map<string, AnomalyDisplayCategory[]>()
    for (const p of products) {
      map.set(p.id, getAnomalyCategories(p))
    }
    return map
  }, [products])

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
    if (anomalyFilterOn) {
      result = result.filter(p => {
        const cats = anomalyMap.get(p.id)
        return cats && cats.length > 0
      })
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
  }, [products, searchText, sortKey, sortDir, anomalyFilterOn, anomalyMap])

  // 数据条最大值
  const dataBarMax = useMemo(() => ({
    price: Math.max(...filtered.map(p => p.price), 1),
  }), [filtered])

  // ===== 单元格渲染 =====

  const renderCell = useCallback((p: typeof filtered[number], col: ColumnDef) => {
    switch (col.key) {
      // ── 商品信息（描述 + GID链接 + 状态 + 优先级 + 入库）──
      case 'title': {
        const s = STATUS_MAP[p.monitorStatus ?? -1]
        const isInteractive = p.monitorStatus === 0 || p.monitorStatus === 1
        const isEditing = editingPriority === p.id

        return (
          <div className="min-w-0 py-0.5 pr-3">
            {/* 第1行：描述 */}
            {p.description ? (
              <div className="text-sm text-gray-800 leading-snug line-clamp-2">
                {p.description}
              </div>
            ) : (
              <div className="text-sm text-gray-400 leading-snug italic">无描述</div>
            )}

            {/* 第2行：GID链接 + 状态badge + 优先级pill + 入库按钮 */}
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {/* GID 链接 */}
              <a
                href={`https://www.goofish.com/item?id=${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-gray-500 font-mono border-b border-dotted border-gray-300 hover:text-gray-700 transition-colors"
                title="在闲鱼打开"
              >
                {p.id} ↗
              </a>

              {/* 监控状态 badge */}
              {s && isInteractive ? (
                <button
                  onClick={(e) => { e.stopPropagation(); p.monitorStatus === 1 ? handleCancel(p.id) : handleActivate(p.id) }}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text} hover:opacity-80 transition-opacity cursor-pointer`}
                  title={p.monitorStatus === 1 ? '点击暂停监控' : '点击启用监控'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ) : s ? (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              ) : (
                <span className="text-xs text-gray-400">-</span>
              )}

              {/* 优先级 pill（null 时隐藏） */}
              {p.priority !== null && (
                isEditing ? (
                  <select
                    value={p.priority}
                    onChange={(e) => {
                      e.stopPropagation()
                      handlePriorityChange(p.id, Number(e.target.value))
                    }}
                    onBlur={() => setEditingPriority(null)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-1 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer"
                    autoFocus
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingPriority(p.id) }}
                    className="text-xs px-1 py-0.5 rounded-full bg-amber-50 text-amber-700 cursor-text hover:bg-amber-100 transition-colors"
                    title="点击编辑优先级"
                  >
                    ⚡{p.priority}
                  </button>
                )
              )}

              {/* 入库按钮（已入库时隐藏） */}
              {p.monitorStatus !== 4 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleStored(p.id) }}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                  title="添加入库(商机库)"
                >
                  +入库
                </button>
              )}
            </div>
          </div>
        )
      }

      // ── 核心快照（带数据条）──
      case 'price': {
        const pct = getBarPct(p.price, dataBarMax.price)
        const pt = p.priceTrend
        return (
          <span className="relative block w-full text-center">
            <span className="absolute left-0 top-0 bottom-0 rounded-sm bg-gradient-to-r from-amber-200/50 to-amber-100/20" style={{ width: pct }} />
            <span className="relative flex flex-col items-center">
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmtPrice(p.price)}</span>
              {pt === 'up' && <span className="text-xs font-semibold text-green-600">(↑提价)</span>}
              {pt === 'down' && <span className="text-xs font-semibold text-red-600">(↓降价)</span>}
              {pt === 'flat' && <span className="text-xs text-gray-400">(→平稳)</span>}
              {pt == null && <span className="text-xs text-gray-400">(-)</span>}
            </span>
          </span>
        )
      }

      // ── 转化质量 ──
      case 'd7IfRatio': {
        const val = p.d7IfRatio
        const wm = p.windowsMetrics
        const d1v = wm?.d1?.if_ratio
        const d3v = wm?.d3?.if_ratio
        return (
          <span
            className="text-xs text-gray-700 tabular-nums cursor-help"
            title={val != null && (d1v != null || d3v != null)
              ? `D1: ${d1v?.toFixed(2) ?? '-'}  |  D3: ${d3v?.toFixed(2) ?? '-'}  |  D7: ${val.toFixed(2)}`
              : (val == null ? '收藏数为零，无法计算' : undefined)
            }
          >
            {fmtRatio(val)}
          </span>
        )
      }
      case 'd7InquiryRate':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtPercent(p.d7InquiryRate)}</span>
      case 'd7FavoriteRate':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtPercent(p.d7FavoriteRate)}</span>

      // ── 日均量 ──
      case 'd7DailyWant':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDaily(p.d7DailyWant)}</span>
      case 'd7DailyLook':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDaily(p.d7DailyLook)}</span>

      // ── 增长信号 ──
      case 'd7BrowseGrowth': {
        const v = p.d7BrowseGrowth
        const color = v == null ? 'text-gray-400' : v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-400'
        return (
          <span className={`text-xs font-semibold tabular-nums ${color}`}>
            {fmtGrowth(v)}
          </span>
        )
      }
      case 'acceleration': {
        const v = p.acceleration
        const color = v == null ? 'text-gray-400'
          : v > 0.3 ? 'text-red-500'
          : v < -0.3 ? 'text-blue-500'
          : 'text-gray-500'
        return (
          <span className={`text-xs font-semibold tabular-nums ${color}`}>
            {fmtAcceleration(v)}
          </span>
        )
      }

      // ── 趋势信号（三列，迷你图+指标）──
      case 'wantTrend': {
        const htData = p.hourlyTrend?.hourly_want_rate ?? []
        return (
          <MiniTrendChart
            hourlyData={htData.slice(-21)}
            slope={(p.trendDirection?.want_slope as 'up' | 'down' | 'flat' | undefined) ?? null}
            dailyAvg={p.d7DailyWant}
            cv={p.wantStability}
            color="amber"
          />
        )
      }
      case 'lookTrend': {
        const htData = p.hourlyTrend?.hourly_look_rate ?? []
        return (
          <MiniTrendChart
            hourlyData={htData.slice(-21)}
            slope={(p.trendDirection?.look_slope as 'up' | 'down' | 'flat' | undefined) ?? null}
            dailyAvg={p.d7DailyLook}
            cv={p.lookStability}
            color="blue"
          />
        )
      }
      case 'collectTrend': {
        const htData = p.hourlyTrend?.hourly_collect_rate ?? []
        return (
          <MiniTrendChart
            hourlyData={htData.slice(-21)}
            slope={(p.trendDirection?.collect_slope as 'up' | 'down' | 'flat' | undefined) ?? null}
            dailyAvg={p.d7DailyCollect}
            cv={p.collectStability}
            color="violet"
          />
        )
      }

      // ── 异常标记 ──
      case 'anomalies': {
        const cats = anomalyMap.get(p.id) ?? []
        if (cats.length === 0) return <span className="text-xs text-gray-400">-</span>
        const visible = cats.slice(0, 2)
        const overflow = cats.length - 2
        return (
          <div className="flex flex-col items-center gap-0.5">
            {visible.map(cat => {
              const d = ANOMALY_DISPLAY[cat]
              return (
                <span
                  key={cat}
                  className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium leading-none ${d.bg} ${d.text}`}
                >
                  {d.label}
                </span>
              )
            })}
            {overflow > 0 && (
              <span className="text-xs text-gray-400 leading-none">+{overflow}</span>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }, [dataBarMax, editingPriority, handleActivate, handleCancel, handleStored, handlePriorityChange, anomalyMap])

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
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索描述、标题、关键词..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
            />
          </div>
          {/* 异常筛选 */}
          <button
            onClick={() => setAnomalyFilterOn(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              anomalyFilterOn
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
            }`}
            aria-label="仅显示有异常的商品"
          >
            <Filter className="w-3 h-3" />
            异常
          </button>
          <div className="ml-auto text-sm text-gray-500">
            监控中 <span className="font-semibold text-gray-700">{items.length}</span> 件
          </div>
        </div>
      </div>

      {/* ── 数据表格 / 移动端焦点卡片 ── */}
      {isMobile ? (
        /* 移动端：焦点卡片视图（一次展示一条完整记录） */
        <ProductFocusCard
          products={filtered}
          isLoading={isLoading}
          anomalyMap={anomalyMap}
          onSelectProduct={setSelectedProductId}
          selectedProductId={selectedProductId}
        />
      ) : (
        /* 桌面端：完整数据表格 */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="max-h-[calc(100vh-280px)] overflow-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={searchText ? '无匹配商品' : '暂无监控商品'}
                description={searchText ? '试试其他关键词' : '请在「关键词采集」中添加关键词并触发采集'}
                size="sm"
              />
            ) : (
              <div>
                <div className="min-w-[1400px]">
                  {/* ── 表头 ── */}
                  <div
                    className="grid px-4 pt-3 pb-3 text-sm font-medium text-gray-500 bg-gray-50 select-none sticky top-0 z-10 gap-x-2"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    {COLUMNS.map(col => {
                      const isActive = sortKey === col.key
                      const isIdentity = col.group === 'identity'
                      const isUnsortable = col.unsortable === true
                      return isUnsortable ? (
                        <div
                          key={col.key}
                          className="flex items-center justify-center text-gray-500"
                        >
                          <span>{col.label}</span>
                        </div>
                      ) : (
                        <button
                          key={col.key}
                          onClick={() => handleSort(col.key as ProductSortKey)}
                          className={`
                            group flex items-center gap-1
                            transition-all duration-150
                            ${isIdentity ? 'justify-start sticky left-0 z-20 -ml-5 pl-5' : 'justify-center'}
                            ${isActive
                              ? 'text-blue-700 bg-blue-50/60 rounded-lg -mx-0.5 px-0.5'
                              : isIdentity
                                ? 'bg-gray-50 hover:text-gray-700'
                                : 'hover:text-gray-700'
                            }
                          `}
                        >
                          {!isIdentity && <SortIcon colKey={col.key as ProductSortKey} />}
                          <span>{col.label}</span>
                          {isIdentity && <SortIcon colKey={col.key as ProductSortKey} />}
                        </button>
                      )
                    })}
                  </div>

                  {/* ── 分组色条（表头下方）── */}
                  <div
                    className="grid px-4 pb-1 border-b border-gray-100 sticky top-[34px] z-10 bg-white gap-x-2"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    {COLUMNS.map(col => {
                      const isIdentity = col.group === 'identity'
                      return (
                        <div key={`bar-${col.key}`} className={isIdentity ? 'sticky left-0 z-20 bg-white -ml-5 pl-5' : ''}>
                          {col.group !== 'identity' && (
                            <div className={`h-[3px] rounded-t-sm ${GROUP_STYLE[col.group].bar}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* ── 数据行 ── */}
                  <div className="divide-y divide-gray-50">
                    {filtered.map(p => {
                      const isSelected = selectedProductId === p.id
                      return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(prev => prev === p.id ? null : p.id)}
                        className={`group grid px-4 py-3 items-center transition-all duration-200 cursor-pointer gap-x-2 ${
                          isSelected
                            ? 'bg-blue-50/60 hover:bg-blue-50/70'
                            : 'hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent'
                        }${p.monitorStatus != null && p.monitorStatus !== 1 ? ' opacity-60' : ''}`}
                        style={{ gridTemplateColumns: GRID_COLS }}
                      >
                        {COLUMNS.map(col => {
                          const isIdentity = col.group === 'identity'
                          return (
                            <div
                              key={col.key}
                              className={
                                isIdentity
                                  ? `text-left sticky left-0 z-10 -ml-5 pl-5 ${
                                      isSelected
                                        ? 'bg-blue-100 group-hover:bg-blue-200'
                                        : 'bg-white group-hover:bg-blue-50'
                                    }`
                                  : 'text-center flex items-center justify-center'
                              }
                            >
                              {renderCell(p, col)}
                            </div>
                          )
                        })}

                        {/* 行操作 */}
                        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(p.id) }}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ); })}

                    {/* 滚动哨兵：可见时自动加载下一页 */}
                    <div ref={sentinelRef} className="h-px" />
                    {isFetchingNextPage && (
                      <div className="text-center py-3 text-xs text-gray-400">加载更多...</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI 分析报告（折叠）── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setAiReportOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
        >
          <h3 className="font-semibold text-gray-900 text-sm">AI 商品分析报告</h3>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${aiReportOpen ? 'rotate-90' : ''}`} />
        </button>
        {aiReportOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center py-4">
              基于监控商品的 AI 潜力分析报告将展示在这里
            </p>
          </div>
        )}
      </div>

      <ProductDiagnosticDrawer
        product={selectedProductId ? filtered.find(p => p.id === selectedProductId) ?? null : null}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  )
}
