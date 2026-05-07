'use client'

import { useState, useCallback } from 'react'
import { publishItems } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type PublishStatus = 'pending' | 'publishing' | 'success' | 'failed'

interface StepPublishProps {
  sourceDescription: string
  selectedAccounts: string[]
  rewriteResults: Record<string, string>
  coverImages: Record<string, string>
}

export function StepPublish({
  sourceDescription,
  selectedAccounts,
  rewriteResults,
  coverImages,
}: StepPublishProps) {
  const [publishState, setPublishState] = useState<Record<string, { status: PublishStatus; message: string }>>(
    Object.fromEntries(selectedAccounts.map(uid => [uid, { status: 'pending', message: '' }]))
  )
  const [started, setStarted] = useState(false)

  const publishOne = useCallback(async (uid: string) => {
    setPublishState(prev => ({ ...prev, [uid]: { status: 'publishing', message: '发布中...' } }))
    try {
      const result = await publishItems([{
        account_uid: uid,
        title: '商品标题',
        description: rewriteResults[uid] || sourceDescription,
        price: 99.9,
        images: [coverImages[uid] || ''],
      }])
      const item = result.results?.[0]
      setPublishState(prev => ({
        ...prev,
        [uid]: {
          status: item?.success ? 'success' : 'failed',
          message: item?.message || '未知结果',
        },
      }))
    } catch (err) {
      setPublishState(prev => ({
        ...prev,
        [uid]: { status: 'failed', message: String(err) },
      }))
    }
  }, [rewriteResults, coverImages, sourceDescription])

  const handleStart = () => {
    setStarted(true)
    selectedAccounts.forEach(uid => publishOne(uid))
  }

  const allDone = Object.values(publishState).every(s => s.status === 'success' || s.status === 'failed')
  const successCount = Object.values(publishState).filter(s => s.status === 'success').length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">发布进度</h3>
        <div className="mb-3 text-sm text-gray-500">
          {started
            ? `${successCount} 成功 / ${selectedAccounts.length} 总数`
            : `将发布到 ${selectedAccounts.length} 个账号`}
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {selectedAccounts.map(uid => {
            const state = publishState[uid]
            return (
              <div key={uid} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="w-32 text-sm text-gray-700 truncate font-medium">{uid}</div>
                <div className="flex-1">
                  {state.status === 'pending' && (
                    <span className="text-gray-400 text-sm">等待发布</span>
                  )}
                  {state.status === 'publishing' && (
                    <span className="text-blue-600 text-sm flex items-center gap-1">
                      <LoadingSpinner size="sm" /> {state.message}
                    </span>
                  )}
                  {state.status === 'success' && (
                    <span className="text-green-600 text-sm">✅ {state.message}</span>
                  )}
                  {state.status === 'failed' && (
                    <span className="text-red-600 text-sm">❌ {state.message}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!started ? (
        <button
          onClick={handleStart}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
        >
          开始发布到 {selectedAccounts.length} 个账号
        </button>
      ) : allDone ? (
        <div className="text-center py-3 text-gray-500 text-sm">
          {successCount === selectedAccounts.length
            ? `✅ 全部发布成功`
            : `⚠️ ${successCount}/${selectedAccounts.length} 成功`}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3 text-blue-600">
          <LoadingSpinner size="sm" /> <span className="text-sm">发布中，请稍候...</span>
        </div>
      )}
    </div>
  )
}
