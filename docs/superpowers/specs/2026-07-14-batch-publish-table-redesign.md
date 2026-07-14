# Batch-Publish 三表格重构设计

> 日期：2026-07-14 | 状态：设计完成

## 一、DataTable 基础设施增强

### 1.1 滚动容器 + 表头冻结

当前问题：`DataTable` 已有 `stickyHeader` prop，但因外层没有 scroll container，`sticky` 定位无参照物，表头随页面滚动消失。

修复方案：
- DataTable 的数据区域包裹 `overflow-auto` 滚动容器
- `maxHeight` 通过 prop 传入，默认 `calc(100vh - 280px)`
- `stickyHeader` 默认值从 `false` 改为 `true`

```
┌──────────────────────────────────┐
│  表头行 (sticky top-0 z-10)       │  ← 冻结
├──────────────────────────────────┤
│  数据行 (内部独立滚动)             │
│  ...                             │
├──────────────────────────────────┤
│  分页器 (表格外部，不随内容滚动)    │
└──────────────────────────────────┘
```

### 1.2 onRowClick 支持

新增可选 prop：

```typescript
onRowClick?: (item: T, index: number) => void
```

数据行添加 `cursor-pointer`，点击整行触发回调。

**点击阻止规则**：
- 行内按钮（`<button>`）、链接（`<a>`）、输入框（`<input>`）、选择框（`<select>`）的 click 事件**必须** `stopPropagation`，不触发行点击
- checkbox 列单独处理——点击 checkbox 本身不触发行点击，但点击该列空白区域触发行点击
- 实现方式：行级 `onClick` + 子元素 `e.stopPropagation()` 白名单

### 1.3 Props 变更清单

| Prop | 变更 | 说明 |
|------|------|------|
| `stickyHeader` | 默认 `false` → `true` | 表头默认冻结 |
| `maxHeight` | 新增 `string` | 滚动容器最大高度 |
| `onRowClick` | 新增 `(item, index) => void` | 行点击回调 |

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

变化：gid+标题合并 1 列、操作列删除、对齐统一居中（仅商品信息列左对齐）。

### 2.3 逐列变更

| # | 列 | 对齐 | 变更 |
|---|-----|------|------|
| 1 | checkbox | left | 不变 |
| 2 | **商品信息**（合并 gid + 标题） | left | `gid`（上行，text-xs text-gray-400）+ `title`（下行，text-sm text-gray-800 line-clamp-1） |
| 3 | 价格 | center | `align: 'right'` → `'center'` |
| 4 | 想要斜率 | center | `align: 'right'` → `'center'` |
| 5 | 日均想要 | center | `align: 'right'` → `'center'` |
| 6 | 转化率 | center | `align: 'right'` → `'center'` |
| 7 | 商品状态 | center | `align: 'left'` → `'center'`，StatusBadge |
| 8 | 监控状态 | center | `align: 'left'` → `'center'`，StatusBadge |
| 9 | **绑定商机**（可点击） | center | 绑定商机名称（蓝色可点击）或"未绑定"（灰色可点击），`stopPropagation` 阻止触发行点击 |
| — | ~~操作~~ | — | **删除**，行点击打开 MonitorDetailPanel 替代 |

### 2.4 绑定商机列交互（stopPropagation）

- **未绑定**：灰色"未绑定" + 小图标，点击 → `BindOpportunityModal(单条)`
- **已绑定**：蓝色商机名称，点击 → `router.push('?tab=workbench&oid=xxx')`

### 2.5 Grid 列宽

```
32px 2fr 0.7fr 0.8fr 0.8fr 0.7fr 0.6fr 0.6fr 0.8fr
```

---

## 三、MonitorTab 布局重构

### 3.1 BatchActionBar 位置

**当前**：`sticky bottom-0`，选中后显示在页面底部，文案"已选 N 项"在左，按钮在右

**修复**：移到筛选栏与表格之间，作为静态元素（非 sticky），选中时出现、取消后消失：

```
MonitorFilterBar                        ← 固定
BatchActionBar (仅选中时出现)             ← 静态，在滚动容器外部上方
┌─ 滚动容器 (overflow-auto) ───────────┐
│  表头 (sticky top-0)                  │  ← 在容器内冻结
│  数据行 1                              │
│  数据行 2                              │  ← 仅数据行滚动
│  ...                                  │
└──────────────────────────────────────┘
Pagination                              ← 静态，在滚动容器外部下方
```

BatchActionBar 内部布局：`flex items-center gap-3`，全部左对齐：

```
已选 3 项  [取消选择]    [绑定商机] [取消监控] [删除]
```

不 `sticky`、不在滚动容器内——选中即出现，不随表格数据滚动。

### 3.2 行点击逻辑

- 点击行 → 打开 `MonitorDetailPanel`（侧边栏）
- 点击 checkbox → 切换选中状态（不触发侧边栏）
- 点击绑定商机列 → 绑定/跳转（不触发侧边栏）
- 点击状态 Badge → 不触发特殊行为，也不触发侧边栏（Badge 不可交互）

### 3.3 侧边栏增强

`MonitorDetailPanel` 顶部增加快捷操作区（绑定商机小按钮、取消监控），解决原"底部操作栏不需要时就完全不出现"的问题。

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
| 所属商机 | center | 蓝色可点击，跳转 workbench；无商机显示灰色"—" |
| 描述 | left | 唯一左对齐列，`line-clamp-2` |
| 价格 | center | `fmtPrice()` |
| 类目 | center | 纯文本 |
| 发布账号 | center | to_uid，纯文本 |
| 状态 | center | StatusBadge（green=已发布 / red=发布失败） |
| 发布商品 | center | to_gid，纯文本（发布成功才有值） |
| 发布时间 | center | `fmtDateTime()` |

### 4.4 行交互

- **无行点击** — MaterialTable 不使用 `onRowClick`
- **所属商机列可点击** — 点击商机名称 → `router.push('?tab=workbench&oid=xxx')`，`stopPropagation` 即可
- 其他列纯展示

### 4.5 Grid 列宽

```
1fr 2.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.7fr 0.8fr
```

---

## 五、实施顺序

1. **DataTable 增强** — `maxHeight` + `onRowClick` + stickyHeader 默认值
2. **MonitorTable 重构** — 合并列、居中、移除操作列、绑定商机可点击
3. **MonitorTab 重构** — BatchActionBar 上移、行点击逻辑绑定
4. **MaterialTable 重构** — 列顺序、默认筛选

---

## 六、决议记录

- [x] MonitorTable 商品状态 + 监控状态 → 保留两列独立，不合并
- [x] MonitorTable checkbox 列 → 保留
- [x] 发布记录默认筛选 → 前端默认 `published,publish_failed`，后端 API 不做改动
- [x] MaterialTable 无行点击，仅商机列可点击跳转
