'use client'

import { useState } from 'react'
import { publishItems } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; message: string }>>({})

  const handlePublish = async () => {
    setIsPublishing(true)
    const items = selectedAccounts.map((uid) => ({
      account_uid: uid,
      title: '商品标题',
      description: rewriteResults[uid] || sourceDescription,
      price: 99.9,
      images: [coverImages[uid] || ''],
    }))

    try {
      const result = await publishItems(items)
      const r: Record<string, { success: boolean; message: string }> = {}
      for (const item of result.results || []) {
        r[item.uid] = { success: item.success, message: item.message }
      }
      setPublishResults(r)
    } catch (err) {
      alert('发布失败: ' + String(err))
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">发布确认</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div>账号数量: {selectedAccounts.length}</div>
          <div>改写份数: {Object.keys(rewriteResults).length}</div>
          <div>封面图片: {Object.keys(coverImages).length} 张</div>
        </div>
      </div>

      {Object.keys(publishResults).length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">发布结果</h3>
          <div className="space-y-2">
            {Object.entries(publishResults).map(([uid, result]) => (
              <div key={uid} className="flex items-center gap-2 text-sm">
                {result.success ? (
                  <span className="text-green-600">✅</span>
                ) : (
                  <span className="text-red-600">❌</span>
                )}
                <span className="font-medium">{uid}</span>
                <span className="text-gray-500">{result.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPublishing ? (
            <><LoadingSpinner size="sm" /> 发布中...</>
          ) : (
            <>一键发布到 {selectedAccounts.length} 个账号</>
          )}
        </button>
      )}
    </div>
  )
}
