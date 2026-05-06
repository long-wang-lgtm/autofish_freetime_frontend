'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getHtmlStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverHtmlProps {
  taskId: string | null
  onComplete: (htmlCodes: Record<string, string>) => void
}

export function StepCoverHtml({ taskId, onComplete }: StepCoverHtmlProps) {
  const [htmlCodes, setHtmlCodes] = useState<Record<string, string>>({})
  const [isPolling, setIsPolling] = useState(true)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const checkStatus = useCallback(async () => {
    if (!taskId) return false
    try {
      const data = await getHtmlStatus(taskId)
      if (data.status === 'completed' || data.status === 'failed') {
        const codes: Record<string, string> = {}
        for (const item of data.plans || []) {
          codes[item.uid] = item.html_code || ''
        }
        setHtmlCodes(codes)
        setIsPolling(false)
        onCompleteRef.current(codes)
        return false
      }
      return true
    } catch (err) {
      setIsPolling(false)
      return false
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      const shouldContinue = await checkStatus()
      if (shouldContinue) {
        timeoutId = setTimeout(poll, 2000)
      }
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [checkStatus])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <h3 className="font-medium text-gray-900 mb-4">生成HTML代码中...</h3>
      {isPolling ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-gray-500">AI 正在生成封面HTML...</span>
        </div>
      ) : (
        <div className="text-green-600">HTML生成完成，正在准备截图...</div>
      )}
    </div>
  )
}
