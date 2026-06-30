# 状态管理规范

## 核心原则

### 1. Zustand vs React Query 使用边界

| 状态类型 | 使用方案 | 判断标准 | 示例 |
|----------|----------|----------|------|
| 服务端数据 | React Query（useQuery/useMutation） | 数据的真实来源在后端，前端只是缓存 | 商品列表、账号列表、关键词规则 |
| 客户端全局状态 | Zustand store | 数据完全在前端产生，不需要与后端同步 | 当前登录用户、认证状态 |
| UI 状态 | 组件内 useState | 仅影响单个组件或紧密子树的临时状态 | 筛选展开/折叠、面板宽度拖拽 |
| URL 状态 | useSearchParams + useTabRouting | 需要在刷新/分享后保持的状态 | Tab 选中项、筛选条件（可选） |

### 2. React Query 配置标准

全局配置项及默认值：

| 配置项 | 值 | 理由 |
|--------|-----|------|
| staleTime | 60s（60 * 1000） | 管理后台数据变化频率低，1 分钟内无需重新请求 |
| gcTime | 5min（5 * 60 * 1000） | 离开页面后缓存保留 5 分钟，避免返回时重新加载 |
| retry | 1 | 失败重试 1 次，避免过度重试 |
| refetchOnWindowFocus | false | 管理后台频繁切换标签页，不需要自动刷新 |

对变化频率极低的数据（如账号名称），可在组件级延长 staleTime 至 5 分钟。

### 3. 乐观更新 vs invalidation 决策树

**决策规则**：

- 只影响单个实体，且变更可本地计算：使用 setQueryData 乐观更新（例如切换商品的自动发货开关，直接修改缓存中该字段）
- 影响多个实体或列表顺序可能改变：使用 invalidateQueries（例如新增商品，列表可能重新排序）
- 同时影响统计和列表：优先 setQueryData 更新列表，必要时再 invalidateQueries 刷新统计

乐观更新需要在 onMutate 中通过 `cancelQueries` 取消进行中的请求，保存 `previous` 快照，在 onError 中回滚。具体实现详见 docs/STATE_PATTERNS.md。

### 4. SSE / 实时数据模式

所有需要服务端推送的场景应遵循以下架构要点：

- **模块级单例**：全局共享一个 EventSource 实例，避免重复连接
- **useSyncExternalStore**：React 18 并发模式安全的订阅机制
- **延迟断开**：最后一个订阅者离开后延迟 5 秒断开，避免页面切换时重复连接
- **滚动缓冲区**：保留固定数量的历史数据点

完整实现模式详见 docs/STATE_PATTERNS.md。

## 自定义 Hook 拆分原则

### 何时拆分

一个自定义 hook 出现以下信号时应拆分：

| 信号 | 建议拆分方式 |
|------|-------------|
| 返回 20+ 个属性 | 数据获取 / 筛选状态 / 变更操作 三层拆分 |
| 混合 React Query + useState | 数据层 hook + UI 状态 hook |
| 包含 3+ 个 useEffect | 每个副作用独立 hook |

### 拆分规则

- **数据层 hooks**（命名 `use*Data`）：只包含 React Query 的 useQuery/useMutation，返回数据 + 加载状态，不发起请求以外的副作用
- **状态层 hooks**（命名 `use*Filters` / `use*State`）：只包含 useState/useReducer，管理 UI 临时状态，不发起请求
- **操作层 hooks**（命名 `use*Mutations`）：只包含 useMutation，返回操作方法，隔离变更逻辑

页面组件负责组合三层 hooks，不直接调用底层 fetch 函数。

## 反模式

- 用 useState + useEffect 裸请求服务端数据（应用 React Query）
- Zustand store 存储服务端数据（应用 React Query）
- 自定义 hook 返回 20+ 个属性（应拆分为数据/状态/操作三层）
- 多个组件各自 useQuery 同一 key（React Query 已去重，但应抽取为共享 hook）
- mutation 后仅 invalidateQueries 不做乐观更新（开关类操作应乐观更新）
- SSE 连接未在组件卸载时关闭

## 另见

- [错误处理规范](frontend-error.md) — API 错误与 React Query onError 集成
- [表单处理规范](frontend-form.md) — 表单提交与 React Query mutation 集成
- [性能检查清单](frontend-performance.md) — 乐观更新减少网络请求
