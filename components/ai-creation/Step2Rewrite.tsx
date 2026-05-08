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
  const [editedResults, setEditedResults] = useState<Record<string, string>>({})
  const [selectedUid, setSelectedUid] = useState<string | 'all'>('all')
  const [doneCount, setDoneCount] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const totalCount = Object.keys(accountNames).length

  // 构建账号列表数据
  const accountList: AccountItem[] = Object.entries(accountNames).map(([uid, name]) => ({
    uid,
    name,
    status: progress[uid] || 'idle',
  }))

  // 当前选中的内容（优先显示编辑后的）
  const currentContent = selectedUid === 'all'
    ? null
    : (editedResults[selectedUid] || results[selectedUid]) || ''

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
      const completed = Object.values(newProgress).filter(s => s === 'completed').length
      setDoneCount(completed)
      setAllDone(data.status === 'completed')

      if (data.status === 'failed') {
        alert('改写失败: ' + (data.error || '未知错误'))
        return false
      }
      return data.status !== 'completed'
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

  const handleEditContent = (uid: string, value: string) => {
    setEditedResults(prev => ({ ...prev, [uid]: value }))
  }

  const handleConfirm = () => {
    // 合并：编辑过的用编辑的，没编辑过的用原始的
    const finalResults = { ...results, ...editedResults }
    onComplete(finalResults)
  }

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
                <h3 className="font-medium text-gray-900">
                  {allDone ? 'AI改写完成' : 'AI改写进行中'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {doneCount}/{totalCount} 完成
                </p>
              </div>
              {!allDone && <LoadingSpinner size="sm" />}
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
                    {(editedResults[acc.uid] || results[acc.uid]) && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {editedResults[acc.uid] || results[acc.uid]}
                      </p>
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
                  value={currentContent ?? ''}
                  onChange={(e) => handleEditContent(selectedUid, e.target.value)}
                  rows={10}
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                  placeholder="改写中..."
                  readOnly={progress[selectedUid] !== 'completed'}
                />
                {editedResults[selectedUid] && editedResults[selectedUid] !== results[selectedUid] && (
                  <p className="text-xs text-orange-500">已编辑</p>
                )}
              </div>
            )}

            {/* 确认按钮 */}
            {allDone && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleConfirm}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
                >
                  确认改写结果，开始封面规划
                </button>
              </div>
            )}
          </div>
        }
      />
    </div>
  )
}
