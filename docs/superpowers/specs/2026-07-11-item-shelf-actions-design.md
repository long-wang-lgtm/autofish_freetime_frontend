# 商品上架 / 下架操作 — 设计文档

> 日期：2026-07-11
> 范围：商品管理页（`/dashboard/items`）配置管理 Tab，桌面端表格 + 移动端卡片

## 一、背景与目标

商品列表当前只能查看和配置商品，无法直接控制商品的上下架状态。本功能在商品行内新增「上架 / 下架」操作按钮，让用户在列表内直接触发闲鱼侧的上下架动作。

**目标**：

- 商品行内提供上架、下架入口，按当前商品状态控制可用性
- 操作前弹出确认框（上架附带单规格提示）
- 操作成功后列表状态即时反映，无需手动刷新
- 桌面端 + 移动端均支持

## 二、已确认的决策

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | 成功后如何反映新状态 | **即时更新 + 后台重拉**：用后端返回的商品对象 `setQueriesData` 就地更新该行（status 立即变），同时 `invalidateQueries(["items"])` 后台校正筛选与统计 |
| 2 | 账号未启用（`account.status !== 1`）时 | **预先禁用 + 提示**：按钮置灰禁用，tooltip「账号未启用，无法操作」，避免无效请求 |
| 3 | 下架的视觉/确认语义 | **中性确认**：下架按钮与确认框用中性样式（非危险红色），下架属常规运营动作 |
| 4 | 实现结构 | **抽独立组件** `ShelfActions`，桌面/移动端共用，`variant` 区分呈现 |
| 5 | 桌面 vs 移动端按钮呈现 | 桌面：两个按钮都显示（禁用不可用者）；移动：只显示与当前状态相关的那一个按钮 |

## 三、后端接口（已就绪）

两个端点均为 `POST`，`gid` + `uid` 通过 **query 参数**传递，返回**更新后的商品对象**（`ItemSettingSchema`，含最新 `status`）。

- `POST /api/items/shelves?gid={gid}&uid={uid}` — 上架
- `POST /api/items/offline?gid={gid}&uid={uid}` — 下架

后端前置校验：

- 商品不存在 → 404
- 非本人商品 → 403「您没有权限操作该商品」
- `account.status !== 1` → 403「账号未启用，请切换未正常状态」

前端据此在 UI 层预先拦截账号未启用的情况（决策 #2），其余错误通过 toast 展示后端 `detail`。

## 四、状态与可用性规则

商品状态取值（与 `components/items/config.ts` 的 `statusLabel` 一致）：

| `item.status` | 含义 |
|---------------|------|
| `0` | 在售 |
| `-2` | 已下架 |
| `1` | 已售出 |
| 其它 | 未知 |

可用性判断收敛到 `lib/api/items.ts` 中的纯函数 `getShelfState(item)`：

```ts
export interface ShelfState {
  canShelve: boolean            // 上架是否可点
  canOffline: boolean           // 下架是否可点
  shelveDisabledReason?: string // 上架禁用时的 tooltip
  offlineDisabledReason?: string// 下架禁用时的 tooltip
}
```

判定优先级（自上而下短路）：

1. **账号未启用**（`item.account.status !== 1`）→ `canShelve=false, canOffline=false`，两者 reason 均为「账号未启用，无法操作」。
2. 否则按 `item.status`：
   - `0` 在售 → `canOffline=true`，`canShelve=false`（reason「商品在售中」）
   - `-2` 已下架 → `canShelve=true`，`canOffline=false`（reason「商品已下架」）
   - `1` 已售出 → `canShelve=true`，`canOffline=false`（reason「商品已售出」）
   - 其它未知 → 都禁用，reason「商品状态未知」

> 说明：`account.status === 1` 表示账号已启用，与后端 `!= 1` 判据同源。

## 五、`ShelfActions` 组件契约

新建 `components/items/parts/ShelfActions.tsx`（命名导出）。

```ts
interface ShelfActionsProps {
  item: Item
  variant: 'desktop' | 'mobile'
  pending: boolean                 // 该行是否正在请求（锁定按钮 + 确认框 loading）
  onShelve: (item: Item) => void   // 确认上架
  onOffline: (item: Item) => void  // 确认下架
}
```

**内部职责**：

- 调用 `getShelfState(item)` 决定两个按钮的禁用态与 tooltip
- 用本地 `useState` 管理确认框：`confirm: 'shelve' | 'offline' | null`
- 点击按钮 → 打开对应确认框；点击确认 → 调用 `onShelve/onOffline` 并关闭确认框
- 复用现有 `components/ui/ConfirmDialog.tsx`（`variant="default"`）
- `pending` 为 true 时按钮禁用、`ConfirmDialog` 显示 loading

**`variant` 差异**：

- `desktop`：并排渲染「上架」「下架」两个文字按钮，不可用者置灰禁用
- `mobile`：只渲染与当前状态相关的**单个**按钮
  - `item.status === 0` → 渲染「下架」按钮
  - `item.status ∈ {-2, 1}` → 渲染「上架」按钮
  - 未知状态 → 不渲染任何按钮
  - 账号未启用时该按钮仍渲染，但为禁用态 + 提示（因为按钮由 `item.status` 决定，可用性由 `getShelfState` 决定）

## 六、Mutation 与缓存更新

在 `hooks/useItemMutations.ts` 新增统一的 `shelfMutation`：

```ts
mutationFn: ({ gid, uid, action }: { gid: string; uid: string; action: 'shelves' | 'offline' })
  => action === 'shelves' ? shelvesItem(gid, uid) : offlineItem(gid, uid)
```

- **onSuccess(updated)**：
  1. `queryClient.setQueriesData({ queryKey: ["items"] }, ...)` — 遍历所有 `["items", ...]` 缓存（形状 `ItemListResponse`），把 `items` 数组中 `gid` 匹配项**合并**为返回对象（merge 而非整体替换，避免 `ItemSettingSchema` 字段不全丢失原字段）
  2. `queryClient.invalidateQueries({ queryKey: ["items"] })` — 后台重拉，校正状态筛选结果与统计
  3. toast「上架成功 / 下架成功」
- **onError(e)**：toast 后端 `detail`（如「账号未启用，请切换未正常状态」）

**pending 行判定**：`shelfMutation.isPending && shelfMutation.variables?.gid === item.gid`。由父层（`ItemsTab` / `MobileProductCard` 调用处）计算后作为 `pending` prop 传入，`ShelfActions` 本身保持无状态耦合。

`api/items.ts` 新增：

```ts
export async function shelvesItem(gid: string, uid: string): Promise<Item>
export async function offlineItem(gid: string, uid: string): Promise<Item>
```

（POST，query 传 `gid`/`uid`，返回 `Item`。）

## 七、数据流

```
useItemMutations  →  shelfMutation (+ handleShelve/handleOffline)
      │
useItemsPage      →  透传 shelfMutation
      │
items/page.tsx    →  <ItemsTab shelfMutation=... />
      │
ItemsTab
  ├─ 桌面列定义第99行  →  <ShelfActions variant="desktop" pending={isPending(item)} onShelve onOffline />
  └─ 移动列表          →  <MobileProductCard onShelve onOffline shelfPending={isPending(item)} />
                              └─ <ShelfActions variant="mobile" ... />
```

`onShelve/onOffline` 最终调用 `shelfMutation.mutate({ gid: item.gid, uid: item.account.uid, action })`。

## 八、确认框文案

| 操作 | 标题 | 内容 | 确认按钮 | variant |
|------|------|------|----------|---------|
| 上架 | 确认上架 | 当前功能仅支持单规格商品，且可能有未发现的异常，确认上架吗？ | 上架 | default |
| 下架 | 确认下架 | 多行：① 下架后该商品将停止售卖　② 再次上架时仅支持单规格商品　③ 确认下架吗？ | 下架 | default |

## 九、视觉规范

**桌面端**（`ItemsTab.tsx` 第99行，商品信息副行 `gid | 账号名 |` 之后）：

- 两个 `text-xs` 文字按钮「上架」「下架」
- 可用态：上架 `text-blue-600 hover:underline`，下架 `text-gray-600 hover:underline`
- 禁用态：`text-gray-300 cursor-not-allowed`，`title` 显示禁用原因
- pending 态：按钮禁用，避免重复点击

**移动端**（`MobileProductCard.tsx` 信息栏 105–118 行区域内，状态徽章附近）：

- 单个按钮，`text-xs`，pill 样式（`px-2.5 py-1 rounded-full`），信息行内紧凑控件（点击区通过 padding 适度扩展，不强行撑到 44px 以免破坏信息栏密度）
- 可用态：上架 `text-blue-600 bg-blue-50`，下架 `text-gray-600 bg-gray-100`
- 禁用态：`text-gray-300`，`title` / 长按提示禁用原因

所有颜色遵循 `frontend-colors.md`：上架用品牌蓝表示可点操作，下架用中性灰；均非危险红色。日间/夜间成对定义 `dark:` 前缀。

## 十、边界与兜底

- **未知 status**：两个按钮都禁用（兜底），不误导操作
- **账号未启用**：UI 预先禁用，即便绕过也会被后端 403 拦截，前端 toast
- **重复点击**：pending 期间锁定按钮 + 确认框 loading
- **返回对象字段不全**：`setQueriesData` 用 merge 而非替换，保留原 `Item` 字段
- **状态筛选一致性**：例如筛选「在售」时下架某商品，后台 `invalidateQueries` 重拉后该行会从列表消失

## 十一、手动验证要点

（项目无自动化测试基建，采用手动验证清单）

1. 在售商品：上架禁用、下架可点；下架成功后 status 变为已下架，按钮可用性翻转
2. 已下架 / 已售出商品：下架禁用、上架可点；上架成功后 status 变为在售
3. 账号未启用的商品：两个按钮均禁用，hover 显示「账号未启用」提示
4. 上架确认框展示单规格提示文案；下架确认框为中性样式
5. 请求进行中按钮锁定，不可重复点击
6. 失败时（如后端 403）toast 显示后端 detail
7. 移动端只显示与当前状态相关的单个按钮，点击区适中可正常点按
8. 当前按状态筛选时，操作后该行随筛选条件更新（重拉后消失/保留）
9. 桌面端与移动端行为一致

## 十二、非目标（YAGNI）

- 批量上架 / 下架（本次仅单商品）
- 多规格商品的规格级上下架（后端暂不支持，仅文案提示）
- 上架数量自定义（由后端按 `isPro` 决定 quantity）
- 定时/自动上下架（已有 `auto_restock` 开关，不在本次范围）
