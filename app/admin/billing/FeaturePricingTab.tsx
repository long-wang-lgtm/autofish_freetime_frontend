'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi, type FeaturePricing } from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EditableCell } from '@/components/ui/EditableCell'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/utils/format'
import { Plus, Trash2 } from 'lucide-react'

/** StoneConsumptionScene 枚举中文映射 */
const FEATURE_LABELS: Record<string, string> = {
  order_change: '订单变更',
  send_message: '发送消息',
  auto_review: '自动回复',
}

const FEATURE_OPTIONS = Object.entries(FEATURE_LABELS)

export function FeaturePricingTab() {
  const [items, setItems] = useState<FeaturePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newFeature, setNewFeature] = useState('order_change')
  const [newName, setNewName] = useState('')
  const [newStones, setNewStones] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getFeaturePricingList()
      setItems(data || [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const handleEdit = useCallback(
    async (id: number, field: string, value: string) => {
      const body: Record<string, unknown> = {}
      if (field === 'stones') {
        const n = Number(value)
        if (isNaN(n)) {
          toast.error('请输入有效数字')
          throw new Error('Invalid')
        }
        body.stones = n
      } else if (field === 'description') {
        body.name = value
      }
      await adminApi.updateFeaturePricing(id, body)
      toast.success('已更新')
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(field === 'description'
                  ? { description: value }
                  : field === 'stones'
                    ? { stones: Number(value) }
                    : {}),
              }
            : item,
        ),
      )
    },
    [],
  )

  const handleToggleActive = useCallback(async (item: FeaturePricing) => {
    const newActive = !item.is_active
    // 乐观更新
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active: newActive } : i)),
    )
    try {
      await adminApi.updateFeaturePricing(item.id, { is_active: newActive })
    } catch (e) {
      // 回滚
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_active: item.is_active } : i,
        ),
      )
      toast.error(`切换失败: ${e}`)
    }
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('请输入名称')
      return
    }
    const stones = Number(newStones)
    if (isNaN(stones)) {
      toast.error('请输入有效数字')
      return
    }
    try {
      await adminApi.createFeaturePricing({
        feature: newFeature,
        name: newName.trim(),
        stones,
      })
      toast.success('功能已新增')
      setAdding(false)
      setNewName('')
      setNewStones('')
      fetch()
    } catch (e) {
      toast.error(`新增失败: ${e}`)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await adminApi.deleteFeaturePricing(deleteId)
      toast.success('已删除')
      setItems((prev) => prev.filter((i) => i.id !== deleteId))
    } catch (e) {
      toast.error(`删除失败: ${e}`)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: DataTableColumn<FeaturePricing>[] = [
    {
      key: 'feature',
      header: '消费功能',
      render: (item) => (
        <span className="text-xs font-medium text-gray-600">
          {FEATURE_LABELS[item.feature] ?? item.feature}
        </span>
      ),
    },
    {
      key: 'description',
      header: '消费场景',
      render: (item) => (
        <EditableCell
          value={item.description || ''}
          type="text"
          onSave={(v) => handleEdit(item.id, 'description', v)}
        />
      ),
    },
    {
      key: 'stones',
      header: '消耗风铃石',
      render: (item) => (
        <EditableCell
          value={item.stones}
          type="number"
          onSave={(v) => handleEdit(item.id, 'stones', v)}
        />
      ),
    },
    {
      key: 'is_active',
      header: '启用',
      align: 'center',
      render: (item) => (
        <button
          role="switch"
          aria-checked={item.is_active}
          onClick={() => handleToggleActive(item)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            item.is_active ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
              item.is_active ? 'translate-x-[18px]' : 'translate-x-[4px]'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      render: (item) => (
        <span className="text-gray-500 text-xs">{fmtDate(item.created_at)}</span>
      ),
    },
    {
      key: 'delete',
      header: '',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => {
            if (item.is_active) {
              toast.warning('请先停用再删除')
              return
            }
            setDeleteId(item.id)
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">功能定价</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增功能
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <select
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            {FEATURE_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-36"
          />
          <input
            type="number"
            placeholder="消耗风铃石"
            value={newStones}
            onChange={(e) => setNewStones(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-32"
          />
          <button
            onClick={handleAdd}
            className="h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            确认
          </button>
          <button
            onClick={() => setAdding(false)}
            className="h-10 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      )}

      <DataTable<FeaturePricing>
        columns={columns}
        data={items}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns="1fr 3fr 1fr 52px 100px 40px"
        isLoading={loading}
        error={error}
        errorMessage={error ? `加载失败: ${error}` : undefined}
        onRetry={fetch}
        emptyTitle="暂无功能定价"
        emptyDescription="点击「新增功能」创建第一条功能定价"
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="确认删除"
        description="删除后无法恢复，确认删除该功能定价？"
        confirmLabel="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
