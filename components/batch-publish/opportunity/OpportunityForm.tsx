'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import type { OpportunityItem } from '@/lib/api/batch-publish'

const opportunitySchema = z.object({
  name: z.string().min(1, '请输入商机名称').max(100, '名称最多 100 字'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, '价格不能为负').optional(),
  ai_context_template: z.enum(['only_opportunity', 'with_item']),
})

type OpportunityFormValues = z.infer<typeof opportunitySchema>

interface OpportunityFormProps {
  defaultValues?: Partial<OpportunityItem>
  onSubmit: (values: OpportunityFormValues) => void
  isPending: boolean
  submitLabel: string
}

export function OpportunityForm({ defaultValues, onSubmit, isPending, submitLabel }: OpportunityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? 0,
      ai_context_template: (defaultValues?.ai_context_template as 'only_opportunity' | 'with_item') ?? 'only_opportunity',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">
          商机名称 <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          maxLength={100}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="如：日系简约风手机壳"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">描述</label>
        <textarea
          {...register('description')}
          rows={3}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="选填"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">参考价格</label>
        <input
          {...register('price')}
          type="number"
          min={0}
          step={0.01}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">AI 上下文模板</label>
        <select
          {...register('ai_context_template')}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="only_opportunity">{TEMPLATE_TYPE_LABELS.only_opportunity}</option>
          <option value="with_item">{TEMPLATE_TYPE_LABELS.with_item}</option>
        </select>
      </div>

      <div className="flex justify-end pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
