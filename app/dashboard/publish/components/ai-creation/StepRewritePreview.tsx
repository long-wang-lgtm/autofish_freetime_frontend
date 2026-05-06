'use client'

import { useState } from 'react'

interface RewriteResult {
  uid: string
  content: string
  editedContent?: string
}

interface StepRewritePreviewProps {
  results: RewriteResult[]
  accounts: Array<{ uid: string; name: string }>
  onConfirm: (results: RewriteResult[]) => void
  onBack: () => void
}

export default function StepRewritePreview({ results, accounts, onConfirm, onBack }: StepRewritePreviewProps) {
  const [editedResults, setEditedResults] = useState<RewriteResult[]>(
    results.map(r => ({ ...r, editedContent: r.editedContent || r.content }))
  )

  const updateContent = (index: number, content: string) => {
    setEditedResults(prev => {
      const next = [...prev]
      next[index] = { ...next[index], editedContent: content }
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(editedResults)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">改写结果预览</h2>
        <p className="text-sm text-gray-500 mb-6">可以编辑每一份改写内容，然后确认</p>

        <div className="space-y-4">
          {editedResults.map((result, index) => {
            const account = accounts.find(a => a.uid === result.uid)
            return (
              <div key={result.uid} className="border border-gray-200 rounded-xl p-4">
                <div className="font-medium text-gray-900 mb-2">{account?.name || result.uid}</div>
                <textarea
                  value={result.editedContent || ''}
                  onChange={e => updateContent(index, e.target.value)}
                  className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-all"
        >
          ← 上一步
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
        >
          确认改写 → 封面规划
        </button>
      </div>
    </div>
  )
}
