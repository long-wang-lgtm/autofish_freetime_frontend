"use client"

import { Suspense } from "react"
import { useTabRouting } from "@/hooks/useTabRouting"
import { TabBar } from "@/components/ui/Tab"
import RuleDrawer from "@/components/items/drawers/RuleDrawer"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/KeywordDrawer"
import { ItemsTab } from "@/components/items/ItemsTab"
import { RulesTab } from "@/components/items/RulesTab"
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
        <ItemsTab
          isMobile={isMobile}
          accountsData={accountsData}
          searchInput={searchInput}
          filters={filters}
          stats={stats}
          sortField={sortField}
          sortDirection={sortDirection}
          isRefreshing={isRefreshing}
          onSearchChange={setSearchInput}
          onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          onRefresh={handleRefresh}
          onClearFilters={handleClearFilters}
          onSortChange={(field) => handleSort(field as "title" | "price" | "publishTime" | "status")}
          data={data}
          sortedItems={sortedItems}
          itemKeywordCounts={itemKeywordCounts}
          isLoading={isLoading}
          error={error}
          onToggle={(item, field) => handleToggle(item, field as "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock")}
          updateMutation={updateMutation}
          onEdit={setEditingItem}
          onKeywordClick={setKeywordItem}
          onConfigClick={setMobileConfig}
          onSendCodeChange={(gid, value) => updateMutation.mutate({ gid, data: { sendCode: value } })}
        />
      )}

      {/* 关键词规则 tab */}
      {activeTab === "rules" && (
        <RulesTab
          keywordRules={keywordRules}
          rulesStats={rulesStats}
          keywordsLoading={keywordsLoading}
          keywordsError={keywordsError}
          onCreateRule={() => setShowCreateForm(true)}
          onEditRule={setEditingRule}
        />
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

      {/* 创建规则 — 响应式抽屉 */}
      {showCreateForm && (
        <RuleDrawer open={showCreateForm} onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />
      )}
      {/* 编辑规则 — 响应式抽屉 */}
      {editingRule && (
        <RuleDrawer rule={editingRule} open={!!editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />
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
