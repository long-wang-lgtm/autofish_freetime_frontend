# 状态管理规范

> 参考实现：`stores/auth.store.ts`（Zustand 全局状态）、`hooks/useItemsPage.ts`（React Query 数据编排）、`hooks/useImStatusSnapshots.ts`（SSE 单例模式）

## 核心原则

### 1. Zustand vs React Query 使用边界

| 状态类型 | 使用方案 | 判断标准 | 示例 |
|----------|----------|----------|------|
| **服务端数据** | React Query（`useQuery`/`useMutation`） | 数据的真实来源在后端，前端只是缓存 | 商品列表、账号列表、关键词规则 |
| **客户端全局状态** | Zustand store | 数据完全在前端产生，不需要与后端同步 | 当前登录用户、认证状态 |
| **UI 状态** | 组件内 `useState` | 仅影响单个组件或紧密子树的临时状态 | 筛选展开/折叠、面板宽度拖拽 |
| **URL 状态** | `useSearchParams` + `useTabRouting` | 需要在刷新/分享后保持的状态 | Tab 选中项、筛选条件（可选） |

```tsx
// ✅ 服务端数据用 React Query
const { data: items } = useQuery({
  queryKey: ['items', filters],
  queryFn: () => listItems(filters),
})

// ✅ 客户端全局状态用 Zustand
const user = useAuth(state => state.user)

// ✅ UI 临时状态用 useState
const [isFilterExpanded, setFilterExpanded] = useState(false)

// ❌ 服务端数据用 useState + useEffect 裸请求
const [data, setData] = useState([])
useEffect(() => { fetchData().then(setData) }, [])
```

### 2. React Query 配置标准

全局配置（`lib/api/queryClient.tsx`）：

| 配置项 | 值 | 理由 |
|--------|-----|------|
| `staleTime` | `60 * 1000`（60s） | 管理后台数据变化频率低，1 分钟内无需重新请求 |
| `gcTime` | `5 * 60 * 1000`（5min） | 离开页面后缓存保留 5 分钟，避免返回时重新加载 |
| `retry` | `1` | 失败重试 1 次，避免过度重试 |
| `refetchOnWindowFocus` | `false` | 管理后台频繁切换标签页，不需要自动刷新 |

```tsx
// 对变化频率极低的数据，可在组件级延长 staleTime
const { data: accounts } = useQuery({
  queryKey: ['accounts'],
  queryFn: getAccountNames,
  staleTime: 5 * 60 * 1000, // 账号名几乎不会变
})
```

### 3. 乐观更新 vs invalidation 决策树

```
mutation 完成后需要更新 UI
│
├─ 只影响单个实体，且变更可本地计算 → 用 setQueryData 乐观更新
│   例：切换商品的自动发货开关 → 直接修改缓存中该商品的 auto_delivery 字段
│
├─ 影响多个实体 / 列表顺序可能改变 → 用 invalidateQueries
│   例：新增商品 → 列表可能重新排序，缓存无法简单更新
│
└─ 同时影响统计和列表 → 优先 setQueryData，必要时再 invalidate 统计
    例：修改商品状态 → setQueryData 更新列表 + invalidateQueries 统计
```

```tsx
// ✅ 乐观更新——适用于简单字段切换
const toggleMutation = useMutation({
  mutationFn: (itemId: string) => updateItem(itemId, { auto_delivery: newValue }),
  onMutate: async (itemId) => {
    await queryClient.cancelQueries({ queryKey: ['items'] })
    const previous = queryClient.getQueryData(['items'])
    queryClient.setQueryData(['items'], (old: Item[]) =>
      old?.map(i => i.gid === itemId ? { ...i, auto_delivery: newValue } : i)
    )
    return { previous }
  },
  onError: (_err, _itemId, context) => {
    queryClient.setQueryData(['items'], context?.previous)
  },
})

// ✅ invalidate——适用于新增/删除/批量操作
const deleteMutation = useMutation({
  mutationFn: (itemId: string) => deleteItem(itemId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
  },
})
```

### 4. SSE / 实时数据模式

`useImStatusSnapshots.ts` 建立了 SSE 的最佳实践，所有需要服务端推送的场景应参考此模式：

- **模块级单例**：全局共享一个 EventSource 实例，避免重复连接
- **useSyncExternalStore**：React 18 并发模式安全的订阅
- **延迟断开**：最后一个订阅者离开后延迟 5 秒断开，避免页面切换时重复连接
- **滚动缓冲区**：保留固定数量的历史数据点

## 自定义 Hook 拆分原则

### 何时拆分

一个自定义 hook 出现以下信号时应拆分：

| 信号 | 当前示例 | 建议拆分方式 |
|------|----------|-------------|
| 返回 20+ 个属性 | `useItemsPage`（30+ 属性） | 数据获取 / 筛选状态 / 变更操作 三层拆分 |
| 混合 React Query + useState | 多个 fetch 和 UI state 混在一起 | 数据层 hook + UI 状态 hook |
| 包含 3+ 个 useEffect | — | 每个副作用独立 hook |

### 拆分示例：useItemsPage

```
当前：
useItemsPage() → 30+ 属性（items, stats, filters, pagination, mutations, ...）

建议拆分为：
useItemsData(filters, page)        → { items, stats, isLoading, error }
useItemsFilters()                   → { filters, setFilter, clearFilters, searchInput, debouncedSearch }
useItemMutations()                  → { toggleAutoReply, toggleAutoDelivery, handleRefresh, ... }

页面组件中组合：
function ItemsPageContent() {
  const { filters, setFilter, ... } = useItemsFilters()
  const { items, stats, isLoading } = useItemsData(filters, page)
  const { toggleAutoReply, handleRefresh } = useItemMutations()
  // ...
}
```

**拆分规则**：
- 数据层 hooks（`use*Data`）：只包含 React Query 的 useQuery/useMutation，返回数据+加载状态
- 状态层 hooks（`use*Filters`/`use*State`）：只包含 useState/useReducer，不发起请求
- 操作层 hooks（`use*Mutations`）：只包含 useMutation，返回操作方法

## 反模式

- 用 `useState + useEffect` 裸请求服务端数据（应用 React Query）
- Zustand store 存储服务端数据（应用 React Query）
- 自定义 hook 返回 20+ 个属性（应拆分为数据/状态/操作三层）
- 多个组件各自 `useQuery` 同一 key（React Query 已去重，但应抽取为共享 hook）
- mutation 后仅 `invalidateQueries` 不做乐观更新（开关类操作应乐观更新）
- SSE 连接未在组件卸载时关闭
