'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listMonitorMerchants, addMonitorMerchant, removeMonitorMerchant } from '@/lib/api/selection'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Search, Plus, Trash2 } from 'lucide-react'

export function MerchantMonitorTab() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUid, setNewUid] = useState('')
  const [newName, setNewName] = useState('')
  const [searchText, setSearchText] = useState('')
  const queryClient = useQueryClient()

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['monitor-merchants'],
    queryFn: listMonitorMerchants,
  })

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUid.trim()) return
    await addMonitorMerchant(newUid.trim(), newName.trim())
    setNewUid('')
    setNewName('')
    setShowAddModal(false)
    queryClient.invalidateQueries({ queryKey: ['monitor-merchants'] })
  }

  const handleRemoveMerchant = async (uid: string) => {
    await removeMonitorMerchant(uid)
    queryClient.invalidateQueries({ queryKey: ['monitor-merchants'] })
  }

  const filtered = useMemo(() => {
    if (!searchText) return merchants
    return merchants.filter(m =>
      (m.name || m.uid).toLowerCase().includes(searchText.toLowerCase())
    )
  }, [merchants, searchText])

  return (
    <div className="space-y-3">
      {/* 商家列表 + 添加 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="搜索商家..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" />
            添加商家
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-gray-400">
              {searchText ? '无匹配商家' : '暂无监控商家，点击上方添加'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">商家UID</th>
                  <th className="pb-2 font-medium">名称</th>
                  <th className="pb-2 font-medium text-right">优先级</th>
                  <th className="pb-2 font-medium">最后采集</th>
                  <th className="pb-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.uid} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs">{m.uid}</td>
                    <td className="py-2">{m.name || '-'}</td>
                    <td className="py-2 text-right">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        m.monitorStatus === 1 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {m.priority ?? '-'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400">{m.last_fetch_at?.split('T')[0] || '-'}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleRemoveMerchant(m.uid)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 添加商家弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-gray-900 mb-4">添加监控商家</h3>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1.5">商家UID</label>
                <input
                  type="text"
                  value={newUid}
                  onChange={e => setNewUid(e.target.value)}
                  placeholder="输入闲鱼商家UID"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1.5">商家名称（可选）</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="便于识别的名称"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newUid.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI 分析报告 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">AI 商家分析报告</h3>
        <p className="text-sm text-gray-500 text-center py-4">
          基于监控商家的 AI 潜力分析报告将展示在这里
        </p>
      </div>
    </div>
  )
}
