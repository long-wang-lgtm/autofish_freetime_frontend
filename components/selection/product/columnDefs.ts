import type { ProductSortKey } from '@/lib/api/selection'

// ===== 列分组定义 =====

export type ColumnGroup = 'identity' | 'core' | 'conversion' | 'daily' | 'growth' | 'trend'

export const GROUP_STYLE: Record<ColumnGroup, { bar: string }> = {
  identity:   { bar: '' },
  core:       { bar: 'bg-gradient-to-r from-amber-300 to-amber-400' },
  conversion: { bar: 'bg-gradient-to-r from-sky-300 to-sky-400' },
  daily:      { bar: 'bg-gradient-to-r from-teal-300 to-teal-400' },
  growth:     { bar: 'bg-gradient-to-r from-emerald-300 to-emerald-400' },
  trend:      { bar: 'bg-gradient-to-r from-rose-300 to-rose-400' },
}

export interface ColumnDef {
  key: ProductSortKey | 'anomalies'
  label: string
  group: ColumnGroup
  groupStart: boolean
  dataBar?: boolean
  /** 非排序列（如异常标记列），点击表头不触发排序 */
  unsortable?: boolean
}

/** 表格 Grid 列模板，表头 / 分组色条 / 数据行共用 */
export const GRID_COLS = '3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr 2fr 2fr 90px 40px'

export const COLUMNS: ColumnDef[] = [
  // ── 📦 商品标识 (identity) ──
  { key: 'title',             label: '商品信息', group: 'identity',   groupStart: true },
  // ── 📊 核心快照 (core, amber) ──
  { key: 'price',             label: '价格',     group: 'core',       groupStart: true,  dataBar: true },
  // ── 📈 转化质量 (conversion, sky) ──
  { key: 'd7IfRatio' as ProductSortKey,       label: '7天询藏比', group: 'conversion', groupStart: true },
  { key: 'd7InquiryRate' as ProductSortKey,   label: '7天询单率', group: 'conversion', groupStart: false },
  { key: 'd7FavoriteRate' as ProductSortKey,  label: '7天收藏率', group: 'conversion', groupStart: false },
  // ── 📐 日均量 (daily, teal) ──
  { key: 'd7DailyWant' as ProductSortKey,     label: '日均想要',  group: 'daily',      groupStart: true },
  { key: 'd7DailyLook' as ProductSortKey,     label: '日均浏览',  group: 'daily',      groupStart: false },
  // ── 🚀 增长信号 (growth, emerald) ──
  { key: 'd7BrowseGrowth' as ProductSortKey,  label: '流量增速',  group: 'growth',     groupStart: true },
  { key: 'acceleration' as ProductSortKey,    label: '升温信号',  group: 'growth',     groupStart: false },
  // ── 📈 趋势信号 (trend, rose) ──
  { key: 'wantTrend' as ProductSortKey,       label: '想要趋势',  group: 'trend',      groupStart: true },
  { key: 'lookTrend' as ProductSortKey,       label: '浏览趋势',  group: 'trend',      groupStart: false },
  { key: 'collectTrend' as ProductSortKey,    label: '收藏趋势',  group: 'trend',      groupStart: false },
  // ── 🚨 异常标记 ──
  { key: 'anomalies',       label: '异常',     group: 'core',       groupStart: false, unsortable: true },
]
