# Batch-Publish 三表格重构设计

> 日期：2026-07-14 | 状态：设计完成（经三轮审核修正）

---

## 一、DataTable 基础设施增强

### 1.1 滚动容器（opt-in）

当前问题：`DataTable` 已有 `stickyHeader` prop，但因外层没有 scroll container，`sticky` 定位无参照物，表头随页面滚动消失。

修复方案：
- 仅当消费者显式传入 `maxHeight` 时，DataTable 才包裹 `overflow-auto` 滚动容器
- **不设默认值**——避免破坏现有 7 个消费者的布局（ItemsTab 已有自己的 `overflow-auto`，4 个 admin billing 页面为自然文档流滚动）
- `stickyHeader` 默认值保持 `false` 不变（与原始设计理由一致：无滚动容器的 sticky 会静默失效）

```tsx
// 仅当 maxHeight 传入时才渲染滚动容器
{maxHeight ? (
  <div className="overflow-auto" style={{ maxHeight }}>
    {/* header + data rows */}
  </div>
) : (
  <>
    {/* header + data rows (current behavior, zero regression) */}
  </>
)}
```

```
┌──────────────────────────────────┐
│  表头行 (sticky top-0 z-10)       │  ← maxHeight 模式下冻结
├──────────────────────────────────┤
│  数据行 (内部独立滚动)             │
│  ...                             │
└──────────────────────────────────┘
Pagination                          ← 表格外部，不随内容滚动
```

### 1.2 onRowClick 支持

新增可选 prop：

```typescript
onRowClick?: (item: T, index: number) => void
```

数据行添加 `cursor-pointer`（仅当 onRowClick 传入时），点击整行触发回调。

**点击阻止规则**（由各列 render 函数负责，非 DataTable 统一拦截）：
- `<button>`、`<a>`、`<input>`、`<select>` 的 click 事件**不留** `stopPropagation`——HTML 标准行为是 button/input 的 click 会自然冒泡，但 button 内部已处理 click，通常不会二次触发行点击。**每列的 render 函数自行决定是否需要 `e.stopPropagation()`**。
- `<span>`（包括 StatusBadge）的 click 自然冒泡到行 → 触发 onRowClick。这是**正确行为**：Badge 不可交互，点击 Badge 等同于点击行。
- checkbox 列：点击 `<input type="checkbox">` 本身不触发行点击（浏览器默认行为），点击该列 padding 区域触发行点击（自然冒泡）。

**键盘无障碍**：
- 当 onRowClick 传入时，行 `<div>` 添加 `tabIndex={0}` + `role="button"` + `onKeyDown`（Enter/Space 触发 onRowClick）
- 行内 `<button>` 保持原生 Tab 序

### 1.3 Props 变更清单

| Prop | 变更 | 说明 |
|------|------|------|
| `maxHeight` | 新增 `string?` | **opt-in**，传入时启用滚动容器 + sticky 表头生效。值必须是合法 CSS 长度（如 `calc(100vh - 320px)`） |
| `onRowClick` | 新增 `(item, index) => void?` | 可选行点击回调 |

---

## 二、MonitorTable 列重构

### 2.1 当前列状态（11 列）

```
checkbox | gid | 标题 | 价格 | 想要斜率 | 日均想要 | 转化率 | 商品状态 | 监控状态 | 绑定商机 | 操作
```

### 2.2 目标列状态（9 列）

```
checkbox | 商品信息(gid↑+标题↓) | 价格 | 想要斜率 | 日均想要 | 转化率 | 商品状态 | 监控状态 | 绑定商机
```

变化：gid+标题合并 1 列、操作列删除（行点击替代）、对齐统一居中（仅商品信息列左对齐）。

### 2.3 逐列变更

| # | 列 | 对齐 | 变更 |
|---|-----|------|------|
| 1 | checkbox | left | 不变，`<input type="checkbox">` |
| 2 | **商品信息**（合并 gid + 标题） | left | `gid`（上行，`text-xs text-gray-500`）+ `title`（下行，`text-sm text-gray-800 leading-snug line-clamp-1`） |
| 3 | 价格 | center | `fmtPrice()`，`text-sm tabular-nums` |
| 4 | 想要斜率 | center | `fmtGrowth()`，`text-sm tabular-nums` |
| 5 | 日均想要 | center | `fmtNumber()`，`text-sm tabular-nums` |
| 6 | 转化率 | center | `fmtPercent()`，`text-sm tabular-nums` |
| 7 | 商品状态 | center | StatusBadge |
| 8 | 监控状态 | center | StatusBadge |
| 9 | **绑定商机**（`<button>`） | center | 见 2.4 |
| — | ~~操作~~ | — | **删除**，行点击打开 MonitorDetailPanel 替代 |

### 2.4 绑定商机列交互

使用 `<button>` 元素（保证键盘可访问 + 自然阻止行点击冒泡），两种状态：

- **未绑定**：`<button>` + `text-gray-500` + 小链接图标，点击 → `setSingleBindGid(item.gid)` → 打开 `BindOpportunityModal`
- **已绑定**：`<button>` + `text-blue-600`，显示商机名称，点击 → `router.push('?tab=workbench&oid=xxx')`

### 2.5 单条绑定流程（新增）

当前 `BindOpportunityModal` 仅支持批量模式（`selectedCount` + `onConfirm(opportunityId)` 调 `bindMutation`）。需新增单条模式：

1. MonitorTab 新增状态 `singleBindGid: string | null`
2. `handleSingleBindConfirm` 调 `singleBindMutation({ gid: singleBindGid, opportunityId })`
3. `BindOpportunityModal` 新增 `mode: 'batch' | 'single'` prop，`single` 模式下 `selectedCount` 显示为 1
4. 单条绑定成功 → `setSingleBindGid(null)` + `setBindModalOpen(false)`，**不清除** batch `selectedGids`

已有基础设施：`useMonitorMutations` 已提供 `singleBindMutation` 和 `bindAndCreateMutation`，MonitorTab 未使用——直接接入。

### 2.6 Grid 列宽

```
32px 2fr 0.7fr 0.8fr 0.8fr 0.7fr 0.6fr 0.6fr 0.8fr
```

> 实施注意：`columns` 数组长度必须与 `gridTemplateColumns` 值的数量一致（9 列），否则 CSS Grid 静默渲染异常。

---

## 三、MonitorTab 布局重构

### 3.1 BatchActionBar 位置

**当前**：`BatchActionBar` 组件硬编码 `sticky bottom-0`，选中后显示在页面底部，文案"已选 N 项"在左，按钮在右

**修复**：给 `BatchActionBar` 新增 `sticky?: boolean` prop（默认 `true` 向后兼容）。MonitorTab 使用时传 `sticky={false}`，使其作为静态元素渲染在筛选栏与表格之间：

```
MonitorFilterBar
BatchActionBar (sticky={false}，仅 selectedCount > 0 时渲染)
┌─ 滚动容器 (maxHeight 传入) ────────┐
│  表头 (sticky top-0)                │
│  数据行                              │
└─────────────────────────────────────┘
Pagination
```

> **设计决策**：用户要求非 sticky + 顶部位置。此处**有意偏离** `frontend-layout.md` 原则 3（固定元素决策树），理由是：选中后操作栏遮挡列表视线且底部 UI 不符合用户心理模型（先看选中信息再操作）。用户偏好优先。

BatchActionBar 内部布局：`flex items-center gap-3`，全部左对齐：

```
已选 3 项  [取消选择]    [绑定商机] [取消监控] [删除]
```

### 3.2 行点击逻辑

- 点击行（非 button/input/select 区域）→ 打开 `MonitorDetailPanel`（侧边栏）
- 点击 checkbox → 切换选中状态（自然不触发行点击）
- 点击绑定商机 `<button>` → 绑定/跳转（button 内部处理，不触发行点击）
- 点击 StatusBadge（`<span>`）→ 自然冒泡到行 → 打开侧边栏（Badge 不可交互，这是正确行为）

### 3.3 MonitorDetailPanel 增强

侧边栏顶部增加快捷操作区，需新增 props：

```typescript
interface MonitorDetailPanelProps {
  item: MonitoredItem
  onClose: () => void
  // 新增
  onSingleBind?: (gid: string) => void     // 打开单条绑定 modal
  onDeleteItem?: (gid: string) => void     // 取消监控
}
```

操作区按钮："绑定商机"（仅未绑定时显示）、"取消监控"（红色，带 ConfirmDialog）。

### 3.4 空状态修复

`MonitorDetailPanel` 趋势数据为空时使用 `EmptyState` 组件替代当前纯文本"暂无趋势数据"。

---

## 四、MaterialTable（发布记录）重构

### 4.1 默认筛选：只显示发布结果

API `listMaterials` 返回全部 material（6 种 status），发布记录 Tab 默认只展示终端状态。

**修复**：`useMaterialsFilters` 的 `status` 默认值从 `''` 改为 `'published,publish_failed'`，首次进入只看到发布结果。筛选下拉仍保留"全部"选项供用户切换。

### 4.2 列顺序

**当前**：发布时间 → 描述 → 价格 → 类目 → 状态 → 所属商机 → 发布账号 → 发布商品

**目标**（按业务流水线排列：商机来源→素材内容→发布账号→发布结果→产物→时间）：

```
所属商机 | 描述 | 价格 | 类目 | 发布账号 | 状态 | 发布商品 | 发布时间
```

### 4.3 列对齐

| 列 | 对齐 | 说明 |
|----|------|------|
| 所属商机 | center | `<button>`，蓝色可点击跳转 workbench；无商机显示灰色"—"（纯文本，不可点击） |
| 描述 | left | 唯一左对齐列，`text-sm text-gray-800 leading-snug line-clamp-2` |
| 价格 | center | `fmtPrice()`，`tabular-nums` |
| 类目 | center | 纯文本 |
| 发布账号 | center | to_uid，纯文本 |
| 状态 | center | StatusBadge（green=已发布 / red=发布失败） |
| 发布商品 | center | to_gid，纯文本（发布成功才有值） |
| 发布时间 | center | `fmtDateTime()`，`tabular-nums` |

### 4.4 行交互

- **无 onRowClick** — MaterialTable 不传 `onRowClick`
- **所属商机列**：使用 `<button>`，点击 → `router.push('?tab=workbench&oid=xxx')`。`<button>` 天然不触发行点击。当前代码已是 `<button>`，无需 stopPropagation。
- 其他列纯展示

### 4.5 Grid 列宽

```
1fr 2.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.7fr 0.8fr
```

---

## 五、实施顺序

1. **DataTable 增强** — `maxHeight`（opt-in）+ `onRowClick`（含键盘无障碍）+ 行级 `tabIndex/role/onKeyDown`
2. **BatchActionBar** — 新增 `sticky` prop（默认 true）
3. **MonitorTable 重构** — 合并列、居中、移除操作列、绑定商机 `<button>`、单条绑定状态
4. **MonitorTab 重构** — `singleBindGid` 状态、BatchActionBar `sticky={false}`、行点击绑定、`BindOpportunityModal` mode 支持
5. **MonitorDetailPanel** — 新增 props + 快捷操作区 + 空状态 EmptyState
6. **MaterialTable 重构** — 列顺序、居中、默认筛选

---

## 六、决议记录

- [x] MonitorTable 商品状态 + 监控状态 → 保留两列独立
- [x] MonitorTable checkbox 列 → 保留
- [x] 发布记录默认筛选 → 前端默认 `published,publish_failed`
- [x] MaterialTable 无 onRowClick，仅商机 `<button>` 可点击
- [x] `maxHeight` → opt-in，无默认值，避免回归 7 个现有消费者
- [x] `stickyHeader` → 保持默认 `false`（原始设计理由仍成立）
- [x] stopPropagation → 由各列 render 函数自行决策，DataTable 不统一拦截
- [x] 绑定商机列 → 必须用 `<button>`（键盘无障碍）
- [x] StatusBadge 点击 → 自然冒泡到行（不特殊处理），触发 onRowClick
- [x] gid 颜色 → `text-gray-500`（辅助色），非 `text-gray-400`（禁用/占位）
- [x] 数值列 → 显式声明 `tabular-nums`
- [x] 标题/描述列 → 显式声明 `leading-snug`
- [x] BatchActionBar → 新增 `sticky` prop（默认 true，MonitorTab 传 false）
- [x] 单条绑定 → 新增 `singleBindGid` 状态 + `BindOpportunityModal` mode prop
- [x] MonitorDetailPanel → 新增 `onSingleBind`/`onDeleteItem` props + 空状态 EmptyState
- [x] 暗色模式：DataTable 已有 `dark:` 前缀，新增的列内元素跟随 DataTable 现有 dark 体系即可，不重复声明
- [x] 移动端：MonitorCard/MaterialCard 已有卡片降级，本次 PC 端表格列变化不改变移动端卡片结构
