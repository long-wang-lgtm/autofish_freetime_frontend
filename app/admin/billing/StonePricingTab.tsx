'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi, type StoneSalePricing } from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EditableCell } from '@/components/ui/EditableCell'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/utils/format'
import { Plus, Trash2 } from 'lucide-react'

export function StonePricingTab() {
  const [items, setItems] = useState<StoneSalePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getStonePrices()
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
      const n = Number(value)
      if (isNaN(n)) {
        toast.error('请输入有效数字')
        throw new Error('Invalid')
      }
      await adminApi.updateStonePrice(id, { [field]: n })
      toast.success('已更新')
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: n } : item)),
      )
    },
    [],
  )

  const handleAdd = async () => {
    const price = Number(newPrice)
    const amount = Number(newAmount)
    if (isNaN(price) || isNaN(amount)) {
      toast.error('请填写有效的数字')
      return
    }
    try {
      await adminApi.createStonePrice({ price, amount })
      toast.success('定价已新增')
      setAdding(false)
      setNewPrice('')
      setNewAmount('')
      fetch()
    } catch (e) {
      toast.error(`新增失败: ${e}`)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await adminApi.deleteStonePrice(deleteId)
      toast.success('已删除')
      setItems((prev) => prev.filter((i) => i.id !== deleteId))
    } catch (e) {
      toast.error(`删除失败: ${e}`)
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const columns: DataTableColumn<StoneSalePricing>[] = [
    {
      key: 'price',
      header: '售价(分)',
      render: (item) => (
        <EditableCell
          value={item.price}
          type="number"
          onSave={(v) => handleEdit(item.id, 'price', v)}
        />
      ),
    },
    {
      key: 'amount',
      header: '风铃石数',
      render: (item) => (
        <EditableCell
          value={item.amount}
          type="number"
          onSave={(v) => handleEdit(item.id, 'amount', v)}
        />
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      render: (item) => (
        <span className="text-gray-500 text-xs">
          {item.created_at ? fmtDate(item.created_at) : '-'}
        </span>
      ),
    },
    {
      key: 'delete',
      header: '',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => setDeleteId(item.id)}
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
        <h3 className="text-sm font-semibold text-gray-700">风铃石定价</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增定价
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <input
            type="number"
            placeholder="售价(分)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-32"
          />
          <input
            type="number"
            placeholder="风铃石数"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
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

      <DataTable<StoneSalePricing>
        columns={columns}
        data={items}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns="1fr 1fr 120px 40px"
        isLoading={loading}
        error={error}
        errorMessage={error ? `加载失败: ${error}` : undefined}
        onRetry={fetch}
        emptyTitle="暂无风铃石定价"
        emptyDescription="点击「新增定价」创建第一条定价"
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="确认删除"
        description="删除后无法恢复，确认删除该定价？"
        confirmLabel="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
