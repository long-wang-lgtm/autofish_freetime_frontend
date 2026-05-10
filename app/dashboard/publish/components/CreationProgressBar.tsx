'use client'
import { type PublishedItem } from '@/lib/api/publish-items'

type Stage = 'rewrite' | 'cover_plan' | 'image_gen' | 'publish'

interface CreationProgressBarProps {
  item: Pick<PublishedItem, 'status' | 'description' | 'cover_plan_prompt' | 'cover_image' | 'item_gid'>
  onStageClick?: (stage: Stage) => void
  size?: 'sm' | 'md'
}

function getStageStatus(item: CreationProgressBarProps['item'], stage: Stage): 'pending' | 'active' | 'done' | 'failed' {
  const { status, description, cover_plan_prompt, cover_image, item_gid } = item

  // 先按字段内容判断 done / failed（字段优先于状态）
  if (stage === 'rewrite' && description) return 'done'
  if (stage === 'cover_plan' && cover_plan_prompt) return 'done'
  if (stage === 'image_gen' && cover_image) return 'done'
  if (stage === 'publish' && item_gid) return 'done'

  // 发布失败
  if (status === 'publish_failed') return 'failed'

  // 进行中
  if (stage === 'rewrite' && status === 'rewriting') return 'active'
  if (stage === 'cover_plan' && status === 'cover_planning') return 'active'
  if (stage === 'image_gen' && status === 'image_generating') return 'active'
  if (stage === 'publish' && status === 'publishing') return 'active'

  return 'pending'
}

const STAGE_LABELS: Record<Stage, string> = {
  rewrite: '改写',
  cover_plan: '封面',
  image_gen: '生图',
  publish: '发布',
}

const STAGE_ORDER: Stage[] = ['rewrite', 'cover_plan', 'image_gen', 'publish']

export function CreationProgressBar({ item, onStageClick, size = 'md' }: CreationProgressBarProps) {
  return (
    <div className={`flex items-center gap-0.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {STAGE_ORDER.map(stage => {
        const stageStatus = getStageStatus(item, stage)
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
