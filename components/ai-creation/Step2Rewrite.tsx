'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getRewriteStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AccountListPanel, AccountItem, AccountStatus } from './AccountListPanel'
import { MasterDetailLayout } from './MasterDetailLayout'

interface Step2RewriteProps {
  taskId: string
  accountNames: Record<string, string>
  onComplete: (results: Record<string, string>) => void
}

export function Step2Rewrite({ taskId, accountNames, onComplete }: Step2RewriteProps) {
  const [progress, setProgress] = useState<Record<string, AccountStatus>>({})
  const [results, setResults] = useState<Record<string, string>>({})
  const [selectedUid, setSelectedUid] = useState<string | 'all'>('all')
  const [doneCount, setDoneCount] = useState(0)
  const totalCount = Object.keys(accountNames).length
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const checkStatus = useCallback(async () => {
    try {
      const data = await getRewriteStatus(taskId)
      const newProgress: Record<string, AccountStatus> = {}
      const newResults: Record<string, string> = {}

      for (const [uid, status] of Object.entries(data.progress || {})) {
        if (status === 'completed') newProgress[uid] = 'completed'
        else if (status === 'failed') newProgress[uid] = 'failed'
        else if (status === 'running') newProgress[uid] = 'running'
        else newProgress[uid] = 'idle'
      }

      for (const item of data.results || []) {
        newResults[item.uid] = item.content
      }

      setProgress(newProgress)
      setResults(prev => ({ ...prev, ...newResults }))
      setDoneCount(Object.values(newProgress).filter(s => s === 'completed').length)

      if (data.status === 'completed') {
        onCompleteRef.current(newResults)
        return false
      }
      if (data.status === 'failed') {
        alert('改写失败: ' + (data.error || '未知错误'))
        return false
      }
      return true
    } catch (err) {
      alert('查询失败: ' + String(err))
      return false
    }
  }, [taskId])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      const shouldContinue = await checkStatus()
      if (shouldContinue) {
        timeoutId = setTimeout(poll, 1500)
      }
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [checkStatus])

  // 构建账号列表数据
  const accountList: AccountItem[] = Object.entries(accountNames).map(([uid, name]) => ({
    uid,
    name,
    status: progress[uid] || 'idle',
  }))

  // 当前选中的内容
  const currentContent = selectedUid === 'all'
    ? null
    : results[selectedUid] || ''

  return (
    <div className="h-full">
      <MasterDetailLayout
        leftPanel={
          <AccountListPanel
            accounts={accountList}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
          />
        }
        rightPanel={
          <div className="space-y-4">
            {/* 进度头部 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">AI改写进行中</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {doneCount}/{totalCount} 完成
                </p>
              </div>
              <LoadingSpinner size="sm" />
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>

            {/* 账号Tab */}
            {selectedUid === 'all' ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">所有账号改写结果</h4>
                {accountList.map(acc => (
                  <div key={acc.uid} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{acc.name || acc.uid}</span>
                      <span className="text-xs">
                        {progress[acc.uid] === 'completed' && <span className="text-green-600">✅ 完成</span>}
                        {progress[acc.uid] === 'running' && (
                          <span className="text-blue-600 flex items-center gap-1">
                            <LoadingSpinner size="sm" /> 改写中
                          </span>
                        )}
                        {progress[acc.uid] === 'idle' && <span className="text-gray-400">⏳ 等待中</span>}
                        {progress[acc.uid] === 'failed' && <span className="text-red-600">❌ 失败</span>}
                      </span>
                    </div>
                    {results[acc.uid] && (
                      <p className="text-sm text-gray-600 line-clamp-2">{results[acc.uid]}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">
                    {accountNames[selectedUid] || selectedUid} 的改写结果
                  </h4>
                  <span className="text-xs">
                    {progress[selectedUid] === 'completed' && <span className="text-green-600">✅ 完成</span>}
                    {progress[selectedUid] === 'running' && (
                      <span className="text-blue-600 flex items-center gap-1">
                        <LoadingSpinner size="sm" /> 改写中
                      </span>
                    )}
                  </span>
                </div>
                <textarea
                  value={currentContent || ''}
                  onChange={() => {}}
                  rows={12}
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                  placeholder="改写中..."
                />
              </div>
            )}
          </div>
        }
      />
    </div>
  )
}
