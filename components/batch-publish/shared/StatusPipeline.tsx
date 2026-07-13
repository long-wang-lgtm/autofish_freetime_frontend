'use client'

import type { MaterialStatus } from '@/lib/api/batch-publish'
import { PIPELINE_NODES, getPipelineState } from './constants'

interface StatusPipelineProps {
  status: MaterialStatus
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

export function StatusPipeline({ status }: StatusPipelineProps) {
  const states = getPipelineState(status)

  return (
    <div className="flex items-center gap-0">
      {PIPELINE_NODES.map((node, i) => {
        const state = states[i]
        const style = STATE_STYLES[state]
        const isLast = i === PIPELINE_NODES.length - 1

        return (
          <div key={node.key} className="flex items-center">
            {/* 节点圆点 */}
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] leading-none border ${style.dot}`}
            >
              <span className={style.text}>{STATE_ICONS[state]}</span>
            </span>
            {/* 节点标签 */}
            <span className={`ml-1 text-xs ${style.text}`}>{node.label}</span>
            {/* 连接线 */}
            {!isLast && <div className={`w-4 h-px mx-1 ${style.line}`} />}
          </div>
        )
      })}
    </div>
  )
}
