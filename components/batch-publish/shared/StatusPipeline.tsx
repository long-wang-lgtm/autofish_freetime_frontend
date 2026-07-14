'use client'

import type { MaterialStatus } from '@/lib/api/batch-publish'
import { PIPELINE_NODES, getPipelineState } from './constants'
import type { PipelineNode } from './constants'

interface StatusPipelineProps {
  status: MaterialStatus
  /** 紧凑模式：仅圆点无标签，用于行内进度+操作列 */
  variant?: 'default' | 'compact'
  /** 点击进度节点时的回调 */
  onNodeClick?: (node: PipelineNode) => void
  /** 当前正在加载的节点（显示 spinner） */
  loadingNode?: PipelineNode | null
  /** 禁用所有节点交互 */
  disabled?: boolean
}

const STATE_STYLES = {
  done: {
    dot: 'bg-blue-600 border-blue-600',
    line: 'bg-blue-600',
    text: 'text-blue-600',
  },
  pending: {
    dot: 'bg-white border-gray-300',
    line: 'bg-gray-200',
    text: 'text-gray-400',
  },
  failed: {
    dot: 'bg-red-500 border-red-500',
    line: 'bg-red-300',
    text: 'text-red-500',
  },
} as const

const STATE_ICONS: Record<string, string> = {
  done: '●',
  pending: '○',
  failed: '✕',
}

/** 每个阶段的操作动词，用于 tooltip */
const STAGE_ACTION: Record<string, string> = {
  rewrite: 'AI 改写',
  genimageplan: '封面规划',
  genimage: 'AI 生图',
  publish: '发布',
}

function nodeTooltip(nodeKey: string, state: string, isNext: boolean): string {
  const action = STAGE_ACTION[nodeKey] || nodeKey
  switch (state) {
    case 'done':
      return `${action}完成 · 点击重做`
    case 'failed':
      return `${action}失败 · 点击重试`
    case 'pending':
      return isNext ? `点击${action}` : `${action} · 等待前置步骤`
    default:
      return action
  }
}

export function StatusPipeline({
  status, variant = 'default', onNodeClick, loadingNode, disabled,
}: StatusPipelineProps) {
  const states = getPipelineState(status)
  const isAnyLoading = loadingNode != null
  const firstPendingIdx = states.findIndex(s => s === 'pending')

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-0.5" role="group" aria-label="创作进度">
        {PIPELINE_NODES.map((node, i) => {
          const state = states[i]
          const style = STATE_STYLES[state]
          const isLast = i === PIPELINE_NODES.length - 1
          const isCurrentLoading = loadingNode === node.key
          const isNext = state === 'pending' && i === firstPendingIdx

          return (
            <div key={node.key} className="flex items-center">
              {isCurrentLoading ? (
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5"
                  title={`${STAGE_ACTION[node.key] || node.label}中…`}
                >
                  <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNodeClick?.(node.key)}
                  disabled={disabled || isAnyLoading}
                  title={nodeTooltip(node.key, state, isNext)}
                  className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] leading-none border transition-all ${
                    disabled || isAnyLoading
                      ? 'cursor-not-allowed opacity-40'
                      : isNext
                        ? 'cursor-pointer hover:scale-125 hover:shadow-sm ring-1 ring-blue-300'
                        : 'cursor-pointer hover:scale-125 hover:shadow-sm'
                  } ${style.dot}`}
                >
                  <span className={style.text}>{STATE_ICONS[state]}</span>
                </button>
              )}
              {!isLast && (
                <div className={`w-3 h-px transition-colors ${isCurrentLoading ? 'bg-blue-400 animate-pulse' : style.line}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // default — full size with labels
  return (
    <div className="flex items-center gap-0">
      {PIPELINE_NODES.map((node, i) => {
        const state = states[i]
        const style = STATE_STYLES[state]
        const isLast = i === PIPELINE_NODES.length - 1

        return (
          <div key={node.key} className="flex items-center">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] leading-none border ${style.dot}`}
            >
              <span className={style.text}>{STATE_ICONS[state]}</span>
            </span>
            <span className={`ml-1 text-xs ${style.text}`}>{node.label}</span>
            {!isLast && <div className={`w-4 h-px mx-1 ${style.line}`} />}
          </div>
        )
      })}
    </div>
  )
}
