'use client'

import React, { useState, useCallback } from 'react'
import { publishItems } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AccountListPanel, AccountItem, AccountStatus } from './AccountListPanel'
import { MasterDetailLayout } from './MasterDetailLayout'

type PublishStatus = 'pending' | 'publishing' | 'success' | 'failed'

interface Step4PublishProps {
  accountNames: Record<string, string>
  rewriteResults: Record<string, string>
  sourceDescription: string
  coverImages: Record<string, string>
}

export function Step4Publish({
  accountNames,
  rewriteResults,
  sourceDescription,
  coverImages,
}: Step4PublishProps) {
  const [publishState, setPublishState] = useState<Record<string, { status: PublishStatus; message: string }>>(
    Object.fromEntries(
      Object.keys(accountNames).map(uid => [uid, { status: 'pending', message: '' }])
    )
  )
  const [started, setStarted] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string | 'all'>('all')

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
    Object.keys(accountNames).forEach(uid => publishOne(uid))
  }

  const successCount = Object.values(publishState).filter(s => s.status === 'success').length
  const totalCount = Object.keys(accountNames).length

  const accountList: AccountItem[] = Object.entries(accountNames).map(([uid, name]) => ({
    uid,
    name,
    status: publishState[uid]?.status as AccountStatus || 'idle',
  }))

  // 当前选中的发布详情
  const currentState = selectedUid !== 'all' ? publishState[selectedUid] : null

  return (
    <MasterDetailLayout
      leftPanel={
        <AccountListPanel
          accounts={accountList}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
        />
      }
      rightPanel={
        <div className="space-y-6">
          {/* 进度头部 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">发布进度</h3>
              <p className="text-sm text-gray-500 mt-1">
                {started
                  ? `${successCount}/${totalCount} 成功`
                  : `将发布到 ${totalCount} 个账号`}
              </p>
            </div>
            {started && successCount < totalCount && (
              <LoadingSpinner size="sm" />
            )}
          </div>

          {/* 进度条 */}
          {started && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(successCount / totalCount) * 100}%` }}
              />
            </div>
          )}

          {/* 账号发布详情 */}
          {selectedUid === 'all' ? (
            <div className="space-y-2">
              {Object.entries(publishState).map(([uid, state]) => (
                <div key={uid} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-32 text-sm text-gray-700 truncate font-medium">
                    {accountNames[uid] || uid}
                  </div>
                  <div className="flex-1">
                    {state.status === 'pending' && (
                      <span className="text-gray-400 text-sm">⏳ 等待发布</span>
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
              ))}
            </div>
          ) : (
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {accountNames[selectedUid] || selectedUid}
              </div>
              {currentState?.status === 'pending' && (
                <span className="text-gray-400">⏳ 等待发布</span>
              )}
              {currentState?.status === 'publishing' && (
                <span className="text-blue-600 flex items-center gap-1">
                  <LoadingSpinner size="sm" /> {currentState.message}
                </span>
              )}
              {currentState?.status === 'success' && (
                <span className="text-green-600">✅ {currentState.message}</span>
              )}
              {currentState?.status === 'failed' && (
                <span className="text-red-600">❌ {currentState.message}</span>
              )}
            </div>
          )}

          {/* 开始/结果按钮 */}
          {!started ? (
            <button
              onClick={handleStart}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
            >
              开始发布到 {totalCount} 个账号
            </button>
          ) : successCount === totalCount ? (
            <div className="text-center py-4 bg-green-50 rounded-xl text-green-700 font-medium">
              ✅ 全部发布成功！
            </div>
          ) : successCount > 0 ? (
            <div className="text-center py-4 bg-yellow-50 rounded-xl text-yellow-700">
              ⚠️ {successCount}/{totalCount} 成功
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 text-blue-600">
              <LoadingSpinner size="sm" />
              <span>发布中，请稍候...</span>
            </div>
          )}
        </div>
      }
    />
  )
}
