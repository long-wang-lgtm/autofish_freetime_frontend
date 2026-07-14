'use client'

import { useState } from 'react'
import { StatusPipeline } from '@/components/batch-publish/shared/StatusPipeline'
import { getActionButton, getMoreActions } from '@/components/batch-publish/shared/constants'
import type { MaterialStatus, RewriteStage } from '@/lib/api/batch-publish'

interface ProgressActionCellProps {
  status: MaterialStatus
  onTriggerWork: (stage: RewriteStage) => void
  onPublish: () => void
  isAnyLoading: boolean
}

const VARIANT_STYLES = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  success: 'bg-white text-green-600 border border-green-300 cursor-default',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function ProgressActionCell({
  status, onTriggerWork, onPublish, isAnyLoading,
}: ProgressActionCellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const action = getActionButton(status)
  const moreActions = getMoreActions(status)

  const handleMainClick = () => {
    if (isAnyLoading) return
    if (action.variant === 'success') return
    if (action.isPublish) {
      onPublish()
    } else if (action.stage) {
      onTriggerWork(action.stage)
    }
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {/* Compact progress pipeline */}
      <div className="flex-shrink-0" style={{ minWidth: 64 }}>
        <StatusPipeline status={status} variant="compact" />
      </div>

      {/* Primary action button */}
      <button
        disabled={isAnyLoading || action.variant === 'success'}
        onClick={handleMainClick}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
          VARIANT_STYLES[action.variant]
        }`}
      >
        {isAnyLoading ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </span>
        ) : action.label}
      </button>

      {/* "..." more actions menu */}
      {moreActions.length > 0 && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={isAnyLoading}
            className="w-6 h-6 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-medium disabled:opacity-50"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-0.5 z-40 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[100px]">
                {moreActions.map((a) => (
                  <button
                    key={a.stage}
                    onClick={() => { onTriggerWork(a.stage); setMenuOpen(false) }}
                    disabled={isAnyLoading}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
