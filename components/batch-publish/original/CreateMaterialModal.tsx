'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getAccountNames, type AccountName } from '@/lib/api/accounts'
import type { OpportunityItem, MonitoredItem } from '@/lib/api/batch-publish'

/**
 * 创建素材弹窗 — 双来源 + 创作策略决策区（现场决策，动态参数）
 * - opp：按商机创建（原创源，策略选项基于商机 summary 文章）
 * - item：按监控商品创建（二创源，策略选项基于选品信息）
 * - batch：按选中监控商品批量创建（无单一选品信息，仅「综合」+ 自定义 brief）
 *
 * 策略产出 brief 写入素材 produceState.brief（自包含创作指令）；brief 非空时「创建数量」锁定为 1。
 * 网页端不提供账号画像/人群/市场价参考（v1.3.16 硬约束）。
 */
export type CreateMaterialSource =
  | { type: 'opp'; opportunity: OpportunityItem }
  | { type: 'item'; item: MonitoredItem }
  | { type: 'batch'; count: number }

interface CreateMaterialModalProps {
  open: boolean
  onClose: () => void
  isPending: boolean
  onCreate: (num: number, toUid?: string, brief?: string) => void
  /** 关闭状态下传 null，组件直接返回 null 不渲染 */
  source: CreateMaterialSource | null
}

// ============================================================
// 创作策略 — 双源渲染
// ============================================================

type StrategyAngle =
  | 'comprehensive'
  | 'title'
  | 'body'
  | 'keyword'
  | 'itemTitleDesc'
  | 'itemHot'

interface StrategyOption {
  value: StrategyAngle
  label: string
}

function resolveStrategyOptions(source: CreateMaterialSource): StrategyOption[] {
  switch (source.type) {
    case 'opp': {
      const hasArticle = !!source.opportunity.summary?.article?.trim()
      if (!hasArticle) return [{ value: 'comprehensive', label: '综合' }]
      return [
        { value: 'comprehensive', label: '综合' },
        { value: 'title', label: '按文章：标题角度' },
        { value: 'body', label: '按文章：正文角度' },
        { value: 'keyword', label: '按文章：关键词角度' },
      ]
    }
    case 'item': {
      const hasInfo = !!(source.item.title?.trim() || source.item.description?.trim())
      if (!hasInfo) return [{ value: 'comprehensive', label: '综合' }]
      return [
        { value: 'comprehensive', label: '综合' },
        { value: 'itemTitleDesc', label: '按商品标题与描述' },
        { value: 'itemHot', label: '按热度卖点' },
      ]
    }
    case 'batch':
      return [{ value: 'comprehensive', label: '综合' }]
  }
}

/** 角度 → 自包含策略简报模板（含卖点/人群/场景营销判断，用户可改） */
function buildBriefTemplate(source: CreateMaterialSource, angle: StrategyAngle): string {
  switch (angle) {
    case 'title': {
      const opp = source.type === 'opp' ? source.opportunity : null
      const title = opp?.summary?.article?.split('\n')[0]?.trim() ?? ''
      return `从文章标题切入，主打核心定位「${title}」。围绕该定位组织卖点：一句话讲清它是什么、解决什么问题，面向有明确需求的目标人群，突出身份感与首屏记忆点，文案收尾给出行动引导。`
    }
    case 'body':
      return '从文章正文切入，把「怎么用、能做什么」翻译成用户可感知的价值：拆解核心功能与使用方式，结合真实使用场景写出人群痛点与体验收益，突出易用、省时、好用，按场景→痛点→方案展开。'
    case 'keyword': {
      const opp = source.type === 'opp' ? source.opportunity : null
      const keywords = opp?.summary?.keywords?.join('、') ?? ''
      return `从关键词「${keywords}」切入，把检索热点与真实需求挂钩：围绕这些概念组织内容，用对应人群的故事与场景承接搜索意图，强调在这些维度上的差异化优势，文案自带关键词密度。`
    }
    case 'itemTitleDesc':
      return '按商品标题与描述切入，围绕官方卖点组织话术：把标题核心承诺与描述中的功能细节翻译成用户利益点，面向目标购买人群，结合典型使用场景强化说服力，突出「值得买」的理由。'
    case 'itemHot':
      return '按商品热度卖点切入，围绕热销原因组织内容：放大高热度背后的需求与人群偏好，用「大家都在买/流行趋势」的社会认同带动转化，突出性价比与爆款潜力，强化从众心理。'
    default:
      return ''
  }
}

function resolveTitle(source: CreateMaterialSource): { title: string; subtitle: string } {
  switch (source.type) {
    case 'opp':
      return { title: '创建素材', subtitle: `商机：${source.opportunity.name}` }
    case 'item':
      return { title: '创建素材', subtitle: `源商品：${source.item.title || source.item.gid}` }
    case 'batch':
      return { title: '批量创建素材', subtitle: `将批量创建 ${source.count} 个商品的素材` }
  }
}

export function CreateMaterialModal({ open, onClose, isPending, onCreate, source }: CreateMaterialModalProps) {
  const isMobile = useIsMobile()
  const [num, setNum] = useState(1)
  const [toUid, setToUid] = useState('')
  const [angle, setAngle] = useState<StrategyAngle>('comprehensive')
  const [brief, setBrief] = useState('')

  // 发布账号列表（uid → name），用于「发布账号（可选）」下拉
  const { data: accountNames = [] } = useQuery<AccountName[]>({
    queryKey: ['batch-publish', 'account-names'],
    queryFn: () => getAccountNames(),
  })

  // 切换创建来源时重置策略状态（open 时 parent 每次新建 source 对象，用身份 key 而非对象引用）
  const sourceKey = source
    ? source.type === 'opp'
      ? `opp:${source.opportunity.id}`
      : source.type === 'item'
        ? `item:${source.item.gid}`
        : 'batch'
    : null
  useEffect(() => {
    setNum(1)
    setToUid('')
    setAngle('comprehensive')
    setBrief('')
  }, [sourceKey])

  if (!source) return null

  const { title, subtitle } = resolveTitle(source)
  const strategyOptions = resolveStrategyOptions(source)

  // ---- 策略交互 ----
  const handleAngleClick = (next: StrategyAngle) => {
    setAngle(next)
    // 角度选中 → 自动生成对应 brief 模板填入 textarea（用户可改）
    setBrief(next === 'comprehensive' ? '' : buildBriefTemplate(source, next))
  }

  const handleBriefChange = (v: string) => {
    setBrief(v)
    // 自定义 brief 与角度互斥：手动编辑后角度不再影响，回落「综合」
    setAngle('comprehensive')
  }

  const briefLocked = brief.trim().length > 0

  // ---- 策略决策区（原创/二创双源渲染） ----
  // 无角度可选（仅「综合」）时的三类空态文案（v6 3.5）
  const strategyEmptyHint = (() => {
    if (strategyOptions.length > 1) return null
    switch (source.type) {
      case 'opp':
        return '该商机尚未提炼，暂无文章角度可选；可先提炼商机后再决策策略'
      case 'item':
        return '该监控商品暂无标题与描述信息，暂无文章角度可选，建议按「综合」自定义策略'
      case 'batch':
        return '批量创建无单一源信息，仅支持「综合」策略，可自定义 brief'
    }
  })()

  const strategySection = (
    <div>
      <label className="text-sm font-medium text-gray-700">创作策略（现场决策，动态参数）</label>
      {strategyEmptyHint && (
        <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{strategyEmptyHint}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {strategyOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleAngleClick(opt.value)}
            className={`px-3 h-8 text-sm font-medium rounded-full transition-colors ${
              angle === opt.value ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <textarea
        value={brief}
        onChange={(e) => handleBriefChange(e.target.value)}
        rows={4}
        placeholder="✏️ 自定义策略简报 brief（写给 AI 的创作指令，可基于上方角度自动生成后修改）"
        className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
      />
      <p className="text-xs text-gray-400 mt-1">策略承载全部营销判断（卖点/人群/场景），建议自包含，供创作链路直接消费</p>
    </div>
  )

  const content = (
    <div className="space-y-4">
      {strategySection}

      <div>
        <label className="text-sm font-medium text-gray-700">创建数量</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="range"
            min={1}
            max={10}
            value={briefLocked ? 1 : num}
            onChange={(e) => setNum(Number(e.target.value))}
            disabled={briefLocked}
            className="flex-1 disabled:opacity-40"
          />
          <span className="text-sm font-semibold text-gray-800 w-8 text-right tabular-nums">
            {briefLocked ? 1 : num}
          </span>
        </div>
        {briefLocked && (
          <p className="text-xs text-amber-600 mt-1">一条素材一个策略，带策略时创建数量锁定为 1</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">发布账号（可选）</label>
        <select
          value={toUid}
          onChange={(e) => setToUid(e.target.value)}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">暂不分配（草稿）</option>
          {accountNames.map((acc) => (
            <option key={acc.uid} value={acc.uid}>{acc.name}</option>
          ))}
        </select>
      </div>
    </div>
  )

  const createNum = briefLocked ? 1 : num
  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        disabled={isPending}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        取消
      </button>
      <button
        onClick={() => onCreate(createNum, toUid || undefined, brief.trim() || undefined)}
        disabled={isPending}
        className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isPending ? '创建中...' : `创建 ${createNum} 份`}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
        <div className="p-4">{content}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" footer={footer}>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      {content}
    </Modal>
  )
}
