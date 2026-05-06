'use client'

import { useState } from 'react'
import { publishItems } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface RewriteResult {
  uid: string
  content: string
}

interface StepPublishProps {
  rewriteResults: RewriteResult[]
  capturedImages: Record<string, string>
  accounts: Array<{ uid: string; name: string }>
  onComplete: () => void
  onBack: () => void
}

interface PublishResult {
  uid: string
  success: boolean
  message: string
}

export default function StepPublish({
  rewriteResults,
  capturedImages,
  accounts,
  onComplete,
  onBack
}: StepPublishProps) {
  const [status, setStatus] = useState<'idle' | 'publishing' | 'done'>('idle')
  const [results, setResults] = useState<PublishResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    setStatus('publishing')
    setError(null)

    try {
      // 构建发布数据
      const items = rewriteResults.map(r => {
        const accountImages = Object.entries(capturedImages)
          .filter(([key]) => key.startsWith(`${r.uid}_`))
          .sort(([a], [b]) => {
            const aIdx = parseInt(a.split('_')[1])
            const bIdx = parseInt(b.split('_')[1])
            return aIdx - bIdx
          })
          .map(([, dataUrl]) => dataUrl)

        return {
          account_uid: r.uid,
          title: '商品标题', // TODO: 从改写内容提取
          description: r.content,
          price: 99.9, // TODO: 用户输入
          images: accountImages
        }
      })

      const res = await publishItems(items)
      setResults(res.results || [])
      setStatus('done')
    } catch (e) {
      setError(String(e))
      setStatus('idle')
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">发布到账号</h2>

        {status === 'idle' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              将把 {rewriteResults.length} 个商品发布到 {accounts.length} 个账号
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-2">发布概要</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                {accounts.map(acc => {
                  const accResults = rewriteResults.filter(r => r.uid === acc.uid)
                  const accImages = Object.keys(capturedImages).filter(k => k.startsWith(`${acc.uid}_`)).length
                  return (
                    <li key={acc.uid}>
                      {acc.name}: {accResults.length} 个商品, {accImages} 张封面图
                    </li>
                  )
                })}
              </ul>
            </div>
            <button
              onClick={handlePublish}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all"
            >
              一键发布
            </button>
          </div>
        )}

        {status === 'publishing' && (
          <div className="flex items-center gap-3">
            <LoadingSpinner size="md" />
            <span className="text-gray-600">发布中...</span>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${failCount === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              发布完成: {successCount} 成功, {failCount} 失败
            </div>
            <div className="space-y-2">
              {results.map(r => {
                const account = accounts.find(a => a.uid === r.uid)
                return (
                  <div key={r.uid} className={`p-3 rounded-lg ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className="font-medium">{account?.name || r.uid}</span>
                    <span className="text-sm ml-2">{r.message}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          错误: {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-all"
        >
          ← 上一步
        </button>
        {status === 'done' && (
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
          >
            完成
          </button>
        )}
      </div>
    </div>
  )
}
