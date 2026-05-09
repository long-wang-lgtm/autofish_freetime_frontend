'use client'
import { type PublishedItemStatus } from '@/lib/api/publish-items'

type Stage = 'rewrite' | 'cover_plan' | 'image_gen' | 'publish'

function getStageStatus(status: string, stage: Stage): 'pending' | 'active' | 'done' | 'failed' {
  const doneMap: Record<Stage, string[]> = {
    rewrite: ['rewrite_done', 'cover_planning', 'cover_plan_done', 'image_generating', 'image_done', 'publishing', 'published'],
    cover_plan: ['cover_plan_done', 'image_generating', 'image_done', 'publishing', 'published'],
    image_gen: ['image_done', 'publishing', 'published'],
    publish: ['published'],
  }
  const activeMap: Record<Stage, string[]> = {
    rewrite: ['rewriting'],
    cover_plan: ['cover_planning'],
    image_gen: ['image_generating'],
    publish: ['publishing'],
  }

  if (doneMap[stage].includes(status)) return 'done'
  if (activeMap[stage].includes(status)) return 'active'
  if (status === 'publish_failed') return 'failed'
  return 'pending'
}

const STAGE_LABELS: Record<Stage, string> = {
  rewrite: '改写',
  cover_plan: '封面',
  image_gen: '生图',
  publish: '发布',
}

const STAGE_ORDER: Stage[] = ['rewrite', 'cover_plan', 'image_gen', 'publish']

interface CreationProgressBarProps {
  status: string
  onStageClick?: (stage: Stage) => void
  size?: 'sm' | 'md'
}

export function CreationProgressBar({ status, onStageClick, size = 'md' }: CreationProgressBarProps) {
  return (
    <div className={`flex items-center gap-0.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {STAGE_ORDER.map(stage => {
        const stageStatus = getStageStatus(status, stage)
        const icons: Record<string, string> = {
          pending: '○',
          active: '🔄',
          done: '✓',
          failed: '╳',
        }
        const colors: Record<string, string> = {
          pending: 'text-gray-400',
          active: 'text-blue-500',
          done: 'text-green-500',
          failed: 'text-red-500',
        }

        return (
          <button
            key={stage}
            onClick={() => onStageClick?.(stage)}
            className={`
              ${colors[stageStatus]}
              ${onStageClick ? 'cursor-pointer hover:underline' : 'cursor-default'}
              font-mono
              ${stageStatus === 'active' ? 'animate-spin' : ''}
            `}
            title={`${STAGE_LABELS[stage]}: ${stageStatus}`}
          >
            [{STAGE_LABELS[stage]}{icons[stageStatus]}]
          </button>
        )
      })}
    </div>
  )
}
