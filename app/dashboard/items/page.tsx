"use client"

import { Suspense } from "react"
import { useTabRouting } from "@/hooks/useTabRouting"
import { TabBar } from "@/components/ui/Tab"
import { RuleTable } from "@/components/rules/RuleTable"
import { RuleForm } from "@/components/rules/RuleForm"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { FilterBar } from "@/components/items/FilterBar"
import { ItemRow } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/KeywordDrawer"
import { useItemsPage } from "@/hooks/useItemsPage"

function ItemsPageContent() {
  const {
    editingItem, setEditingItem,
    keywordItem, setKeywordItem,
    mobileConfig, setMobileConfig,
    editingRule, setEditingRule,
    showCreateForm, setShowCreateForm,
    filters, setFilters,
    searchInput, setSearchInput,
    sortField, sortDirection,
    isRefreshing,
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    sortedItems,
    stats,
    updateMutation,
    handleToggle,
    handleClearFilters,
    handleSort,
    handleRefresh,
    isMobile,
  } = useItemsPage()

  const [activeTab, setActiveTab] = useTabRouting(['items', 'rules'] as const, 'items')

  return (
    <div className="flex flex-col min-h-0 h-full space-y-5">
      {/* Tab 栏 */}
      <TabBar
        tabs={[
          { key: "items", label: "商品管理" },
          { key: "rules", label: "回复规则" },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as "items" | "rules")}
        variant="overline"
      />

      {/* Tab 描述 */}
      <p className="text-sm text-gray-500 -mt-3">
        {activeTab === "items"
          ? "可配置功能：自动发货、发货配置、自动上架、自动回复规则绑定、AI回复、AI提示词"
          : "可配置功能：自动回复关键词规则，匹配买家消息并自动发送预设回复"}
      </p>

      {/* 商品管理 tab */}
      {activeTab === "items" && (
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* 移动端筛选栏 */}
          {isMobile && (
            <FilterBar
              accounts={accountsData || []}
              searchInput={searchInput}
              statusFilter={filters.status}
              onSearchChange={setSearchInput}
              onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
              onRefresh={handleRefresh}
              onClear={handleClearFilters}
              isRefreshing={isRefreshing}
              selectedUid={filters.uid}
              stats={stats}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSort}
            />
          )}

          <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* 桌面端搜索表单 */}
            <div className="hidden md:block">
              <FilterBar
                accounts={accountsData || []}
                searchInput={searchInput}
                statusFilter={filters.status}
                onSearchChange={setSearchInput}
                onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
                onRefresh={handleRefresh}
                onClear={handleClearFilters}
                isRefreshing={isRefreshing}
                selectedUid={filters.uid}
                stats={stats}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSort}
              />
            </div>

            {/* 加载/错误/空状态 */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
                加载商品列表失败: {String(error)}
              </div>
            )}
            {!isLoading && !error && data && data.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center m-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">暂无商品</h3>
                <p className="text-sm text-gray-500">没有找到符合条件的商品</p>
              </div>
            )}

            {!isLoading && !error && data && data.length > 0 && (
              <>
                {/* === 桌面端表格 === */}
                <div className="flex-1 overflow-auto hidden md:block" style={{ minHeight: "200px" }}>
                  {/* 表头 */}
                  <div
                    className="sticky top-0 z-10 grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600"
                    style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
                  >
                    <div className="col-span-2">
                      <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => handleSort("title")}>
                        商品信息
                        {sortField === "title"
                          ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-gray-300">↕</span>
                        }
                      </button>
                    </div>
                    <div className="col-span-1 text-right">
                      <button className="flex items-center gap-1 ml-auto hover:text-blue-600" onClick={() => handleSort("price")}>
                        价格
                        {sortField === "price"
                          ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-gray-300">↕</span>
                        }
                      </button>
                    </div>
                    <div className="col-span-1 text-center">
                      <button className="flex items-center gap-1 mx-auto hover:text-blue-600" onClick={() => handleSort("publishTime")}>
                        发布时间
                        {sortField === "publishTime"
                          ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-gray-300">↕</span>
                        }
                      </button>
                    </div>
                    <div className="col-span-1 text-center">数据</div>
                    <div className="col-span-1 text-center">AI回复</div>
                    <div className="col-span-1 text-center">自动发货</div>
                    <div className="col-span-1 text-center">付款后发货</div>
                    <div className="col-span-1 text-center">收货后赠送</div>
                    <div className="col-span-1 text-center">评价后赠送</div>
                    <div className="col-span-1 text-center">关键词回复</div>
                    <div className="col-span-1 text-center">AI提示词</div>
                    <div className="col-span-1 text-center">自动上架</div>
                    <div className="col-span-1 text-center">指令码</div>
                  </div>

                  {/* 内容区域 */}
                  {sortedItems.map((item, index) => (
                    <ItemRow
                      key={item.gid}
                      item={item}
                      isEven={index % 2 === 0}
                      onToggle={handleToggle}
                      onEdit={() => setEditingItem(item)}
                      onKeywordClick={() => setKeywordItem(item)}
                      keywordCount={itemKeywordCounts[item.gid] || 0}
                      onUpdateField={(gid, field, value) =>
                        updateMutation.mutate({ gid, data: { [field]: value } })
                      }
                    />
                  ))}
                </div>

                {/* === 移动端卡片列表 === */}
                <div className="flex-1 overflow-auto md:hidden px-1 pb-2 space-y-2.5" style={{ minHeight: "200px" }}>
                  {sortedItems.map((item) => (
                    <MobileProductCard
                      key={item.gid}
                      item={item}
                      keywordCount={itemKeywordCounts[item.gid] || 0}
                      onToggle={handleToggle}
                      onEdit={() => setEditingItem(item)}
                      onKeywordClick={() => setKeywordItem(item)}
                      onConfigClick={(field) => setMobileConfig({ item, field })}
                      onSendCodeChange={(gid, value) =>
                        updateMutation.mutate({ gid, data: { sendCode: value } })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 关键词规则 tab */}
      {activeTab === "rules" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* 统计信息 */}
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{rulesStats.total}</div>
              <div className="text-xs text-gray-500">规则总数</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{rulesStats.enabled}</div>
              <div className="text-xs text-gray-500">已启用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-600">{rulesStats.disabled}</div>
              <div className="text-xs text-gray-500">已禁用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{rulesStats.linkedItems}</div>
              <div className="text-xs text-gray-500">关联商品</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{rulesStats.linkedGroups}</div>
              <div className="text-xs text-gray-500">关联商品组</div>
            </div>
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500">
              {rulesStats.total === 0
                ? "暂无规则"
                : `共 ${rulesStats.total} 条规则，按优先级降序排列`}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建规则
            </button>
          </div>

          {/* 规则列表 / 空状态 */}
          {keywordsLoading && (
            <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
          )}
          {keywordsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
              加载规则列表失败: {String(keywordsError)}
            </div>
          )}
          {!keywordsLoading && !keywordsError && rulesStats.total === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
              <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                创建规则
              </button>
            </div>
          )}
          {!keywordsLoading && !keywordsError && rulesStats.total > 0 && (
            <RuleTable
              className="border-0 rounded-none shadow-none"
              rules={keywordRules}
              onEdit={setEditingRule}
            />
          )}
        </div>
      )}

      {/* 编辑商品 — 响应式抽屉 */}
      {editingItem && (
        <ItemEditDrawer
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复 — 响应式抽屉 */}
      {keywordItem && (
        <KeywordDrawer
          item={keywordItem}
          open={!!keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}

      {/* 配置编辑 — 响应式抽屉 */}
      {mobileConfig && (
        <ConfigDrawer
          open={!!mobileConfig}
          item={mobileConfig.item}
          field={mobileConfig.field}
          onClose={() => setMobileConfig(null)}
          onSave={(gid, field, value) => {
            updateMutation.mutate({ gid, data: { [field]: value } })
            setMobileConfig(null)
          }}
        />
      )}

      {/* 创建规则表单 */}
      {showCreateForm && (
        <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />
      )}
      {/* 编辑规则表单 */}
      {editingRule && (
        <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />
      )}
    </div>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <ItemsPageContent />
    </Suspense>
  )
}
