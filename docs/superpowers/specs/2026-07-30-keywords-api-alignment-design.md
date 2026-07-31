# 关键词规则 API 对齐 — 设计文档

**日期**: 2026-07-30
**类型**: 重构 / API 对齐
**后端源**: `backend/free/user/replyrule.py` + `backend/free/schema/fish.py`

---

## 一、动机

前端 `lib/api/keywords.ts` 的类型定义、端点路径、请求/响应结构与后端存在系统性偏差：字段命名不一致（snake_case vs camelCase）、`keyword` 类型错误（string vs string[]）、端点路径模式不同（RESTful path-param vs query-param）、关联数据内联而非惰性加载、预定义关键词硬编码。

本次重构以后端 API 为唯一事实来源，前端全部对齐。

---

## 二、命名原则

- **实体名对齐后端**：`ReplyItemRule` → `ReplyRule`（前端去后缀）
- **函数名 = 动词 + 实体名**：`fetchReplyRules`、`createReplyRule`、`bindRuleItems`
- **禁止模糊命名**：`listRuleItems` 这类名称语义不清（是列出规则的商品？还是列出可绑定的商品？），全部替换
- **类型名反映业务语义**：`BindableItem` 明确表示"可被绑定到规则的商品"，而非泛化的 `RuleItem`

---

## 三、类型定义

### 3.1 核心实体

```ts
/** 关键词回复规则 — 对应后端 ReplyItemRuleSchema */
export interface ReplyRule {
  id: number
  keyword: string[]            // 后端 JSON 数组；前端显示时逗号拼接，输入时逗号拆分
  keyType: "predefined" | "custom"
  matchType: "exact" | "fuzzy" | "regex"
  replyContent: string
  priority: number
  enabled: boolean
  fullShop: boolean            // 新增：是否全店生效
  itemsCount: number           // 关联商品数量（后端 annotate 计算）
  create_at: string | null
  update_at: string | null
}
```

### 3.2 可绑定商品

```ts
/** 可绑定到规则的商品 — 对应后端 ShopItemSchema（bindable.items 返回） */
export interface BindableItem {
  gid: number
  title: string | null
  reservePrice: string | null   // 后端字段名
  status: number
  picurl: string | null
}
```

### 3.3 列表响应

```ts
export interface ReplyRuleListResponse {
  total: number
  rules: ReplyRule[]
}
```

### 3.4 创建 / 更新入参

```ts
export interface ReplyRuleCreate {
  keyword: string[]
  keyType: "predefined" | "custom"
  matchType: "exact" | "fuzzy" | "regex"
  replyContent: string
  priority?: number
  enabled?: boolean
  fullShop?: boolean
  gids?: string[]              // 创建时同时绑定商品（可选）
}

export interface ReplyRuleUpdate {
  keyword?: string[]
  keyType?: "predefined" | "custom"
  matchType?: "exact" | "fuzzy" | "regex"
  replyContent?: string
  priority?: number
  enabled?: boolean
  fullShop?: boolean
}
```

### 3.5 操作结果

```ts
/** 后端 OperationResponse 通用结构 */
export interface OperationResult {
  success: boolean
  message: string
}
```

### 3.6 删除的类型

| 旧类型 | 原因 |
|--------|------|
| `LinkedItemInfo` | 关联数据不再内联于规则列表，改为惰性请求 |
| `LinkedGroupInfo` | 后端无商品组关联功能 |
| `KeywordRuleListResponse` | 重命名为 `ReplyRuleListResponse` |
| `RuleItem` | 重命名为 `BindableItem` |
| `PREDEFINED_KEYWORDS` (常量) | 删去 — API 返回字典后本地派生下拉数组 |
| `PREDEFINED_KEYWORD_LABELS` (常量) | 删去 — 直接使用 API 返回的 `Record<string, string>` |

---

## 四、API 函数签名

### 4.1 端点 → 函数映射

| 后端端点 | 方法 | 前端函数 | 说明 |
|----------|------|----------|------|
| `/api/keywords/predefined` | GET | `fetchPredefinedKeywords()` | 获取预定义关键词字典 |
| `/api/keywords?page=&size=&keyword=&enabled=&fullShop=&order_by=&asc=` | GET | `fetchReplyRules(params)` | 规则列表（分页+筛选+排序） |
| `/api/keywords/create` | POST | `createReplyRule(data)` | 创建规则 |
| `/api/keywords/update.rule?rid=X` | PUT | `updateReplyRule(id, data)` | 更新规则 |
| `/api/keywords/delete.rule?rid=X` | DELETE | `deleteReplyRule(id)` | 删除规则 |
| `/api/keywords/bindable.items` | POST | `fetchBindableItems()` | 获取可绑定商品 |
| `/api/keywords/bindable.rules` | POST | `fetchBindableRules()` | 获取可绑定规则 |
| `/api/keywords/rule.items?rid=X` | GET | `fetchRuleItems(rid)` | 获取规则已关联的商品（惰性） |
| `/api/keywords/item.rules?gid=X` | GET | `fetchItemRules(gid)` | 获取商品已关联的规则 |
| `/api/keywords/bind.rule.items?rid=X` | POST | `bindRuleItems(rid, gids[])` | 绑定商品到规则 |
| `/api/keywords/bind.item.rules?gid=X` | POST | `bindItemRules(gid, rids[])` | 绑定规则到商品 |
| `/api/keywords/unbind.rule.items?rid=X` | POST | `unbindRuleItems(rid, gids[])` | 解绑商品与规则 |
| `/api/keywords/unbind.item.rules?gid=X` | POST | `unbindItemRules(gid, rids[])` | 解绑规则与商品 |

### 4.2 函数签名详情

```ts
// ——— 查询 ———

/** 获取预定义关键词字典，返回 { "first_reply": "首次回复", ... } */
export async function fetchPredefinedKeywords(): Promise<Record<string, string>>

/** 分页查询规则列表 */
export async function fetchReplyRules(params?: {
  page?: number
  size?: number
  keyword?: string
  enabled?: boolean
  fullShop?: boolean
  order_by?: "priority" | "enabled" | "fullShop" | "create_at" | "update_at"
  asc?: boolean
}): Promise<ReplyRuleListResponse>

// ——— 增删改 ———

export async function createReplyRule(data: ReplyRuleCreate): Promise<ReplyRule>
export async function updateReplyRule(id: number, data: ReplyRuleUpdate): Promise<ReplyRule>
export async function deleteReplyRule(id: number): Promise<OperationResult>

// ——— 可绑定对象 ———

export async function fetchBindableItems(): Promise<BindableItem[]>
export async function fetchBindableRules(): Promise<ReplyRule[]>

// ——— 关联查询（惰性加载） ———

/** 获取规则已关联的商品列表 — 仅点击展开时请求 */
export async function fetchRuleItems(rid: number): Promise<BindableItem[]>

/** 获取商品已关联的规则列表 */
export async function fetchItemRules(gid: string): Promise<ReplyRule[]>

// ——— 关联操作（批量） ———

export async function bindRuleItems(rid: number, gids: string[]): Promise<OperationResult>
export async function bindItemRules(gid: string, rids: number[]): Promise<OperationResult>
export async function unbindRuleItems(rid: number, gids: string[]): Promise<OperationResult>
export async function unbindItemRules(gid: string, rids: number[]): Promise<OperationResult>
```

### 4.3 路径构造说明

后端不使用 RESTful 路径参数，改为 query parameter。前端函数内部拼接方式：

```ts
// 创建：POST /api/keywords/create
fetchApi("/api/keywords/create", { method: "POST", body: ... })

// 更新：PUT /api/keywords/update.rule?rid=123
fetchApi(`/api/keywords/update.rule?rid=${id}`, { method: "PUT", body: ... })

// 删除：DELETE /api/keywords/delete.rule?rid=123
fetchApi(`/api/keywords/delete.rule?rid=${id}`, { method: "DELETE" })

// 绑/解绑：POST /api/keywords/bind.rule.items?rid=123
fetchApi(`/api/keywords/bind.rule.items?rid=${id}`, { method: "POST", body: ... })
```

---

## 五、keyword 字段转换层

### 5.1 核心规则

| 方向 | 输入 | 输出 | 规则 |
|------|------|------|------|
| API → 展示 | `string[]` | `string` | `keywords.join("，")`（中文逗号） |
| 展示 → 编辑回显 | `string[]` | `string` | `keywords.join("，")`，用户可直接编辑 |
| 用户输入 → API | `string` | `string[]` | 按全角/半角逗号拆分为数组，trim 去空白，过滤空串 |

### 5.2 工具函数

```ts
/**
 * 将规则的关键词数组转为展示/编辑用的字符串。
 * 预定义类型：通过 keyType + keyword[0] 查字典取中文标签；
 * 自定义类型：全角逗号拼接。
 */
export function formatRuleKeyword(rule: ReplyRule, labels: Record<string, string>): string

/**
 * 将用户输入的逗号分隔字符串拆分为关键词数组。
 * 支持半角逗号 (,) 和全角逗号 (，)，trim 空白，过滤空串。
 */
export function parseKeywordInput(input: string): string[]
```

### 5.3 预定义关键词的展示

预定义关键词在 API 中存的是 `keyword: ["first_reply"]`（key 值），展示时用字典映射为 "首次回复" 标签。`formatRuleKeyword` 内部判断 `keyType === "predefined"` 时走查字典逻辑。

---

## 六、预定义关键词

### 6.1 获取方式

```ts
// 组件或 hook 中
const { data: predefinedLabels } = useQuery({
  queryKey: ["predefined-keywords"],
  queryFn: fetchPredefinedKeywords,
  staleTime: 5 * 60 * 1000,  // 预定义字典极少变动，5 分钟缓存
})
```

### 6.2 单一数据源，本地派生

API 返回一个 `Record<string, string>`（如 `{ "first_reply": "首次回复", ... }`），前端所有形式都从这个字典派生，不发起二次请求，不保留两套变量：

```ts
// API 返回 → prefLabels: Record<string, string>
const { data: prefLabels } = useQuery({
  queryKey: ["predefined-keywords"],
  queryFn: fetchPredefinedKeywords,
  staleTime: 5 * 60 * 1000,
})

// 下拉选项数组 — 从字典本地派生
const prefOptions = useMemo(
  () => Object.entries(prefLabels ?? {}).map(([value, label]) => ({ value, label })),
  [prefLabels]
)

// 值→标签映射 — 字典本身就是，直接使用
// prefLabels["first_reply"] → "首次回复"
```

**铁律**：`prefLabels` 是唯一数据源。`prefOptions` 由它派生，不允许两处各自调用 API 或各自保存一份。

### 6.3 删除的前端硬编码

`PREDEFINED_KEYWORDS` 数组和 `PREDEFINED_KEYWORD_LABELS` 映射从 `keywords.ts` 中移除。所有引用处改为通过 React Query 获取字典后本地派生。

---

## 七、关联数据的惰性加载策略

### 7.1 现状问题

规则列表响应内嵌 `linked_item_list` 和 `linked_group_list`，导致列表接口数据量大、加载慢。后端已移除内联，改为独立端点。

### 7.2 惰性加载设计

- **规则列表**：仅含 `itemsCount` 字段（关联数量），不展开具体商品
- **展开详情**：用户点击某行规则的"关联"按钮 → 触发 `fetchRuleItems(rid)` → 在展开区域渲染商品列表
- **缓存策略**：`queryKey: ["rule-items", rid]`，`staleTime: 30s`，避免重复点击重复请求

### 7.3 商品组功能移除

后端 `ReplyItemRule` 模型无商品组关联字段。前端全部移除：

- 删除 `LinkedGroupInfo` 类型
- 删除 `linkGroupToRule` / `unlinkGroupFromRule` 函数
- `RuleBindingPanel` 移除"关联商品组"折叠面板
- `RulesTab` 统计卡片移除 `linkedGroups` 指标
- `MobileRuleCard` 移除商品组标签

---

## 八、API 函数变更对照

| 旧函数 | 新函数 | 变更 |
|--------|--------|------|
| `listKeywordRules()` | `fetchReplyRules(params)` | 新增分页/筛选/排序参数 |
| `getKeywordRule(id)` | — | 删去，后端无此端点 |
| `createKeywordRule(d)` | `createReplyRule(d)` | body 新增 `gids`；字段名全改 |
| `updateKeywordRule(id, d)` | `updateReplyRule(id, d)` | 路径从 `/${id}` 变为 `?rid=${id}` |
| `deleteKeywordRule(id)` | `deleteReplyRule(id)` | 路径从 `/${id}` 变为 `/?rid=${id}` |
| `linkItemToRule(rid, iid)` | `bindRuleItems(rid, gids[])` | 单条→批量；POST 替代 PUT |
| `unlinkItemFromRule(rid, iid)` | `unbindRuleItems(rid, gids[])` | 单条→批量；POST 替代 DELETE |
| `linkGroupToRule(...)` | — | 删去 |
| `unlinkGroupFromRule(...)` | — | 删去 |
| `getRulesForItem(gid)` | `fetchItemRules(gid)` | 路径从 `items/${id}` 变为 `item.rules?gid=X` |
| `listRuleItems()` | `fetchBindableItems()` | 路径从 `/items` 变为 `bindable.items`（POST） |
| `listPredefinedKeywords()` | `fetchPredefinedKeywords()` | 返回类型从数组变为 `Record<string, string>` |
| `getDisplayKeyword(rule)` | `formatRuleKeyword(rule, labels)` | 新增 `labels` 参数（字典）；处理 string[] |

---

## 九、影响范围

### 9.1 源文件清单

| 文件 | 变更类型 | 关键变更 |
|------|----------|----------|
| `lib/api/keywords.ts` | **重写** | 全部类型+函数替换 |
| `hooks/useKeywords.ts` | 重构 | stats 字段更新（linked_items→itemsCount，移除 linkedGroups）；新增分页参数 |
| `components/items/parts/KeywordRuleForm.tsx` | 重构 | keyword:string→string[] 转换；字段名全改；预定义关键词从 API 获取 |
| `components/items/rules/RuleTable.tsx` | 重构 | 字段名；keyword 数组展示；关联数据惰性加载 |
| `components/items/RulesTab.tsx` | 重构 | stats 字段；移除 linkedGroups |
| `components/items/views/MobileRuleCard.tsx` | 重构 | 字段名；移除 group 标签 |
| `components/items/drawers/RuleItemsAllDrawer.tsx` | 重构 | 关联操作批量化；移除 group 逻辑；字段名 |
| `components/items/drawers/RulesItemsingleDrawer.tsx` | 重构 | 字段名；API 调用；预定义关键词 |
| `components/items/parts/RuleBindingPanel.tsx` | 重构 | 移除 group 面板；`RuleItem`→`BindableItem` |
| `components/items/parts/ItemCardPanel.tsx` | 重构 | `listRuleItems`→`fetchBindableItems` |

### 9.2 不变更范围

- 页面级布局结构（后续讨论）
- `components/items/parts/CollapsiblePanel.tsx`（共享组件，不受影响）
- `components/items/parts/PlaceholderPicker.tsx`
- `lib/api/items.ts`（商品 API 模块）

---

## 十、实施约束

1. **渐进式迁移**：先更新 API 模块（类型+函数），再逐个适配消费组件，确保 TypeScript 类型检查在每个 commit 通过
2. **keyword string[] 转换**：统一在 `formatRuleKeyword` / `parseKeywordInput` 两个工具函数中处理，禁止组件内手写 join/split 逻辑
3. **预定义关键词**：首次使用时通过 React Query 获取，不写在组件级 state 中
4. **关联惰性加载**：展开详情时触发 `useQuery({ queryKey: ["rule-items", rid], queryFn: () => fetchRuleItems(rid), enabled: false })`，通过 `refetch()` 触发
5. **删除的类型/函数**：确保全项目 grep 无残留引用后删除
