'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateOpportunity } from '@/lib/api/opportunities'
import { type Opportunity } from '@/lib/api/opportunities'

interface PromptTemplateModalProps {
  opportunity: Opportunity
  onClose: () => void
}

export function PromptTemplateModal({ opportunity, onClose }: PromptTemplateModalProps) {
  const [template, setTemplate] = useState(opportunity.rewrite_prompt_template ?? '')

  const mutation = useMutation({
    mutationFn: (tpl: string) =>
      updateOpportunity(opportunity.id, { rewrite_prompt_template: tpl }),
    onSuccess: () => onClose(),
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">编辑元提示词</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-500">
            覆盖全局 YAML 模板配置。留空则继承全局模板。
          </p>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            className="w-full h-48 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            placeholder="输入自定义提示词模板..."
          />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={() => mutation.mutate(template)}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
