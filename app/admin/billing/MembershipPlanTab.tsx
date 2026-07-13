'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminApi, type MembershipPlan } from '@/lib/api/admin'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { EditableCell } from '@/components/ui/data/EditableCell'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/utils/format'
import { Plus } from 'lucide-react'

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Free', color: 'gray' },
  1: { label: 'Basic', color: 'blue' },
  2: { label: 'Standard', color: 'amber' },
  3: { label: 'Pro', color: 'purple' },
}

export function MembershipPlanTab() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTier, setNewTier] = useState<number>(1)
  const [newPrice, setNewPrice] = useState('')
  const [newMaxAccounts, setNewMaxAccounts] = useState('')
  const [newDailyBonus, setNewDailyBonus] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getMembershipPlans()
      setPlans(data || [])
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
      const numVal = Number(value)
      if (isNaN(numVal)) {
        toast.error('请输入有效数字')
        throw new Error('Invalid number')
      }
      await adminApi.updateMembershipPlan(id, { [field]: numVal })
      toast.success('已更新')
      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: numVal } : p)),
      )
    },
    [],
  )

  const handleAdd = async () => {
    const price = Number(newPrice)
    const maxAccounts = Number(newMaxAccounts)
    const dailyBonus = Number(newDailyBonus)
    if (isNaN(price) || isNaN(maxAccounts) || isNaN(dailyBonus)) {
      toast.error('请填写有效的数字')
      return
    }
    try {
      await adminApi.createMembershipPlan({
        tier: newTier,
        price,
        max_accounts: maxAccounts,
        daily_bonus: dailyBonus,
      })
      toast.success('方案已新增')
      setAdding(false)
      setNewPrice('')
      setNewMaxAccounts('')
      setNewDailyBonus('')
      fetch()
    } catch (e) {
      toast.error(`新增失败: ${e}`)
    }
  }

  const columns: DataTableColumn<MembershipPlan>[] = [
    {
      key: 'tier',
      header: '等级',
      align: 'center',
      render: (item) => {
        const info = TIER_LABELS[item.tier]
        const colorMap: Record<string, string> = {
          gray: 'bg-gray-100 text-gray-600',
          blue: 'bg-blue-50 text-blue-600',
          amber: 'bg-amber-50 text-amber-600',
          purple: 'bg-purple-50 text-purple-600',
        }
        return (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${info ? colorMap[info.color] : ''}`}
          >
            {info?.label ?? item.tier}
          </span>
        )
      },
    },
    {
      key: 'price',
      header: '月费(分)',
      align: 'center',
      render: (item) => (
        <EditableCell
          value={item.price}
          type="number"
          onSave={(v) => handleEdit(item.id, 'price', v)}
        />
      ),
    },
    {
      key: 'max_accounts',
      header: '最大店铺',
      align: 'center',
      render: (item) => (
        <EditableCell
          value={item.max_accounts}
          type="number"
          onSave={(v) => handleEdit(item.id, 'max_accounts', v)}
        />
      ),
    },
    {
      key: 'daily_bonus',
      header: '每日风铃石',
      align: 'center',
      render: (item) => (
        <EditableCell
          value={item.daily_bonus}
          type="number"
          onSave={(v) => handleEdit(item.id, 'daily_bonus', v)}
        />
      ),
    },
    {
      key: 'created_at',
      header: '创建时间',
      align: 'center',
      render: (item) => (
        <span className="text-gray-500 text-xs">{fmtDate(item.created_at)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增方案
        </button>
      </div>

      {/* 新增行 */}
      {adding && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <select
            value={newTier}
            onChange={(e) => setNewTier(Number(e.target.value))}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <option value={1}>Basic</option>
            <option value={2}>Standard</option>
            <option value={3}>Pro</option>
          </select>
          <input
            type="number"
            placeholder="月费(分)"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-28"
          />
          <input
            type="number"
            placeholder="最大店铺"
            value={newMaxAccounts}
            onChange={(e) => setNewMaxAccounts(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-28"
          />
          <input
            type="number"
            placeholder="每日风铃石"
            value={newDailyBonus}
            onChange={(e) => setNewDailyBonus(e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg w-28"
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

      {/* DataTable */}
      <DataTable<MembershipPlan>
        columns={columns}
        data={plans}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns="1fr 2fr 2fr 2fr 1fr"
        isLoading={loading}
        error={error}
        errorMessage={error ? `加载失败: ${error}` : undefined}
        onRetry={fetch}
        emptyTitle="暂无会员方案"
        emptyDescription="点击「新增方案」创建第一个会员等级"
        emptyAction={{ label: '新增方案', onClick: () => setAdding(true) }}
      />
    </div>
  )
}
