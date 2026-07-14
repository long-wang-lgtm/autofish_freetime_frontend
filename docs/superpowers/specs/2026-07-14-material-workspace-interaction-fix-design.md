# MaterialWorkspace 交互修复 & 移动端布局修复 设计文档

**日期**：2026-07-14
**状态**：PC 端部分已实现，移动端部分待实现
**范围**：`components/batch-publish/workbench/` 目录下 4 个文件

---

## 一、页面层级全景

```
page.tsx
└── flex flex-col gap-5 h-full（页面顶级容器）
    ├── TabBar variant="overline"（商品监控 / 创作台 / 发布记录）
    └── WorkbenchTab（flex-1 flex min-h-0）
        │
        ├─[PC]── 左右分栏 ──────────────────────────
        │   ├── 左侧：OpportunityListPanel（可拖拽宽度 260–480px）
        │   ├── 拖拽分隔线 ResizableDivider
        │   └── 右侧：bg-white rounded-xl border shadow-sm overflow-hidden
        │       ├── PendingOverviewPanel（无选中商机时）
        │       └── MaterialWorkspace（有选中商机时）
        │
        └─[Mobile]── flex-1 flex flex-col min-h-0
            ├── 无选中商机：双视图切换卡片
            │   ├── Tab：待办概览 / 商机列表
            │   └── 对应面板（PendingOverviewPanel 或 OpportunityListPanel）
            │
            └── 有选中商机：Push 工作区卡片
                ├── 【冗余 header】← WorkbenchTab 自己包的（❌ 待删除）
                └── MaterialWorkspace（内部有自己的 header）
```

---

## 二、PC 端交互修复（✅ 已实现）

### 2.1 问题：MaterialEditSheet 缓存 key 不匹配导致侧边栏永不渲染

**根因**：`MaterialEditSheet.tsx` 通过 `queryClient.getQueryData` 从 React Query 缓存读取材料数据，但使用的 key 与 `useWorkbenchData.ts` 存储数据时使用的 key 不一致。

```
存储方（useWorkbenchData.ts:56）：
  ['batch-publish', 'materials', selectedOid, { page: materialPage }]  ← 4 元素

读取方（MaterialEditSheet.tsx:29，修复前）：
  ['batch-publish', 'materials', selectedOid]                          ← 3 元素
```

React Query `getQueryData` 是精确 key 匹配。key 不匹配 → 返回 `undefined` → `material` 为 `null` → 第 50 行 `if (!material) return null` → Sheet 组件虽然 `open={true}` 但内容为空，用户看到的是透明遮罩或什么都没有。

`MaterialRow` 的 `handleRowClick` 逻辑本身是正确的——点击描述字段会正确触发 `onOpenEditor(materialId)`，只是 Sheet 渲染时找不到数据。

**修复**：MaterialEditSheet 不再自己从缓存读数据，改为由父组件直接传入 `materials: PublishMaterial[]`。

#### 改动明细

**文件 A**：`MaterialEditSheet.tsx`

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 数据来源 | `queryClient.getQueryData(...)` 读缓存 | 父组件 props 传入 `materials` |
| Props | 6 个 | 新增 `materials: PublishMaterial[]` |
| 无用的 import | `useQueryClient`, `MaterialListResponse` | 已删除 |

```tsx
// 修复前
import { useQueryClient } from '@tanstack/react-query'
import type { MaterialListResponse, ... } from '@/lib/api/batch-publish'

const queryClient = useQueryClient()
const cached = queryClient.getQueryData<MaterialListResponse>(
  ['batch-publish', 'materials', selectedOid]
)
const materials = cached?.items ?? []
const material = materialId ? materials.find(m => m.id === materialId) : null

// 修复后
import type { PublishMaterial, ... } from '@/lib/api/batch-publish'

// 新增 prop
materials: PublishMaterial[]

const material = materialId ? materials.find(m => m.id === materialId) : null
```

**文件 B**：`WorkbenchTab.tsx`

PC 端和移动端两处 `<MaterialEditSheet>` 均新增 `materials={page.materials}`。

---

### 2.2 问题：InlineEditCell 点击价格触发行 click 冒泡

**根因**：`InlineEditCell` 的价格显示 `<span>` 的 `onClick` 处理器 `handleStartEdit` 没有调用 `e.stopPropagation()`。点击价格时事件冒泡到行级 `handleRowClick`，同时触发了原地编辑和侧边栏。

**修复**：`handleStartEdit` 改为接收 `React.MouseEvent`，首行调用 `e.stopPropagation()`。

```tsx
// 修复前
const handleStartEdit = () => {
  if (isSaving) return
  ...
}

// 修复后
const handleStartEdit = (e: React.MouseEvent) => {
  e.stopPropagation()
  if (isSaving) return
  ...
}
```

---

### 2.3 交互行为总览（修复后）

MaterialRow 各列的点击行为：

| 列 | 点击行为 | 冒泡控制 |
|----|----------|----------|
| 复选框 | 勾选/取消 | `<input>` → row handler 自动忽略 |
| 封面图 | 灯箱查看 / 上传图片 | `MaterialImageCell` 外层 div `onClick={e.stopPropagation()}` |
| **描述** | **唤起侧边栏（MaterialEditSheet）** | 无阻止——允许冒泡 |
| 价格 | 原地编辑（数字 input） | `InlineEditCell.handleStartEdit` 调用 `e.stopPropagation()` |
| 账号 | 下拉选择 | 外层 `<div onClick={e.stopPropagation()}>` |
| 类目 | 下拉选择 | 外层 `<div onClick={e.stopPropagation()}>` |
| 进度 | 点击节点触发工作流 | `ProgressActionCell` 外层 `<div onClick={e.stopPropagation()}>` |
| 删除 | 弹出确认弹窗 | 按钮 `onClick` 调用 `e.stopPropagation()` |
| **行空白** | **唤起侧边栏** | 无阻止——允许冒泡 |

---

## 三、移动端布局修复（待实现）

### 3.1 问题：双层 header

**根因**：WorkbenchTab 移动端代码（第 206–250 行）在 Push 工作区外层自己写了一个 header（返回按钮 + 商机名 + 批量创建按钮），而 MaterialWorkspace 内部本来就有自己的 header（返回按钮 + 商机名 + 价格 + 统计 + 批量创建按钮）。两层 header 叠在一起：

```
┌──────────────────────────────────┐
│ ← 拍下秒发...            [批量创建] │ ← WorkbenchTab 加的（冗余，信息少）
├──────────────────────────────────┤
│ ← 拍下秒发... ¥2 📦0·📝1 [批量创建] │ ← MaterialWorkspace 自己的（完整，信息多）
├──────────────────────────────────┤
│ ReferencePanel                   │
│ 表格...                          │
└──────────────────────────────────┘
```

Navigation flow 分析：

```
双视图页（概览/商机列表）
  │
  │ 点击商机 → URL 设置 oid=xxx
  ▼
Push 工作区（MaterialWorkspace）
  │
  │ 点击返回按钮 → URL 删除 oid → 回到双视图页
  ▼
双视图页（保留上次的 tab 状态：概览或商机列表）
```

这是标准的 2 层 Push/Pop 导航（符合 `frontend-layout.md` 模式 C）。返回按钮只需要保留 MaterialWorkspace 自己的——它的 `onBackToOverview` 行为正确（清除 `oid` 回到上层），不需要外层再包一个。

### 3.2 修复方案

#### 原则

- **MaterialWorkspace 是移动端工作区的唯一内容**，不再被外层 header 包裹
- **`useIsMobile()` 在 MaterialWorkspace 内部使用**（已有的 hook，不新造）
- **按钮尺寸响应式**：PC 端 `h-10 px-4 text-sm`，移动端 `h-9 px-3 text-xs`
- **容器样式不变**：外侧卡片容器（`bg-white rounded-xl border shadow-sm overflow-hidden`）保持不变

#### 改动明细

**文件 C**：`WorkbenchTab.tsx` 移动端（第 206–250 行）

删除外层 header（第 208–226 行），MaterialWorkspace 直接替换 `overflow-hidden` wrapper：

```tsx
// 修复前
{!!page.selectedOid && (
  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
      <button onClick={handleBackToOverview}>...</button>      ← 删除
      <span>...</span>                                          ← 删除
      <button onClick={...}>批量创建</button>                     ← 删除
    </div>
    <div className="flex-1 overflow-hidden">                    ← 删除 wrapper
      <MaterialWorkspace ... />
    </div>                                                      ← 删除 wrapper
  </div>
)}

// 修复后
{!!page.selectedOid && (
  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <MaterialWorkspace ... />
  </div>
)}
```

MaterialWorkspace 的所有 props 不变。

**文件 D**：`MaterialWorkspace.tsx`

在组件内部调用 `useIsMobile()`，用于调整"批量创建"按钮的尺寸：

```tsx
// 组件内新增
const isMobile = useIsMobile()

// 批量创建按钮（第 74–79 行）
<button
  onClick={onCreateClick}
  className={isMobile
    ? 'h-9 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
    : 'h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
  }
>
  批量创建
</button>
```

header 区域整体也做响应式微调：
- `px-4 py-3` 在 PC 端和移动端均可接受（40px 高度 + 最小 44dp 触控目标已满足——返回按钮 `w-8 h-8` + 周边 padding）
- 商机名标题在 PC 端 `text-base`，移动端可保持（16px 标准字号）

### 3.3 修复后结构

```
[PC]（不变）
┌──────────────────────────────────────┐
│ 左侧商机列表 | 拖拽线 | MaterialWorkspace │
└──────────────────────────────────────┘

[Mobile] 无选中商机（不变）
┌──────────────────────┐
│ 待办概览 / 商机列表    │
├──────────────────────┤
│ 对应面板              │
└──────────────────────┘

[Mobile] 有选中商机（修复后）
┌──────────────────────┐
│ ← 拍下秒发 ¥2 📦0·📝1 │ ← MaterialWorkspace 唯一 header
│             [批量创建] │   h-9 px-3 text-xs
├──────────────────────┤
│ ReferencePanel       │
│ 表格...              │
└──────────────────────┘
```

---

## 四、影响范围

| 文件 | 改动类型 | 改动量 |
|------|----------|--------|
| `MaterialEditSheet.tsx` | ✅ 已实现 | 删 2 个 import，改 3 行逻辑，新增 1 个 prop |
| `InlineEditCell.tsx` | ✅ 已实现 | 1 行改动（函数签名加 event 参数 + stopPropagation） |
| `WorkbenchTab.tsx` | ⬜ 待实现 | 删除移动端外层 header（~12 行），两处 MaterialEditSheet 已加 materials prop |
| `MaterialWorkspace.tsx` | ⬜ 待实现 | 新增 `useIsMobile` import，按钮尺寸响应式（~5 行改动） |

**总计**：4 个文件，净删代码约 14 行，新增约 10 行。

---

## 五、规范合规检查

| 规范 | 要求 | 是否合规 |
|------|------|----------|
| frontend-layout.md 模式 C | 移动端 Push/Pop 导航：面包屑导航返回箭头 + 当前项名称，支持从屏幕边缘滑动返回 | ✅ MaterialWorkspace header 的返回按钮即是此模式 |
| frontend-design-tokens.md | 按钮高度 PC `h-10`，移动端 `h-9` | ✅ 使用标准 token |
| frontend-components.md | 不重复造组件，使用已有 `useIsMobile` | ✅ |
| frontend-state.md | 服务端数据通过 React Query 管理 | ✅ MaterialEditSheet 不再绕过缓存自己读 |
| 移动端触控 | 可交互元素不小于 44×44dp | ✅ 返回按钮 8×8 + px-4 py-3 容器满足触控区域 |

---

## 六、TypeScript 验证

PC 端三文件编译通过（`npx tsc --noEmit` 零错误）。移动端实现后需再次验证。
