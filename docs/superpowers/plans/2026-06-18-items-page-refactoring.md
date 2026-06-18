# 商品管理页代码结构整理方案

> 目标：合并相似组件、响应式统一 PC/移动端、文件夹分层管理、不改功能不增功能。
> 日期：2026-06-18

---

## 一、核心决策：哪些能合并，哪些不能

### 1.1 组件合并矩阵

| 桌面端 | 移动端 | 能否合并 | 方式 |
|--------|--------|----------|------|
| `ConfigModal`（居中弹窗） | `MobileConfigSheet`（底部抽屉） | ✅ **合并** | 统一改为抽屉，PC 右侧滑入、移动端底部滑入 |
| 桌面筛选栏（page.tsx 内联 JSX） | `MobileFilterBar`（独立卡片） | ✅ **合并** | 同一组件 `useIsMobile()` 切换布局 |
| `SendCodeCell`（表格单元格） | `SendCodeRow`（卡片行） | ✅ **合并** | 提取 hook + variant prop |
| ItemRow 内联 toggle ×3 | `IconToggle` 组件 | ✅ **合并** | 统一用 IconToggle |
| `ItemRow`（14 列表格行） | `MobileProductCard`（堆叠卡片） | ❌ **不合并** | DOM 结构完全不同，共享 parts/ 后各自都很薄 |

### 1.2 弹窗 → 抽屉统一改造

当前有 **3 个** 使用 `fixed inset-0 居中弹窗` 的组件，全部改为响应式抽屉：

| 组件 | 当前容器 | 改造后 |
|------|----------|--------|
| `ConfigModal` (page.tsx 内联) | `fixed inset-0` 居中卡片 | → `ConfigDrawer`（PC: Sheet 右侧, Mobile: BottomSheet 底部） |
| `ItemForm.tsx` | `fixed inset-0` 居中卡片 | → `ItemEditDrawer.tsx`（PC: Sheet 右侧, Mobile: BottomSheet 底部） |
| `ItemKeywordModal.tsx` | `fixed inset-0` 居中卡片 | → `KeywordDrawer.tsx`（PC: Sheet 右侧, Mobile: BottomSheet 底部） |

**统一改造的理由：**
- 三个组件都用完全相同的容器模式：`fixed inset-0 bg-black/50` + `max-w-2xl max-h-[90vh]` 居中卡片
- 移动端居中弹窗宽度受限，体验不如底部抽屉
- PC 端侧边抽屉比居中弹窗更符合编辑场景（不遮挡表格内容）
- 统一容器 = 统一交互模式，降低学习成本

### 1.3 占位符 PLACEHOLDERS — 3 份副本

| 位置 | 行号 |
|------|------|
| `page.tsx` ConfigModal 内 | 616-632 |
| `MobileConfigSheet.tsx` | 9-25 |
| `ItemKeywordModal.tsx` | 26-42 |

三份定义统一收敛到 `config.ts`。

> ⚠️ 注意：ItemKeywordModal 中第 7 个占位符 label 为 `"卡种/卡券方案"`（少了"名称"），另外两处为 `"卡种/卡券方案名称"`。合并时以 `page.tsx` 的版本为准（`"卡种/卡券方案名称"`）。

### 1.4 ConfigModal → ConfigDrawer 的具体方案

现有基础设施：

| 组件 | 定位 | 动画 |
|------|------|------|
| `components/ui/Sheet.tsx` | `fixed right-0 top-0 h-full` 右侧面板 | `translate-x` 滑入 |
| `components/ui/BottomSheet.tsx` | `fixed inset-x-0 bottom-0` 底部面板 | `translate-y` 滑入，支持手势下拉关闭 |

合并后的 `ConfigDrawer`：

```tsx
// drawers/ConfigDrawer.tsx
function ConfigDrawer({ open, item, field, onClose, onSave }) {
  const isMobile = useIsMobile()
  const [localValue, setLocalValue] = useState(item[field] || "")

  // 商品信息（内联渲染，不额外提取组件）
  const itemInfo = (
    <div className="bg-gray-50 rounded-lg p-3 text-sm">
      <div>{item.title || "无标题"} · ¥{item.price}</div>
      <div className="text-xs text-gray-500">ID: {item.gid} | 账号: {item.account.name}</div>
    </div>
  )

  const content = (
    <div className="p-4 space-y-4">
      {itemInfo}
      <PlaceholderPicker onInsert={(p) => setLocalValue(v => v + p)} draggable={!isMobile} />
      <textarea value={localValue} onChange={(e) => setLocalValue(e.target.value)} />
    </div>
  )

  const footer = (
    <div className="flex gap-2">
      <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 rounded-lg">取消</button>
      <button onClick={() => { onSave(item.gid, field, localValue); onClose() }}
        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg">保存</button>
    </div>
  )

  // PC: Sheet 右侧抽屉（footer 作为 children 追加，Sheet 无 footer prop）
  // Mobile: BottomSheet 底部抽屉（footer 作为 prop 传入）
  return isMobile
    ? <BottomSheet open={open} onClose={onClose} title={FIELD_LABELS[field]} subtitle={item.title} footer={footer}>{content}</BottomSheet>
    : <Sheet open={open} onClose={onClose} title={FIELD_LABELS[field]} width="480px">{content}{footer}</Sheet>
}
```

**效果**：一个文件替代 ConfigModal（113 行）+ MobileConfigSheet（130 行），约 80 行。

---

## 二、目标文件结构

```
components/items/
├── config.ts                    # 共享类型 + 常量 + 工具函数
│
├── parts/                       # 共享小组件（PC + 移动端通用）
│   ├── IconToggle.tsx           #   开关图标按钮
│   ├── SendCodeEditor.tsx       #   指令码编辑器（variant="cell"|"row"）
│   ├── useSendCodeEdit.ts       #   指令码编辑 hook
│   ├── PlaceholderPicker.tsx    #   占位符标签列表（被所有抽屉共用）
│   ├── SortIcon.tsx             #   排序方向指示器
│   └── RefreshButton.tsx        #   刷新按钮
│
├── views/                       # 平台专属渲染（DOM 结构差异太大不宜合并）
│   ├── ItemRow.tsx              #   桌面端 14 列表格行
│   └── MobileProductCard.tsx    #   移动端堆叠卡片
│
├── drawers/                     # 响应式抽屉（PC: Sheet 右侧, Mobile: BottomSheet 底部）
│   ├── ConfigDrawer.tsx         #   配置字段编辑（取代 ConfigModal + MobileConfigSheet）
│   ├── ItemEditDrawer.tsx       #   商品编辑表单（取代 ItemForm 的居中弹窗）
│   └── KeywordDrawer.tsx        #   关键词回复（取代 ItemKeywordModal 的居中弹窗）
│
└── FilterBar.tsx                # 响应式筛选栏
```

### 分层标准

| 层级 | 判断标准 | 文件数 |
|------|----------|--------|
| `config.ts` | 纯数据，零依赖 | 1 |
| `parts/` | 被 ≥1 个业务组件引用，纯展示或简单交互 | 6 |
| `views/` | 仅单平台使用，DOM 结构完全不同，不宜响应式合并 | 2 |
| `drawers/` | 响应式统一 PC+移动端的抽屉式编辑面板 | 3 |
| 根级 | 响应式但非抽屉的业务组件 | 1 |

### 为什么用 `drawers/` 文件夹

三个抽屉有相同的容器模式（`useIsMobile → Sheet | BottomSheet`），放在同一目录下：
- 新增编辑面板时知道放这里
- 容器逻辑一致，方便后续提取共享的 `useDrawerContainer` hook
- 与 `views/`（纯展示）泾渭分明

---

## 三、逐文件设计

### 3.1 `config.ts` — 共享配置（新建，~60 行）

聚合所有跨文件重复定义。从 `page.tsx`、`MobileProductCard.tsx`、`MobileConfigSheet.tsx` 三处各取一份，取并集。

```ts
export type ConfigField = "deliveryContent" | "receiptAfter" | "positiveReviewAfter" | "ai_reply_item_prompt" | "sendCode"

export const FIELD_LABELS: Record<ConfigField, string> = { ... }

export const PLACEHOLDERS = [ ... ]  // 15 个占位符

export function formatPublishTime(timestamp: string | null): string { ... }  // 统一含年份

export function statusLabel(status: number): { text: string; color: string } { ... }
```

### 3.2 `parts/` 目录（6 个新建文件）

| 文件 | 来源 | 行数 | 说明 |
|------|------|------|------|
| `IconToggle.tsx` | MobileProductCard.tsx:247-278 | ~35 | 纯图标开关按钮，ItemRow + MobileProductCard 共用 |
| `useSendCodeEdit.ts` | SendCodeCell + SendCodeRow 的公共逻辑 | ~45 | `useState(editing)` + `useRef(input)` + `handleSave` + `handleKeyDown` |
| `SendCodeEditor.tsx` | 合并 page.tsx:776-843 + MobileProductCard.tsx:317-386 | ~100 | `variant="cell"` 紧凑 / `variant="row"` 整行，都复用 `useSendCodeEdit` |
| `PlaceholderPicker.tsx` | ConfigDrawer 的占位符区 | ~40 | `onInsert` + 可选 `draggable`，原在 ConfigModal 和 MobileConfigSheet 各写一遍 |
| `SortIcon.tsx` | page.tsx:35-44 | ~15 | 纯展示：↕ / ↑ / ↓ |
| `RefreshButton.tsx` | page.tsx:46-99 | ~60 | 含异步 loading 态 |

### 3.3 `views/` 目录（1 新建 + 1 移入）

| 文件 | 来源 | 行数 | 说明 |
|------|------|------|------|
| `views/ItemRow.tsx` | page.tsx:846-1028 | ~120 | 表格行，改用 `parts/IconToggle`、`parts/SendCodeEditor`、`drawers/ConfigDrawer`。`ConfigCell`(page.tsx:750-773) 仅 ItemRow 使用，作为内部组件随附移入 |
| `views/MobileProductCard.tsx` | 从 `components/items/` 移入 | ~250 | 改用 `../config`、`../parts/*`，删除本地重复定义后大幅瘦身 |

ItemRow 和 MobileProductCard **不合并**的原因：
- ItemRow 是 14 列 CSS Grid 行，MobileProductCard 是堆叠 flex 卡片
- 强行合并会导致 `if (isMobile) { /* 完全不同的 return */ }` — 约 400 行
- 不如保持两个文件各自清晰，共享 parts/ 后各自都很薄

### 3.4 `FilterBar.tsx` — 响应式筛选栏（新建，~150 行）

合并 page.tsx 桌面端内联 JSX + MobileFilterBar.tsx。

```tsx
function FilterBar(props: FilterBarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileLayout {...props} />   // 折叠卡片式
  }
  return <DesktopLayout {...props} />    // 水平内联式
}
```

共用 props 接口（移动端专属的 stats/sort 在桌面端忽略）：

```ts
interface FilterBarProps {
  accounts: AccountName[]
  searchInput: { uid, title, gid }
  statusFilter: number | undefined
  onSearchChange, onStatusChange, onRefresh, onClear
  isRefreshing: boolean
  selectedUid?: string
  // 移动端专属（桌面端忽略）
  stats?: { total, onSale, offSale, sold }
  sortField?: string | null
  sortDirection?: "asc" | "desc" | null
  onSortChange?: (field) => void
}
```

### 3.5 `drawers/ConfigDrawer.tsx` — 配置字段编辑抽屉（新建，~80 行）

合并 ConfigModal（page.tsx:635-747）+ MobileConfigSheet（131 行）。

- PC 端：`<Sheet>` 右侧面板滑入，width="480px"，footer 直接追加在 children 后
- 移动端：`<BottomSheet>` 底部滑入，footer 通过 prop 传入，支持手势下拉关闭
- 共享内容：PlaceholderPicker + textarea + 保存/取消按钮
- PC 端占位符支持拖拽插入，移动端仅点击
- 商品信息内联渲染，不额外提取组件

### 3.6 `drawers/ItemEditDrawer.tsx` — 商品编辑抽屉（改造 ItemForm.tsx，~280 行）

将 ItemForm 的 `fixed inset-0` 居中弹窗改为响应式抽屉。**逻辑完全不变**，仅换容器。

改造点：
- 去掉 `<div className="fixed inset-0 bg-black/50 flex items-center justify-center">` 外层
- 改为 `isMobile ? <BottomSheet> : <Sheet>`
- 表单内容（rhf、zod 校验、折叠区）原样保留
- 保存/取消按钮移入 footer 区

### 3.7 `drawers/KeywordDrawer.tsx` — 关键词回复抽屉（改造 ItemKeywordModal.tsx，~500 行）

将 ItemKeywordModal 的居中弹窗改为响应式抽屉。改动：

| 改动项 | 说明 |
|--------|------|
| 容器 | `fixed inset-0` → `isMobile ? BottomSheet : Sheet`，width="560px"（内容较多） |
| PLACEHOLDERS | 删除本地定义，改用 `../config` 导入（消除第 3 份副本） |
| 商品选择器 | 原来是嵌套 `<div className="fixed inset-0 ... z-[60]">` 子弹窗 → 改为抽屉内联列表（无需额外 overlay，抽屉高度足够） |
| 表单逻辑 | rhf、zod、CRUD 操作原样保留 |

### 3.8 `page.tsx` — 精简后的主页面（~250 行）

提取/合并后 page.tsx 仅保留：

```
ItemsPageContent (主组件)
  ├── TabBar + 描述
  ├── FilterBar (响应式)
  ├── 桌面端表格 (views/ItemRow)
  ├── 移动端卡片列表 (views/MobileProductCard)
  ├── drawers/ConfigDrawer (取代 ConfigModal + MobileConfigSheet)
  ├── drawers/ItemEditDrawer (取代 ItemForm 弹窗)
  ├── drawers/KeywordDrawer (取代 ItemKeywordModal 弹窗)
  └── 规则 tab (不变)

ItemsPage (Suspense 包装导出)
```

---

## 四、依赖关系图

```
config.ts （零依赖，纯数据）
  ├─→ parts/PlaceholderPicker.tsx
  ├─→ drawers/ConfigDrawer.tsx
  ├─→ drawers/ItemEditDrawer.tsx
  ├─→ drawers/KeywordDrawer.tsx
  ├─→ views/ItemRow.tsx
  └─→ views/MobileProductCard.tsx

parts/ （6 个共享零件）
  IconToggle.tsx          ← 零外部依赖
  useSendCodeEdit.ts      ← 零外部依赖
  SendCodeEditor.tsx      ← useSendCodeEdit
  PlaceholderPicker.tsx   ← config.ts
  SortIcon.tsx            ← 零外部依赖
  RefreshButton.tsx       ← refreshItems, LoadingSpinner

views/ （2 个平台专属视图）
  ItemRow.tsx             ← IconToggle, SendCodeEditor, config.ts, drawers/ConfigDrawer
  MobileProductCard.tsx   ← IconToggle, SendCodeEditor, config.ts, drawers/ConfigDrawer

drawers/ （3 个响应式抽屉）
  ConfigDrawer.tsx        ← PlaceholderPicker, Sheet, BottomSheet, useIsMobile, config.ts
  ItemEditDrawer.tsx      ← Sheet, BottomSheet, useIsMobile, config.ts, react-hook-form, zod
  KeywordDrawer.tsx       ← PlaceholderPicker, Sheet, BottomSheet, useIsMobile, config.ts, keywords API

根级/
  FilterBar.tsx           ← RefreshButton, useIsMobile. 内部含 SortChip（移动端排序标签，MobileFilterBar 私有组件保持内联）

page.tsx                  ← FilterBar, ItemRow, MobileProductCard,
                            ConfigDrawer, ItemEditDrawer, KeywordDrawer, config.ts
```

---

## 五、执行步骤

| 步骤 | 操作 | 文件 | 风险 |
|------|------|------|------|
| 1 | 新建 | `config.ts` | 无 |
| 2 | 新建 | `parts/` 下 6 个文件 | 无 |
| 3 | 新建 | `drawers/ConfigDrawer.tsx`（合并 ConfigModal + MobileConfigSheet） | 无 |
| 4 | 新建 | `drawers/ItemEditDrawer.tsx`（改造自 ItemForm，容器换抽屉） | 无 |
| 5 | 新建 | `drawers/KeywordDrawer.tsx`（改造自 ItemKeywordModal，容器换抽屉，去掉 PLACEHOLDERS 副本） | 无 |
| 6 | 新建 | `FilterBar.tsx`（合并桌面筛选栏 + MobileFilterBar） | 无 |
| 7 | 新建 | `views/ItemRow.tsx`（改用 parts/*） | 无 |
| 8 | 修改 | `views/MobileProductCard.tsx` → 移动文件，改用 config + parts | 低 |
| 9 | 修改 | `page.tsx` → 全量 import 替换，删内联组件 | 中 |
| 10 | 删除 | `MobileFilterBar.tsx` → 已合并入 FilterBar | — |
| 11 | 删除 | `MobileConfigSheet.tsx` → 已合并入 ConfigDrawer | — |
| 12 | 删除 | `ItemForm.tsx` → 已改造为 ItemEditDrawer | — |
| 13 | 删除 | `ItemKeywordModal.tsx` → 已改造为 KeywordDrawer | — |

每步完成后执行 `npx tsc --noEmit`。

---

## 六、效果对比

| 指标 | 整理前 | 整理后 |
|------|--------|--------|
| page.tsx 行数 | 1036 | ~250 |
| components/items/ 文件数 | 5 个平铺 | 1 个根级 + `parts/`(6) + `views/`(2) + `drawers/`(3) |
| ConfigField 定义 | 3 处 | 1 处 |
| PLACEHOLDERS 定义 | **3 处**（page.tsx, MobileConfigSheet, ItemKeywordModal） | 1 处 |
| formatPublishTime 定义 | 2 处格式不同 | 1 处统一 |
| SendCode 编辑逻辑 | 2 份独立实现 | 1 个 hook + 1 个组件 |
| 居中弹窗容器 | 3 个各自实现 | 0 个，统一为响应式抽屉 |
| Toggle 按钮 | 手写 4 处 | 统一 IconToggle |
| 配置编辑器 | ConfigModal + MobileConfigSheet | 1 个 ConfigDrawer |
| 筛选栏 | 桌面内联 JSX + MobileFilterBar | 1 个 FilterBar |
| 商品编辑 | ItemForm 弹窗 | ItemEditDrawer 抽屉 |
| 关键词配置 | ItemKeywordModal 弹窗 | KeywordDrawer 抽屉 |
| 新增配置字段需改几个文件 | 3~4 个 | 1 个（config.ts） |

---

## 七、实现细节

### 7.1 Sheet 与 BottomSheet 的 footer 不对称

`Sheet` 没有 `footer` prop，`BottomSheet` 有。处理方式：

```tsx
// PC 端：footer 作为 children 追加到 Sheet 末尾
<Sheet open={...} title={...}>
  {content}
  <div className="border-t px-5 py-3">{footer}</div>
</Sheet>

// 移动端：footer 作为 prop 传入 BottomSheet
<BottomSheet open={...} title={...} footer={footer}>
  {content}
</BottomSheet>
```

### 7.2 MobileProductCard 内部组件处理

| 内部组件 | 行号 | 处理方式 |
|----------|------|----------|
| `IconToggle` | 247-278 | 提取到 `parts/IconToggle.tsx` |
| `SendCodeRow` | 317-386 | 合并到 `parts/SendCodeEditor.tsx` |
| `ConfigRow` | 281-314 | **保留**为 MobileProductCard 内部组件（仅它使用） |

### 7.3 ItemRow 中被注释的 auto_reply 开关

page.tsx:891-903 有一段被注释掉的 `auto_reply` toggle（`MessageCircle` 图标）。重构时**删除**注释代码，对应的列头也删除。

### 7.4 KeywordDrawer 商品选择器交互

当前 ItemKeywordModal 的商品选择器是嵌套弹窗（`z-[60]`），改为抽屉后使用内联折叠面板：

- 搜索框默认隐藏，点击"+ 插入商品卡片"按钮展开
- 展开后显示搜索框 + 可滚动列表
- 点击商品后自动插入并收起
- 不需要独立的 overlay（抽屉已提供上下文）

---

## 八、约束与注意事项

1. **不改功能** — 所有 useState、react-hook-form、zod 校验、CRUD 逻辑原样保留
2. **不新增功能** — 不添加 props/特性/行为
3. **严禁动态路由**
4. **每步验证编译** — `npx tsc --noEmit`
5. **容器替换不影响逻辑** — 3 个弹窗改抽屉只换外层容器，内部内容完全不变
6. **KeywordDrawer 的商品选择器** — 从嵌套弹窗改为抽屉内联列表，保持搜索过滤功能
7. **不碰规则 tab** — RuleTable / RuleForm 保持不变
8. **formatPublishTime 统一含年份** — 信息不丢失
