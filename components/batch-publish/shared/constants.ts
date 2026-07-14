/**
 * 批量创作发布系统 — 共享常量
 *
 * 包含：状态映射、颜色配置、进度节点、筛选选项等。
 */

import type { MaterialStatus, TemplateType, RewriteStage } from '@/lib/api/batch-publish'

// ============================================================
// 素材状态映射（StatusBadge 配置）
// ============================================================

export const MATERIAL_STATUS_CONFIG: Record<MaterialStatus, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  pending:            { label: '待处理',   color: 'gray' },
  writing_done:       { label: '改写完成', color: 'amber' },
  genimageplan_done:  { label: '封面完成', color: 'amber' },
  genimage_done:      { label: '生图完成', color: 'amber' },
  published:          { label: '已发布',   color: 'green' },
  publish_failed:     { label: '发布失败', color: 'red' },
}

// ============================================================
// 素材状态 — 4 节点进度（StatusPipeline 使用）
// ============================================================

export type PipelineNode = 'rewrite' | 'genimageplan' | 'genimage' | 'publish'

export const PIPELINE_NODES: { key: PipelineNode; label: string }[] = [
  { key: 'rewrite',       label: '改写' },
  { key: 'genimageplan',  label: '封面' },
  { key: 'genimage',      label: '生图' },
  { key: 'publish',       label: '发布' },
]

/**
 * 根据素材状态推导 4 节点各自的完成状态。
 * 返回 4 元素数组，对应 [改写, 封面, 生图, 发布]。
 * - 'done' = 已完成
 * - 'pending' = 未开始
 * - 'failed' = 失败（仅发布节点可能出现）
 */
export function getPipelineState(status: MaterialStatus): ('done' | 'pending' | 'failed')[] {
  switch (status) {
    case 'pending':
      return ['pending', 'pending', 'pending', 'pending']
    case 'writing_done':
      return ['done', 'pending', 'pending', 'pending']
    case 'genimageplan_done':
      return ['done', 'done', 'pending', 'pending']
    case 'genimage_done':
      return ['done', 'done', 'done', 'pending']
    case 'published':
      return ['done', 'done', 'done', 'done']
    case 'publish_failed':
      return ['done', 'done', 'done', 'failed']
  }
}

// ============================================================
// 监控状态映射
// ============================================================

export const MONITOR_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0:    { label: '已暂停', color: 'gray' },
  1:    { label: '监控中', color: 'green' },
  2:    { label: '已分析', color: 'amber' },
  3:    { label: '已入库', color: 'amber' },
  '-100': { label: '已删除', color: 'red' },
}

// ============================================================
// 商机状态映射
// ============================================================

export const OPPORTUNITY_STATUS_CONFIG: Record<string, { label: string; color: 'green' | 'gray' }> = {
  active:   { label: '启用', color: 'green' },
  inactive: { label: '停用', color: 'gray' },
}

// ============================================================
// AI 上下文模板映射
// ============================================================

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  only_opportunity: '仅商机信息',
  with_item:        '商机+监控商品',
}

// ============================================================
// 发布记录 — 状态筛选选项
// ============================================================

export const MATERIALS_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'publish_failed', label: '发布失败' },
]

// ============================================================
// 商品监控 — 状态筛选选项
// ============================================================

export const MONITOR_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: '1', label: '监控中' },
  { value: '2', label: '已分析' },
  { value: '3', label: '已入库' },
  { value: '0', label: '已暂停' },
]

// ============================================================
// 绑定状态筛选选项
// ============================================================

export const BIND_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'bound', label: '已绑定' },
  { value: 'unbound', label: '未绑定' },
]

// ============================================================
// 素材表格 — 列宽配置（新 8 列）
// ============================================================

export const MATERIAL_GRID_COLS = '32px 1fr 2fr 0.6fr 0.8fr 0.8fr 1.8fr 0.3fr'

export const MATERIAL_HEADER_LABELS = [
  '',        // checkbox
  '封面图',   // images
  '描述',     // description
  '价格',     // price
  '账号',     // account
  '类目',     // category
  '进度+操作', // progress + action
  '',        // delete
] as const

// ============================================================
// React Query 缓存 Key 工厂
// ============================================================

export const queryKeys = {
  accounts: ['accounts'] as const,
  opportunities: (params: Record<string, unknown>) => ['batch-publish', 'opportunities', params] as const,
  materials: {
    byOid: (oid: number | undefined) => ['batch-publish', 'materials', oid] as const,
    overview: (page: number) => ['batch-publish', 'materials', 'overview', { page }] as const,
  },
  channel: (materialId: number) => ['batch-publish', 'channel', materialId] as const,
  monitoredItems: (oid: number | undefined) => ['batch-publish', 'monitored-items', 'workbench', oid] as const,
}

// ============================================================
// 进度+操作列 — 主按钮状态机
// ============================================================

export interface ActionButtonState {
  label: string
  stage?: 'write' | 'genimageplan' | 'genimage'
  isPublish?: boolean
  variant: 'primary' | 'success' | 'danger'
}

export function getActionButton(status: MaterialStatus): ActionButtonState {
  switch (status) {
    case 'pending':
      return { label: '改写', stage: 'write', variant: 'primary' }
    case 'writing_done':
      return { label: '封面', stage: 'genimageplan', variant: 'primary' }
    case 'genimageplan_done':
      return { label: '生图', stage: 'genimage', variant: 'primary' }
    case 'genimage_done':
      return { label: '发布', isPublish: true, variant: 'primary' }
    case 'published':
      return { label: '✓已发布', variant: 'success' }
    case 'publish_failed':
      return { label: '重试', isPublish: true, variant: 'danger' }
  }
}

export function getMoreActions(status: MaterialStatus): { label: string; stage: RewriteStage }[] {
  const all: { label: string; stage: RewriteStage }[] = [
    { label: '重写', stage: 'write' },
    { label: '重做封面', stage: 'genimageplan' },
    { label: '重生图', stage: 'genimage' },
  ]
  if (status === 'published') return []
  return all.filter(a => {
    if (a.stage === 'write') return status !== 'pending'
    if (a.stage === 'genimageplan') return status === 'genimageplan_done' || status === 'genimage_done' || status === 'publish_failed'
    if (a.stage === 'genimage') return status === 'genimage_done' || status === 'publish_failed'
    return false
  })
}

// ============================================================
// 商机筛选选项
// ============================================================

export const OPPORTUNITY_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
]
