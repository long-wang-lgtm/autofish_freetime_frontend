'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { Pagination } from '@/components/ui/data/Pagination'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  listOpportunities,
  listMonitoredItems,
  type OpportunityItem,
  type MonitoredItem,
} from '@/lib/api/batch-publish'

interface SourcePickerModalProps {
  open: boolean
  onClose: () => void
  /** 「下一步」回调——把勾选的商机与选品交给父组件 */
  onConfirm: (opps: OpportunityItem[], items: MonitoredItem[]) => void
}

const PICKER_PAGE_SIZE = 20

/**
 * 单栏选择列 — 搜索 + 列表 + 分页。
 * PC 双栏网格与移动端 Tab 栏内共用。
 */
function PickerColumn<T>({
  title,
  count,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  items,
  total,
  page,
  onPageChange,
  emptyText,
  isFetching,
  renderItem,
}: {
  title: string
  count: number
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (v: string) => void
  items: T[]
  total: number
  page: number
  onPageChange: (p: number) => void
  emptyText: string
  isFetching: boolean
  renderItem: (item: T) => ReactNode
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <span className="text-xs text-gray-500 tabular-nums">已选 {count}</span>
      </div>
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white w-full mb-2"
      />
      <div className="flex-1 min-h-0 max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
        {isFetching && items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400 text-center">加载中...</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400 text-center">{emptyText}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
      <div className="mt-1">
        <Pagination page={page} total={total} pageSize={PICKER_PAGE_SIZE} onChange={onPageChange} />
      </div>
    </div>
  )
}

/**
 * 跨源批量创建入口 — 源选择弹窗。
 * 商机 + 选品两个多选区（PC 双栏 / 移动端 Tab 切换），可混合勾选后进入 CreateMaterialModal 批量创建。
 */
export function SourcePickerModal({ open, onClose, onConfirm }: SourcePickerModalProps) {
  const isMobile = useIsMobile()
  // 已选对象 Map — 跨页保留完整对象，确认时不依赖当前页数据
  const [selectedOpps, setSelectedOpps] = useState<Map<number, OpportunityItem>>(new Map())
  const [selectedItems, setSelectedItems] = useState<Map<string, MonitoredItem>>(new Map())
  // 移动端顶部 Tab
  const [activeTab, setActiveTab] = useState<'opp' | 'item'>('opp')
  // 每栏独立搜索 + 分页
  const [oppSearch, setOppSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [oppPage, setOppPage] = useState(1)
  const [itemPage, setItemPage] = useState(1)

  const debouncedOppSearch = useDebounce(oppSearch, 300)
  const debouncedItemSearch = useDebounce(itemSearch, 300)

  // 每次打开重置勾选（搜索/页码保留）
  useEffect(() => {
    if (open) {
      setSelectedOpps(new Map())
      setSelectedItems(new Map())
    }
  }, [open])

  // 仅在打开时拉取（cache 命中后复用，批量创建后由前缀 invalidate 刷新）
  const { data: oppData, isFetching: oppFetching } = useQuery({
    queryKey: ['batch-publish', 'opportunities', 'picker', { name: debouncedOppSearch || undefined, page: oppPage }],
    queryFn: () => listOpportunities({ name: debouncedOppSearch || undefined, page: oppPage, page_size: PICKER_PAGE_SIZE }),
    enabled: open,
  })
  const { data: itemData, isFetching: itemFetching } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', 'picker', { title: debouncedItemSearch || undefined, page: itemPage }],
    queryFn: () => listMonitoredItems({ title: debouncedItemSearch || undefined, page: itemPage, page_size: PICKER_PAGE_SIZE }),
    enabled: open,
  })

  const opps = oppData?.items ?? []
  const items = itemData?.items ?? []
  const count = selectedOpps.size + selectedItems.size

  const handleOppSearchChange = (v: string) => { setOppSearch(v); setOppPage(1) }
  const handleItemSearchChange = (v: string) => { setItemSearch(v); setItemPage(1) }

  const toggleOpp = (o: OpportunityItem) => {
    setSelectedOpps((prev) => {
      const next = new Map(prev)
      if (next.has(o.id)) next.delete(o.id); else next.set(o.id, o)
      return next
    })
  }

  const toggleItem = (i: MonitoredItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(i.gid)) next.delete(i.gid); else next.set(i.gid, i)
      return next
    })
  }

  const handleNext = () => {
    onConfirm(Array.from(selectedOpps.values()), Array.from(selectedItems.values()))
  }

  // checkbox 行 — h-11 保证 ≥44px 触控目标，整行可点
  const checkboxRow = (checked: boolean, onToggle: () => void, label: ReactNode) => (
    <label className="flex items-center gap-3 h-11 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
      />
      <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{label}</span>
    </label>
  )

  const oppColumn = (
    <PickerColumn<OpportunityItem>
      title="商机"
      count={selectedOpps.size}
      searchPlaceholder="搜索商机名..."
      searchValue={oppSearch}
      onSearchChange={handleOppSearchChange}
      items={opps}
      total={oppData?.total ?? 0}
      page={oppPage}
      onPageChange={setOppPage}
      emptyText="暂无商机"
      isFetching={oppFetching}
      renderItem={(o) => (
        <div key={o.id}>
          {checkboxRow(
            selectedOpps.has(o.id),
            () => toggleOpp(o),
            <span className="flex items-center gap-2">
              <span className="truncate">{o.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">#{o.id}</span>
            </span>,
          )}
        </div>
      )}
    />
  )

  const itemColumn = (
    <PickerColumn<MonitoredItem>
      title="选品"
      count={selectedItems.size}
      searchPlaceholder="搜索选品标题..."
      searchValue={itemSearch}
      onSearchChange={handleItemSearchChange}
      items={items}
      total={itemData?.total ?? 0}
      page={itemPage}
      onPageChange={setItemPage}
      emptyText="暂无监控选品"
      isFetching={itemFetching}
      renderItem={(i) => (
        <div key={i.gid}>
          {checkboxRow(
            selectedItems.has(i.gid),
            () => toggleItem(i),
            <span className="flex items-center gap-2">
              <span className="truncate">{i.title || i.gid}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{i.gid}</span>
            </span>,
          )}
        </div>
      )}
    />
  )

  const content = (
    <div>
      {isMobile && (
        <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2">
          <button
            onClick={() => setActiveTab('opp')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'opp' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            商机{selectedOpps.size > 0 ? ` (${selectedOpps.size})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('item')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'item' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            选品{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}
          </button>
        </div>
      )}
      {isMobile ? (
        activeTab === 'opp' ? oppColumn : itemColumn
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {oppColumn}
          {itemColumn}
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        取消
      </button>
      <button
        onClick={handleNext}
        disabled={count === 0}
        className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        下一步：创建素材{count > 0 ? `（${count}）` : ''}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title="选择素材来源" subtitle="商机与选品可混合勾选" footer={footer}>
        <div className="p-4">{content}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="选择素材来源" size="lg" footer={footer}>
      <p className="text-sm text-gray-500 mb-4">商机与选品可混合勾选，下一步批量创建素材</p>
      {content}
    </Modal>
  )
}
