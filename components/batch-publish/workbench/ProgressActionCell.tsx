'use client'

import { useState } from 'react'
import { StatusPipeline } from '@/components/batch-publish/shared/StatusPipeline'
import type { MaterialStatus, RewriteStage } from '@/lib/api/batch-publish'
import type { PipelineNode } from '@/components/batch-publish/shared/constants'

interface ProgressActionCellProps {
  status: MaterialStatus
  onTriggerWork: (stage: RewriteStage) => Promise<void>
  onPublish: () => Promise<void>
  isAnyLoading: boolean
}

/** Pipeline 节点 → triggerWork stage 映射（publish 节点使用独立 API） */
const NODE_TO_STAGE: Record<string, RewriteStage> = {
  rewrite: 'write',
  genimageplan: 'genimageplan',
  genimage: 'genimage',
}

export function ProgressActionCell({
  status, onTriggerWork, onPublish, isAnyLoading,
}: ProgressActionCellProps) {
  const [loadingNode, setLoadingNode] = useState<PipelineNode | null>(null)

  const handleNodeClick = async (node: PipelineNode) => {
    if (isAnyLoading || loadingNode) return
    setLoadingNode(node)
    try {
      if (node === 'publish') {
        await onPublish()
      } else if (NODE_TO_STAGE[node]) {
        await onTriggerWork(NODE_TO_STAGE[node])
      }
    } finally {
      setLoadingNode(null)
    }
  }

  return (
    <div className="inline-flex justify-center" onClick={(e) => e.stopPropagation()}>
      <StatusPipeline
        status={status}
        variant="compact"
        onNodeClick={handleNodeClick}
        loadingNode={loadingNode}
        disabled={isAnyLoading}
      />
    </div>
  )
}
