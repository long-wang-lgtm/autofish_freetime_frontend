# UI 组件目录重组 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `components/ui/` 的 20 个组件按交互模式分类重组为 5 个子目录 + 2 个根级文件，统一 PascalCase 命名，删除重复组件，移出业务组件，新增 Modal 居中弹窗。

**Architecture:** 按"组件响应什么状态"分为 overlay（浮层）、feedback（反馈）、data（数据展示）、navigation（导航）、chart（图表）五个子目录。每个目录提供 barrel index.ts 聚合导出。overlay 内部三分为 Modal（居中弹窗，遮罩不关闭）、ConfirmDialog（确认弹窗，遮罩可关闭）、Sheet（边缘抽屉，遮罩可关闭）。

**Tech Stack:** React + TypeScript + Tailwind CSS v3，文件操作用 `git mv` 保留历史。

**Source spec:** `docs/superpowers/specs/2026-07-13-ui-components-reorganization-design.md`

---

## 文件结构总览

```
components/ui/
├── overlay/
│   ├── Modal.tsx               ← 🆕 Phase 6
│   ├── ConfirmDialog.tsx       ← 从根级移入
│   ├── Sheet.tsx               ← 从根级移入，增加 subtitle prop
│   └── index.ts
├── feedback/
│   ├── EmptyState.tsx
│   ├── ErrorBanner.tsx
│   ├── ErrorBoundary.tsx       ← 重命名自 error-boundary.tsx
│   ├── LoadingSpinner.tsx      ← 重命名自 loading-spinner.tsx
│   ├── StatusBadge.tsx
│   └── index.ts
├── data/
│   ├── DataTable.tsx
│   ├── EditableCell.tsx
│   ├── Pagination.tsx          ← 重命名自 pagination.tsx
│   ├── SearchToolbar.tsx
│   └── index.ts
├── navigation/
│   └── TabBar/                 ← 重命名自 Tab/
│       └── index.tsx
├── chart/                      ← 重命名自 echart/
│   ├── useChart.ts
│   ├── AccountPieChart.tsx
│   ├── ImStatusChart.tsx
│   └── index.ts
├── Toaster.tsx                 ← 重命名自 toaster.tsx
└── TextEditor.tsx              ← 重命名自 text-editor.tsx
```

**移出的文件：**
- `ui/proxy-item.tsx` → `components/admin/ProxyItem.tsx`
- `ui/qr-code-display.tsx` → `components/accounts/QrCodeDisplay.tsx`

**删除的文件：**
- `ui/slide-panel.tsx`（功能合并到 Sheet）

---

### Task 1: 创建目标目录结构

**Files:**
- Create: `components/ui/overlay/` (directory)
- Create: `components/ui/feedback/` (directory)
- Create: `components/ui/data/` (directory)
- Create: `components/ui/navigation/` (directory)

- [ ] **Step 1: 创建 4 个分类目录**

```bash
mkdir -p components/ui/overlay components/ui/feedback components/ui/data components/ui/navigation
```

- [ ] **Step 2: 验证目录已创建**

```bash
ls -d components/ui/overlay components/ui/feedback components/ui/data components/ui/navigation
```

Expected: 4 directory paths printed.

- [ ] **Step 3: Commit**

```bash
git add components/ui/overlay/ components/ui/feedback/ components/ui/data/ components/ui/navigation/
git commit -m "chore: create ui component category directories

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Phase 1 — kebab-case 文件重命名为 PascalCase（根级文件）

**Files:**
- Rename: `components/ui/toaster.tsx` → `components/ui/Toaster.tsx`
- Rename: `components/ui/text-editor.tsx` → `components/ui/TextEditor.tsx`
- Modify: `app/layout.tsx:6`
- Modify: `components/items/drawers/ItemEditDrawer.tsx:12`
- Modify: `components/items/drawers/ConfigDrawer.tsx:6`
- Modify: `components/items/parts/KeywordRuleForm.tsx:9`

- [ ] **Step 1: 重命名 toaster.tsx → Toaster.tsx**

```bash
git mv components/ui/toaster.tsx components/ui/Toaster.tsx
```

- [ ] **Step 2: 更新 app/layout.tsx 中的 import**

`app/layout.tsx` 第 6 行：
```
- import { Toaster } from '@/components/ui/toaster'
+ import { Toaster } from '@/components/ui/Toaster'
```

- [ ] **Step 3: 全局更新 Toaster 组件的 import 路径（useToast 也被这里导出）**

在以下文件中将 `@/components/ui/toaster` 替换为 `@/components/ui/Toaster`：

| 文件 | 行号 |
|------|------|
| `components/items/drawers/ItemEditDrawer.tsx` | 9 |
| `components/items/drawers/RulesItemsingleDrawer.tsx` | 16 |
| `components/items/RulesTab.tsx` | 11 |
| `components/items/drawers/RuleItemsAllDrawer.tsx` | 17 |
| `hooks/useItemMutations.ts` | 6 |
| `components/accounts/ReviewTemplateSheet.tsx` | 6 |
| `app/dashboard/accounts/page.tsx` | 14 |
| `components/accounts/LinkManagement.tsx` | 6 |
| `components/accounts/AccountTable.tsx` | 7 |
| `components/accounts/AccountCard.tsx` | 7 |

使用 sed 批量替换：

```bash
# 全局替换 import 路径（精确匹配 toaster 模块引用）
grep -rl "from '@/components/ui/toaster'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/toaster'|from '@/components/ui/Toaster'|g"
```

- [ ] **Step 4: 重命名 text-editor.tsx → TextEditor.tsx**

```bash
git mv components/ui/text-editor.tsx components/ui/TextEditor.tsx
```

- [ ] **Step 5: 更新 TextEditor 的 import 路径**

```bash
grep -rl "from '@/components/ui/text-editor'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/text-editor'|from '@/components/ui/TextEditor'|g"
```

涉及文件：
- `components/items/drawers/ItemEditDrawer.tsx`
- `components/items/drawers/ConfigDrawer.tsx`
- `components/items/parts/KeywordRuleForm.tsx`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename toaster, text-editor to PascalCase

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Phase 1 — error-boundary 重命名并移入 feedback/

**Files:**
- Rename: `components/ui/error-boundary.tsx` → `components/ui/feedback/ErrorBoundary.tsx`
- Modify: `components/layout/DashboardLayout.tsx:7`
- Modify: `components/layout/AdminLayout.tsx:7`

- [ ] **Step 1: 移动并重命名**

```bash
git mv components/ui/error-boundary.tsx components/ui/feedback/ErrorBoundary.tsx
```

- [ ] **Step 2: 更新 import 路径**

`components/layout/DashboardLayout.tsx` 第 7 行：
```
- import { ErrorBoundary } from '@/components/ui/error-boundary'
+ import { ErrorBoundary } from '@/components/ui/feedback/ErrorBoundary'
```

`components/layout/AdminLayout.tsx` 第 7 行：
```
- import { ErrorBoundary } from '@/components/ui/error-boundary'
+ import { ErrorBoundary } from '@/components/ui/feedback/ErrorBoundary'
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename error-boundary → ErrorBoundary, move to feedback/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Phase 1 — loading-spinner 重命名并移入 feedback/

**Files:**
- Rename: `components/ui/loading-spinner.tsx` → `components/ui/feedback/LoadingSpinner.tsx`
- Modify: 30+ 处 import 引用

- [ ] **Step 1: 移动并重命名**

```bash
git mv components/ui/loading-spinner.tsx components/ui/feedback/LoadingSpinner.tsx
```

- [ ] **Step 2: 更新 LoadingSpinner 内部的跨引用（DataTable 已用，等 DataTable 迁移时再处理）**

LoadingSpinner 组件本身没有对其他 ui 组件的引用，无需修改组件内部代码。

- [ ] **Step 3: 全局替换所有 import 路径**

```bash
grep -rl "from '@/components/ui/loading-spinner'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/loading-spinner'|from '@/components/ui/feedback/LoadingSpinner'|g"
```

涉及完整的 30 处文件列表（来自项目全局搜索）：
1. `components/auth/AuthProvider.tsx`
2. `components/items/ItemsTab.tsx`
3. `components/items/drawers/ItemEditDrawer.tsx`
4. `components/items/drawers/RulesItemsingleDrawer.tsx`
5. `components/items/RulesTab.tsx`
6. `components/items/drawers/RuleItemsAllDrawer.tsx`
7. `components/items/parts/ItemsFilterBarMobile.tsx`
8. `components/layout/AdminLayout.tsx`
9. `components/items/parts/ItemsFilterBarDesktop.tsx`
10. `components/items/rules/RuleTable.tsx`
11. `components/items/parts/KeywordRuleForm.tsx`
12. `components/ui/DataTable.tsx`
13. `components/ui/qr-code-display.tsx`（后续将被移出）
14. `components/ui/proxy-item.tsx`（后续将被移出）
15. `app/page.tsx`
16. `app/dashboard/accounts/page.tsx`
17. `app/admin/users/page.tsx`
18. `app/admin/users/MembershipActionSheet.tsx`
19. `components/layout/DashboardLayout.tsx`
20. `components/accounts/AccountTable.tsx`
21. `app/admin/proxy/page.tsx`
22. `components/accounts/AccountCard.tsx`
23. `components/selection/keyword/KeywordCollectionTab.tsx`
24. `components/selection/product/ProductMonitorTab.tsx`
25. `app/admin/billing/page.tsx`
26. `app/admin/accounts/page.tsx`
27. `components/selection/merchant/MerchantMonitorTab.tsx`
28. `components/accounts/LinkLoginModal.tsx`
29. `components/accounts/LinkManagement.tsx`
30. `components/selection/product/ProductFocusCard.tsx`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename loading-spinner → LoadingSpinner, move to feedback/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Phase 1 — pagination 重命名并移入 data/

**Files:**
- Rename: `components/ui/pagination.tsx` → `components/ui/data/Pagination.tsx`
- Modify: 6 处 import 引用

- [ ] **Step 1: 移动并重命名**

```bash
git mv components/ui/pagination.tsx components/ui/data/Pagination.tsx
```

- [ ] **Step 2: 全局替换 import 路径**

```bash
grep -rl "from '@/components/ui/pagination'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/pagination'|from '@/components/ui/data/Pagination'|g"
```

涉及文件：
1. `components/items/ItemsTab.tsx`
2. `app/admin/users/page.tsx`
3. `app/admin/proxy/page.tsx`
4. `app/admin/page.tsx`
5. `app/admin/billing/OrderHistoryTab.tsx`
6. `app/admin/accounts/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename pagination → Pagination, move to data/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Phase 2 — feedback/ 目录：移动 PascalCase 组件 + 创建 barrel

**Files:**
- Move: `components/ui/EmptyState.tsx` → `components/ui/feedback/EmptyState.tsx`
- Move: `components/ui/ErrorBanner.tsx` → `components/ui/feedback/ErrorBanner.tsx`
- Move: `components/ui/StatusBadge.tsx` → `components/ui/feedback/StatusBadge.tsx`
- Create: `components/ui/feedback/index.ts`
- Modify: 所有引用 EmptyState / ErrorBanner / StatusBadge 的文件

- [ ] **Step 1: 移动 3 个 PascalCase 组件到 feedback/**

```bash
git mv components/ui/EmptyState.tsx components/ui/feedback/EmptyState.tsx
git mv components/ui/ErrorBanner.tsx components/ui/feedback/ErrorBanner.tsx
git mv components/ui/StatusBadge.tsx components/ui/feedback/StatusBadge.tsx
```

- [ ] **Step 2: 更新 EmptyState import 路径**

```bash
grep -rl "from '@/components/ui/EmptyState'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/EmptyState'|from '@/components/ui/feedback/EmptyState'|g"
```

涉及文件：
1. `components/items/ItemsTab.tsx`
2. `components/ui/DataTable.tsx`（需后续更新为 barrel 路径）
3. `components/selection/product/ProductMonitorTab.tsx`
4. `components/selection/product/ProductFocusCard.tsx`

- [ ] **Step 3: 更新 ErrorBanner import 路径**

```bash
grep -rl "from '@/components/ui/ErrorBanner'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/ErrorBanner'|from '@/components/ui/feedback/ErrorBanner'|g"
```

涉及文件：
1. `components/items/ItemsTab.tsx`
2. `components/ui/DataTable.tsx`（需后续更新为 barrel 路径）

- [ ] **Step 4: 更新 StatusBadge import 路径**

```bash
grep -rl "from '@/components/ui/StatusBadge'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/StatusBadge'|from '@/components/ui/feedback/StatusBadge'|g"
```

涉及文件：
1. `app/admin/billing/OrderHistoryTab.tsx`

- [ ] **Step 5: 更新 DataTable 内部 import（它引用了 feedback 中的组件）**

`components/ui/data/DataTable.tsx`（注意：DataTable 此时还在根级，将在 Task 7 移动）中的 import 已在 Step 2 和 Step 3 的全局替换中被更新。

- [ ] **Step 6: 创建 feedback/index.ts barrel**

```typescript
export { EmptyState } from './EmptyState'
export { ErrorBanner } from './ErrorBanner'
export { ErrorBoundary } from './ErrorBoundary'
export { LoadingSpinner } from './LoadingSpinner'
export { StatusBadge } from './StatusBadge'
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move EmptyState, ErrorBanner, StatusBadge to feedback/ with barrel

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Phase 2 — data/ 目录：移动 PascalCase 组件 + 创建 barrel

**Files:**
- Move: `components/ui/DataTable.tsx` → `components/ui/data/DataTable.tsx`
- Move: `components/ui/EditableCell.tsx` → `components/ui/data/EditableCell.tsx`
- Move: `components/ui/SearchToolbar.tsx` → `components/ui/data/SearchToolbar.tsx`
- Create: `components/ui/data/index.ts`
- Modify: 所有引用 DataTable / EditableCell / SearchToolbar 的文件

- [ ] **Step 1: 移动 3 个组件到 data/**

```bash
git mv components/ui/DataTable.tsx components/ui/data/DataTable.tsx
git mv components/ui/EditableCell.tsx components/ui/data/EditableCell.tsx
git mv components/ui/SearchToolbar.tsx components/ui/data/SearchToolbar.tsx
```

- [ ] **Step 2: 更新 DataTable 内部 import 为 barrel 路径**

`components/ui/data/DataTable.tsx` 第 4-6 行：
```
- import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
- import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
- import { EmptyState } from '@/components/ui/feedback/EmptyState'
+ import { LoadingSpinner, ErrorBanner, EmptyState } from '@/components/ui/feedback'
```

- [ ] **Step 3: 更新 DataTable import 路径（外部引用）**

```bash
grep -rl "from '@/components/ui/DataTable'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/DataTable'|from '@/components/ui/data/DataTable'|g"
```

涉及文件：
1. `components/items/ItemsTab.tsx`
2. `app/admin/billing/StonePricingTab.tsx`
3. `app/admin/billing/FeaturePricingTab.tsx`
4. `app/admin/billing/OrderHistoryTab.tsx`
5. `app/admin/billing/MembershipPlanTab.tsx`

- [ ] **Step 4: 更新 EditableCell import 路径**

```bash
grep -rl "from '@/components/ui/EditableCell'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/EditableCell'|from '@/components/ui/data/EditableCell'|g"
```

涉及文件：
1. `app/admin/billing/StonePricingTab.tsx`
2. `app/admin/billing/FeaturePricingTab.tsx`
3. `app/admin/billing/MembershipPlanTab.tsx`

- [ ] **Step 5: SearchToolbar 无外部引用，跳过 import 更新**

- [ ] **Step 6: 创建 data/index.ts barrel**

```typescript
export { DataTable } from './DataTable'
export type { DataTableColumn, DataTableProps } from './DataTable'
export { EditableCell } from './EditableCell'
export type { EditableCellProps } from './EditableCell'
export { Pagination } from './Pagination'
export { SearchToolbar } from './SearchToolbar'
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move DataTable, EditableCell, SearchToolbar to data/ with barrel

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Phase 2 — overlay/ 目录：移动 Sheet + ConfirmDialog + 创建 barrel

**Files:**
- Move: `components/ui/Sheet.tsx` → `components/ui/overlay/Sheet.tsx`
- Move: `components/ui/ConfirmDialog.tsx` → `components/ui/overlay/ConfirmDialog.tsx`
- Create: `components/ui/overlay/index.ts`
- Modify: 所有引用 Sheet / ConfirmDialog 的文件

- [ ] **Step 1: 移动 2 个组件到 overlay/**

```bash
git mv components/ui/Sheet.tsx components/ui/overlay/Sheet.tsx
git mv components/ui/ConfirmDialog.tsx components/ui/overlay/ConfirmDialog.tsx
```

- [ ] **Step 2: 全局替换 Sheet import 路径**

```bash
grep -rl "from '@/components/ui/Sheet'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/Sheet'|from '@/components/ui/overlay/Sheet'|g"
```

涉及文件：
1. `components/items/drawers/ItemEditDrawer.tsx`
2. `components/items/drawers/RulesItemsingleDrawer.tsx`
3. `components/items/drawers/ConfigDrawer.tsx`
4. `components/items/drawers/RuleItemsAllDrawer.tsx`
5. `components/settings/NotificationTab.tsx`
6. `components/settings/AIConfigTab.tsx`
7. `components/selection/shared/SettingsDrawer.tsx`
8. `components/accounts/ReviewTemplateSheet.tsx`
9. `components/publish/EditorDrawer.tsx`
10. `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 3: 全局替换 ConfirmDialog import 路径**

```bash
grep -rl "from '@/components/ui/ConfirmDialog'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/ConfirmDialog'|from '@/components/ui/overlay/ConfirmDialog'|g"
```

涉及文件：
1. `components/items/parts/ShelfActions.tsx`
2. `app/admin/billing/StonePricingTab.tsx`
3. `app/admin/billing/FeaturePricingTab.tsx`

- [ ] **Step 4: 创建 overlay/index.ts barrel**

```typescript
export { Sheet, BottomSheet } from './Sheet'
export { ConfirmDialog } from './ConfirmDialog'
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move Sheet, ConfirmDialog to overlay/ with barrel

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Phase 4 (提前) — echart/ → chart/ 目录重命名

> 注：Phase 4 的目录重命名与 Phase 2 的文件移动不冲突，可以在 Phase 2 完成后立即执行。

**Files:**
- Rename: `components/ui/echart/` → `components/ui/chart/`
- Create: `components/ui/chart/index.ts`
- Modify: 3 处 import 引用

- [ ] **Step 1: 重命名目录**

```bash
git mv components/ui/echart components/ui/chart
```

- [ ] **Step 2: 更新 chart 目录内部的 import**

`components/ui/chart/AccountPieChart.tsx` 和 `components/ui/chart/ImStatusChart.tsx` 内部可能引用 `./useChart`，检查并确认相对路径不受影响。

- [ ] **Step 3: 更新外部 import 路径**

```bash
grep -rl "from '@/components/ui/echart/" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/echart/|from '@/components/ui/chart/|g"
```

涉及文件：
1. `app/admin/page.tsx`（3 处 import：useChart, AccountPieChart, ImStatusChart）
2. `app/admin/accounts/page.tsx`（2 处 import：AccountPieChart, ImStatusChart）

- [ ] **Step 4: 创建 chart/index.ts barrel**

```typescript
export { useChart } from './useChart'
export { AccountPieChart } from './AccountPieChart'
export { ImStatusChart } from './ImStatusChart'
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename echart/ → chart/, add barrel export

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Phase 4 — Tab/ → navigation/TabBar/ 目录重命名

**Files:**
- Rename: `components/ui/Tab/` → `components/ui/navigation/TabBar/`
- Modify: 6 处 import 引用

- [ ] **Step 1: 移动并重命名目录**

```bash
git mv components/ui/Tab components/ui/navigation/TabBar
```

- [ ] **Step 2: 更新所有 import 路径**

```bash
grep -rl "from '@/components/ui/Tab'" --include='*.tsx' --include='*.ts' . | xargs sed -i "s|from '@/components/ui/Tab'|from '@/components/ui/navigation/TabBar'|g"
```

涉及文件：
1. `app/dashboard/accounts/page.tsx`
2. `app/dashboard/items/page.tsx`
3. `app/dashboard/settings/page.tsx`
4. `app/dashboard/publish/page.tsx`
5. `app/dashboard/selection/page.tsx`
6. `app/admin/billing/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move Tab/ → navigation/TabBar/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: 构建验证 — 检查 Phase 1-4 无编译错误

- [ ] **Step 1: 运行 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -50
```

Expected: 无编译错误。如果有 "Cannot find module" 错误，说明有 import 路径遗漏，需修复后再继续。

- [ ] **Step 2: 运行 Next.js 构建**

```bash
cd frontend && npm run build 2>&1 | tail -30
```

Expected: 构建成功，无错误。

- [ ] **Step 3: 如有编译错误，逐条修复后重新验证**

---

### Task 12: Phase 3 — Sheet 增加 subtitle prop（合并 slide-panel 功能）

**Files:**
- Modify: `components/ui/overlay/Sheet.tsx`
- 注：slide-panel.tsx 尚在根级，将在 Task 13 替换引用后删除

- [ ] **Step 1: 读取当前 Sheet.tsx 确认内容**

```bash
cat components/ui/overlay/Sheet.tsx | head -30
```

- [ ] **Step 2: 给 Sheet 增加 subtitle prop**

`components/ui/overlay/Sheet.tsx`，`SheetProps` 接口增加一行：

```diff
 interface SheetProps {
   open: boolean
   onClose: () => void
   title?: string
+  subtitle?: string
   width?: string
   children: ReactNode
   closeOnBackdrop?: boolean
 }
```

- [ ] **Step 3: 在 Sheet 的标题栏中渲染 subtitle**

在 Sheet 组件的标题区域，title 下方添加 subtitle 渲染。找到 Sheet 中现有的标题栏代码（第 49-61 行），修改标题部分：

```diff
 {/* 标题栏 */}
 {title && (
   <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
-    <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
+    <div className="flex-1 min-w-0">
+      <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
+      {subtitle && (
+        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
+      )}
+    </div>
     <button
       onClick={onClose}
       className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
     >
```

- [ ] **Step 4: 给 BottomSheet 也增加 subtitle prop**

BottomSheet 已有 `subtitle` prop（第 76 行），不需修改。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add subtitle prop to Sheet for slide-panel compatibility

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Phase 3 — 替换 SlidePanel 为 Sheet + 删除 slide-panel.tsx

**Files:**
- Modify: `app/admin/proxy/page.tsx` — 4 处 SlidePanel 替换
- Modify: `app/admin/users/page.tsx` — 1 处 SlidePanel 替换
- Modify: `app/admin/users/MembershipActionSheet.tsx` — 1 处 SlidePanel 替换
- Modify: `app/admin/accounts/page.tsx` — 1 处 SlidePanel 替换
- Delete: `components/ui/slide-panel.tsx`

- [ ] **Step 1: 替换 app/admin/proxy/page.tsx 中的 SlidePanel**

该文件有 4 处 SlidePanel 使用。首先更新 import（第 6 行）：

```
- import { SlidePanel } from "@/components/ui/slide-panel"
+ import { Sheet } from "@/components/ui/overlay/Sheet"
```

然后替换所有 4 处 `<SlidePanel ...>` 为 `<Sheet ...>`。SlidePanel 和 Sheet 的 Props 完全兼容（open/onClose/title/subtitle/width/children），直接替换标签名即可。SlidePanel 的 `width="w-96"` 默认值在 Sheet 中是 `"500px"`，对于原来依赖默认值的调用，需显式传入 `width="w-96"`。

逐一检查和替换：
1. "添加代理"（第 54 行）— 无 width，无 subtitle，直接改 `<SlidePanel` → `<Sheet`
2. "编辑代理"（第 134 行）— 有 subtitle，直接改 `<SlidePanel` → `<Sheet`
3. "绑定店铺"（第 188 行）— 有 subtitle，直接改 `<SlidePanel` → `<Sheet`
4. 还有一处需全文搜索确认

- [ ] **Step 2: 替换 app/admin/users/page.tsx 中的 SlidePanel**

import 行（第 7 行）：
```
- import { SlidePanel } from "@/components/ui/slide-panel"
+ import { Sheet } from "@/components/ui/overlay/Sheet"
```

使用处（第 122 行）：`<SlidePanel open={open} onClose={onClose} title="代理管理" subtitle={username}>` → `<Sheet open={open} onClose={onClose} title="代理管理" subtitle={username}>`

- [ ] **Step 3: 替换 app/admin/users/MembershipActionSheet.tsx 中的 SlidePanel**

import 行（第 4 行）：
```
- import { SlidePanel } from "@/components/ui/slide-panel"
+ import { Sheet } from "@/components/ui/overlay/Sheet"
```

使用处（第 295 行）：`<SlidePanel open={open} onClose={onClose} title={title}>` → `<Sheet open={open} onClose={onClose} title={title}>`

- [ ] **Step 4: 替换 app/admin/accounts/page.tsx 中的 SlidePanel**

import 行（第 6 行）：
```
- import { SlidePanel } from "@/components/ui/slide-panel"
+ import { Sheet } from "@/components/ui/overlay/Sheet"
```

使用处（第 118 行）：`<SlidePanel open={open} onClose={onClose} title="选择代理" subtitle={accountName}>` → `<Sheet open={open} onClose={onClose} title="选择代理" subtitle={accountName}>`

- [ ] **Step 5: 删除 slide-panel.tsx**

```bash
git rm components/ui/slide-panel.tsx
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: replace SlidePanel with Sheet, delete slide-panel.tsx

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: 构建验证 — Phase 3 完成检查

- [ ] **Step 1: 运行 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -50
```

Expected: 无编译错误。

- [ ] **Step 2: 确认 slide-panel.tsx 已删除**

```bash
test -f components/ui/slide-panel.tsx && echo "STILL EXISTS" || echo "DELETED ✅"
```

Expected: `DELETED ✅`

---

### Task 15: Phase 5 — 移出 proxy-item.tsx 到 components/admin/

**Files:**
- Move: `components/ui/proxy-item.tsx` → `components/admin/ProxyItem.tsx`
- Modify: `app/admin/accounts/page.tsx:11`
- Modify: `app/admin/users/page.tsx:8`

- [ ] **Step 1: 移动文件**

```bash
git mv components/ui/proxy-item.tsx components/admin/ProxyItem.tsx
```

- [ ] **Step 2: 更新 ProxyItem 内部的 import（LoadingSpinner 路径）**

`components/admin/ProxyItem.tsx` 第 4 行：
```
- import { LoadingSpinner } from "@/components/ui/loading-spinner"
+ import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
```

- [ ] **Step 3: 更新 app/admin/accounts/page.tsx 中的 import**

第 11 行：
```
- import { ProxyItem } from "@/components/ui/proxy-item"
+ import { ProxyItem } from "@/components/admin/ProxyItem"
```

- [ ] **Step 4: 更新 app/admin/users/page.tsx 中的 import**

第 8 行：
```
- import { ProxyItem } from "@/components/ui/proxy-item"
+ import { ProxyItem } from "@/components/admin/ProxyItem"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move ProxyItem from ui/ to components/admin/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: Phase 5 — 移出 qr-code-display.tsx 到 components/accounts/

**Files:**
- Move: `components/ui/qr-code-display.tsx` → `components/accounts/QrCodeDisplay.tsx`
- Modify: `components/accounts/QrLoginModal.tsx:5`
- Modify: `app/login/link/page.tsx:6`

- [ ] **Step 1: 移动文件**

```bash
git mv components/ui/qr-code-display.tsx components/accounts/QrCodeDisplay.tsx
```

- [ ] **Step 2: 更新 QrCodeDisplay 内部的 import（LoadingSpinner 路径）**

`components/accounts/QrCodeDisplay.tsx` 第 3 行：
```
- import { LoadingSpinner } from "@/components/ui/loading-spinner"
+ import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
```

- [ ] **Step 3: 更新 components/accounts/QrLoginModal.tsx 中的 import**

第 5 行：
```
- import { QrCodeDisplay } from "@/components/ui/qr-code-display"
+ import { QrCodeDisplay } from "@/components/accounts/QrCodeDisplay"
```

- [ ] **Step 4: 更新 app/login/link/page.tsx 中的 import**

第 6 行：
```
- import { QrCodeDisplay } from "@/components/ui/qr-code-display"
+ import { QrCodeDisplay } from "@/components/accounts/QrCodeDisplay"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move QrCodeDisplay from ui/ to components/accounts/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 17: 构建验证 — Phase 5 完成检查

- [ ] **Step 1: 运行 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -50
```

Expected: 无编译错误。

- [ ] **Step 2: 确认 ui/ 下无已移出的文件**

```bash
ls components/ui/proxy-item.tsx components/ui/qr-code-display.tsx 2>&1
```

Expected: `No such file or directory` 错误（文件已不存在）。

- [ ] **Step 3: 确认当前 ui/ 目录结构**

```bash
find components/ui -type f | sort
```

Expected:
```
components/ui/Toaster.tsx
components/ui/TextEditor.tsx
components/ui/chart/...
components/ui/data/...
components/ui/feedback/...
components/ui/navigation/TabBar/index.tsx
components/ui/overlay/Sheet.tsx
components/ui/overlay/ConfirmDialog.tsx
components/ui/overlay/index.ts
(no slide-panel.tsx, no proxy-item.tsx, no qr-code-display.tsx)
```

---

### Task 18: Phase 6 — 创建 overlay/Modal.tsx

**Files:**
- Create: `components/ui/overlay/Modal.tsx`

- [ ] **Step 1: 创建 Modal 组件**

```typescript
'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// ============================================================
// Modal — 居中弹窗外壳（阻断式，遮罩不关闭）
// ============================================================

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** sm=384px | md=448px | lg=512px | xl=672px，默认 md */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  /** 底部操作区，传入后渲染 border-t 分隔的固定底部 */
  footer?: ReactNode
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${SIZE_CLASSES[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 — 可滚动 */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* 底部操作区 */}
        {footer && (
          <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
```

- [ ] **Step 2: 更新 overlay/index.ts 添加 Modal 导出**

```diff
 export { Sheet, BottomSheet } from './Sheet'
 export { ConfirmDialog } from './ConfirmDialog'
+export { Modal } from './Modal'
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Modal component — centered dialog, backdrop-safe

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 19: Phase 6 — 迁移 NewOpportunityModal 使用 Modal 外壳

**Files:**
- Modify: `components/publish/NewOpportunityModal.tsx`

- [ ] **Step 1: 替换内联外壳为 Modal 组件**

当前 `NewOpportunityModal` 的结构（第 61-148 行）是一个完整的 `fixed inset-0` 外壳 + 内部表单。改为使用 Modal 外壳，保留表单逻辑：

```typescript
'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOpportunity } from '@/lib/api/opportunities'
import { createPublishedItem } from '@/lib/api/publish-items'
import { Modal } from '@/components/ui/overlay'

interface NewOpportunityModalProps {
  onClose: () => void
}

export function NewOpportunityModal({ onClose }: NewOpportunityModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [instanceCount, setInstanceCount] = useState('1')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const count = parseInt(instanceCount) || 1
      const opp = await createOpportunity({
        name: name.trim(),
        source_type: 'manual',
        source_description: description,
        price: price ? parseFloat(price) : 0,
      })
      await Promise.all(
        Array.from({ length: count }, () =>
          createPublishedItem(opp.id, '', '', price ? parseFloat(price) : 0)
        )
      )
      return opp
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['published-items'] })
      onClose()
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('商机名称不能为空')
      return
    }
    const count = parseInt(instanceCount)
    if (isNaN(count) || count < 1 || count > 20) {
      setError('发布素材数量需在 1~20 之间')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="新建商机"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            form="new-opportunity-form"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '创建中...' : '创建商机'}
          </button>
        </div>
      }
    >
      <form id="new-opportunity-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            商机名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例如：绝版书-文学类"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 h-24"
            placeholder="从采集或手动输入的商品描述，作为 AI 改写的原材料..."
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">价格</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              发布素材 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={instanceCount}
              onChange={e => setInstanceCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="1"
              min="1"
              max="20"
            />
            <p className="text-xs text-gray-400 mt-0.5">1~20 个素材，账号后续选择</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </form>
    </Modal>
  )
}
```

关键变更：
- 去除了外层 `fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4` 和内层 `bg-white rounded-xl w-full max-w-md shadow-xl`
- 去除了手动标题栏（`flex items-center justify-between p-4 border-b`）
- 按钮从 form 内部移到 `footer` prop（使用 `form="new-opportunity-form"` 关联）
- Modal 的 `open` 固定为 `true`（调用方用条件渲染控制）

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: NewOpportunityModal uses Modal component shell

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 20: Phase 6 — 迁移 QrLoginModal 使用 Modal 外壳

**Files:**
- Modify: `components/accounts/QrLoginModal.tsx`

- [ ] **Step 1: 替换内联外壳为 Modal 组件**

将 QrLoginModal（第 58-107 行）的内联遮罩层 + 卡片替换为 Modal：

```diff
- import { QrCodeDisplay } from "@/components/accounts/QrCodeDisplay"
+ import { QrCodeDisplay } from "@/components/accounts/QrCodeDisplay"
+ import { Modal } from "@/components/ui/overlay"
```

渲染部分（第 60-106 行）替换为：
```typescript
  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={uid ? "重新登录" : "添加闲鱼账号"}
      size="md"
      footer={
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      }
    >
      <QrCodeDisplay
        qrImage={qrImage}
        scanStatus={scanStatus}
        overlayMsg={overlayMsg}
        hintMsg={hintMsg}
        canRetry={canRetry}
        onRetry={retry}
      />
    </Modal>
  )
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: QrLoginModal uses Modal component shell

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 21: Phase 6 — 迁移 NewKeywordModal 使用 Modal 外壳

**Files:**
- Modify: `components/selection/keyword/NewKeywordModal.tsx`

- [ ] **Step 1: 替换内联外壳为 Modal 组件**

```diff
- import { X } from 'lucide-react'
+ import { Modal } from '@/components/ui/overlay'
```

渲染部分替换为：
```typescript
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="新建关键词"
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            form="new-keyword-form"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '添加中...' : '添加'}
          </button>
        </div>
      }
    >
      <form id="new-keyword-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">关键词</label>
          <input
            type="text"
            value={keyword}
            onChange={ev => setKeyword(ev.target.value)}
            placeholder="输入闲鱼搜索关键词"
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: NewKeywordModal uses Modal component shell

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 22: Phase 6 — 迁移 NewPublishedItemModal 使用 Modal 外壳

**Files:**
- Modify: `components/publish/NewPublishedItemModal.tsx`

- [ ] **Step 1: 读取当前实现**

先读取文件确认结构：
```bash
cat components/publish/NewPublishedItemModal.tsx
```

- [ ] **Step 2: 替换内联外壳为 Modal 组件**

按同样的模式：外层 `fixed inset-0` 替换为 `<Modal>`，标题栏和关闭按钮由 Modal 处理，按钮移到 footer。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: NewPublishedItemModal uses Modal component shell

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 23: Phase 6 — 排查 AccountCard / AccountTable / LinkManagement 内联弹窗

**Files (需排查):**
- `components/accounts/AccountCard.tsx`
- `components/accounts/AccountTable.tsx`
- `components/accounts/LinkManagement.tsx`

- [ ] **Step 1: 读取 AccountCard.tsx 内联弹窗上下文**

AccountCard.tsx 第 32 行有 `fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4`。确认是确认操作还是编辑操作：
- 如果是删除确认 → 应使用 `ConfirmDialog`
- 如果是配置编辑 → 应使用 `Modal` 或 `Sheet`

- [ ] **Step 2: 读取 AccountTable.tsx 内联弹窗上下文**

第 61 行有同样的内联弹窗。判断迁移方向。

- [ ] **Step 3: 读取 LinkManagement.tsx 内联弹窗上下文**

第 102 行有同样的内联弹窗。判断迁移方向。

- [ ] **Step 4: 逐文件执行迁移并 Commit**

每个文件迁移后单独 commit。

---

### Task 24: 更新 COMPONENTS.md 组件索引

**Files:**
- Modify: `.claude/docs/COMPONENTS.md`

- [ ] **Step 1: 更新通用 UI 组件表格**

将 `COMPONENTS.md` 中 "通用 UI 组件 (`components/ui/`)" 表格（第 13-35 行）替换为按新目录结构组织的版本：

```markdown
## 通用 UI 组件 (`components/ui/`)

### overlay/ — 浮层组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `Modal` | `ui/overlay/Modal.tsx` | 居中弹窗外壳，阻断式，遮罩不关闭 | `open`, `onClose`, `title?`, `size?`, `children`, `footer?` |
| `ConfirmDialog` | `ui/overlay/ConfirmDialog.tsx` | 统一确认弹窗，替代 window.confirm | `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `variant?` |
| `Sheet` | `ui/overlay/Sheet.tsx` | 抽屉/底部弹出容器，支持手势拖拽关闭 | `open`, `onClose`, `title?`, `subtitle?`, `width?`, `children` |
| `BottomSheet` | `ui/overlay/Sheet.tsx` | 移动端底部弹出（同文件导出） | `open`, `onClose`, `title?`, `children`, `footer?`, `heightRatio?` |

### feedback/ — 反馈组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `EmptyState` | `ui/feedback/EmptyState.tsx` | 统一空状态展示 | `icon?`, `title`, `description?`, `action?`, `size?` |
| `ErrorBanner` | `ui/feedback/ErrorBanner.tsx` | 统一错误提示横幅，banner/inline 变体 | `message`, `variant`, `onRetry?`, `onDismiss?` |
| `ErrorBoundary` | `ui/feedback/ErrorBoundary.tsx` | React 渲染异常捕获（Class Component） | `children`, `fallback?` |
| `LoadingSpinner` | `ui/feedback/LoadingSpinner.tsx` | 加载动画指示器 | `size?: 'sm' \| 'md' \| 'lg'` |
| `StatusBadge` | `ui/feedback/StatusBadge.tsx` | 统一状态标签，配置驱动色映射 | `status`, `config`, `size?` |

### data/ — 数据展示组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `DataTable` | `ui/data/DataTable.tsx` | 列驱动 CSS Grid 表格，封装四态+排序+斑马纹+sticky表头 | `columns`, `data`, `gridTemplateColumns`, `stickyHeader?`, `orderBy?`, `asc?` |
| `EditableCell` | `ui/data/EditableCell.tsx` | 可编辑表格单元格 | `value`, `type?`, `onSave`, `disabled?` |
| `Pagination` | `ui/data/Pagination.tsx` | 统一分页控件 | `page`, `total`, `pageSize`, `onChange` |
| `SearchToolbar` | `ui/data/SearchToolbar.tsx` | 筛选栏统一布局壳，children 自由组合 | `children`, `className?` |

### navigation/ — 导航组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `TabBar` | `ui/navigation/TabBar/index.tsx` | 核心 Tab 组件，overline 样式，响应式三档 | `tabs`, `activeTab`, `onTabChange` |

### chart/ — 图表组件

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `useChart` | `ui/chart/useChart.ts` | ECharts 实例生命周期管理 hook | — |
| `ImStatusChart` | `ui/chart/ImStatusChart.tsx` | IM 状态实时折线图（消费 SSE 数据） | `snapshots` |
| `AccountPieChart` | `ui/chart/AccountPieChart.tsx` | 账号分布环形饼图 | `data` |

### 独立组件（根级）

| 组件 | 文件 | 用途 | 关键 Props |
|------|------|------|-----------|
| `Toaster` / `useToast` | `ui/Toaster.tsx` | Toast 通知系统（封装 sonner） | — |
| `TextEditor` | `ui/TextEditor.tsx` | 文本编辑器（响应式行数、maxHeight） | `value`, `onChange`, `rows?`, `maxHeight?` |
```

- [ ] **Step 2: 更新移出组件的归属**

在 COMPONENTS.md 中更新 `ProxyItem` 和 `QrCodeDisplay` 的位置信息：

- `ProxyItem`：从 "通用 UI 组件" 表格移除，添加到 "账号管理组件" 或 admin 区域
- `QrCodeDisplay`：从 "通用 UI 组件" 表格移除，已属于账号管理组件

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: update COMPONENTS.md for new ui/ directory structure

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 25: 最终构建验证 + 清理

- [ ] **Step 1: 全量 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 2: Next.js 生产构建**

```bash
cd frontend && npm run build
```

Expected: 构建成功。

- [ ] **Step 3: 验证最终目录结构**

```bash
find components/ui -type f | sort
```

Expected 输出：
```
components/ui/Toaster.tsx
components/ui/TextEditor.tsx
components/ui/chart/AccountPieChart.tsx
components/ui/chart/ImStatusChart.tsx
components/ui/chart/index.ts
components/ui/chart/useChart.ts
components/ui/data/DataTable.tsx
components/ui/data/EditableCell.tsx
components/ui/data/Pagination.tsx
components/ui/data/SearchToolbar.tsx
components/ui/data/index.ts
components/ui/feedback/EmptyState.tsx
components/ui/feedback/ErrorBanner.tsx
components/ui/feedback/ErrorBoundary.tsx
components/ui/feedback/LoadingSpinner.tsx
components/ui/feedback/StatusBadge.tsx
components/ui/feedback/index.ts
components/ui/navigation/TabBar/index.tsx
components/ui/overlay/ConfirmDialog.tsx
components/ui/overlay/Modal.tsx
components/ui/overlay/Sheet.tsx
components/ui/overlay/index.ts
```

- [ ] **Step 4: 确认旧文件已清除**

```bash
# 都不应存在
test -f components/ui/slide-panel.tsx && echo "❌ slide-panel exists" || echo "✅ slide-panel removed"
test -f components/ui/proxy-item.tsx && echo "❌ proxy-item exists" || echo "✅ proxy-item removed"
test -f components/ui/qr-code-display.tsx && echo "❌ qr-code-display exists" || echo "✅ qr-code-display removed"
test -d components/ui/echart && echo "❌ echart/ exists" || echo "✅ echart/ renamed"
test -d components/ui/Tab && echo "❌ Tab/ exists" || echo "✅ Tab/ renamed"
test -f components/ui/error-boundary.tsx && echo "❌ error-boundary exists" || echo "✅ error-boundary renamed"
test -f components/ui/loading-spinner.tsx && echo "❌ loading-spinner exists" || echo "✅ loading-spinner renamed"
test -f components/ui/pagination.tsx && echo "❌ pagination exists" || echo "✅ pagination renamed"
test -f components/ui/toaster.tsx && echo "❌ toaster exists" || echo "✅ toaster renamed"
test -f components/ui/text-editor.tsx && echo "❌ text-editor exists" || echo "✅ text-editor renamed"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification of ui/ reorganization

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 验证标准

- [ ] `npm run build` 无编译错误
- [ ] 所有 import 路径使用新的 barrel 路径或分类路径
- [ ] 旧文件路径（`slide-panel.tsx`、`proxy-item.tsx`、`qr-code-display.tsx`）不存在于 `ui/` 目录中
- [ ] 目录 `echart/`、`Tab/` 已不存在
- [ ] 业务 Modal（NewOpportunityModal 等）使用 Modal 外壳，无内联 `fixed inset-0` 遮罩层
- [ ] `COMPONENTS.md` 组件索引已更新
