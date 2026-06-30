"use client"

import { Suspense } from "react"
import { useTabRouting } from "@/hooks/useTabRouting"
import { TabBar } from "@/components/ui/Tab"
import { ItemsTab } from "@/components/items/ItemsTab"
import { ItemsFilterBar } from "@/components/items/ItemsFilterBar"
import { RulesTab } from "@/components/items/RulesTab"
import { useItemsPage } from "@/hooks/useItemsPage"

function ItemsPageContent() {
  const {
    filterState,
    onFilterChange,
    page,
    pageSize,
    totalPages,
    setPage,
    totalItems,
    isRefreshing,
    accountsData,
    data, isLoading, error, refetch,
    keywordsLoading, keywordsError,
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    updateMutation,
    handleToggle,
    handleRefresh,
    isMobile,
  } = useItemsPage()

  const [activeTab, setActiveTab] = useTabRouting(['items', 'rules'] as const, 'items')

  return (
    <div className="flex flex-col gap-2 h-full">
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
      {/* <p className="text-sm text-gray-500 hidden md:block">
        {activeTab === "items"
          ? "可配置功能：自动发货、发货配置、自动上架、自动回复规则绑定、AI回复、AI提示词"
          : "可配置功能：自动回复关键词规则，匹配买家消息并自动发送预设回复"}
      </p> */}

      {/* 筛选卡片（卡片外部，Tab 下方） */}
      {activeTab === "items" && (
        <ItemsFilterBar
          accounts={accountsData || []}
          filterState={filterState}
          onFilterChange={onFilterChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* 内容卡片 */}
      {activeTab === "items" && (
        <ItemsTab
          isMobile={isMobile}
          data={data}
          isLoading={isLoading}
          error={error}
          itemKeywordCounts={itemKeywordCounts}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onRetry={() => refetch()}
          onToggle={(item, field) =>
            handleToggle(item, field as "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock")
          }
          updateMutation={updateMutation}
        />
      )}

      {activeTab === "rules" && (
        <RulesTab
          isMobile={isMobile}
          keywordRules={keywordRules}
          rulesStats={rulesStats}
          keywordsLoading={keywordsLoading}
          keywordsError={keywordsError}
        />
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
