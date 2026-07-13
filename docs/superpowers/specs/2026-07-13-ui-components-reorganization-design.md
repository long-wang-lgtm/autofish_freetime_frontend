# UI 组件目录重组设计

## 问题陈述

`components/ui/` 目录当前有 20 个组件/模块文件，以平铺方式存放，存在以下结构性问题：

1. **无分类层级** — 浮层、反馈、数据展示、导航、图表等多类组件平铺在同一个目录下，新人难以快速定位
2. **命名风格混战** — 8 个文件使用 kebab-case（如 `loading-spinner.tsx`），8 个使用 PascalCase（如 `EmptyState.tsx`），违反 `frontend-components.md` 中 "组件文件使用 PascalCase" 的规范
3. **功能重复** — `Sheet.tsx` 和 `slide-panel.tsx` 都是右侧滑入面板，实现不同但交互模式相同
4. **业务组件混入** — `proxy-item.tsx`（admin 代理管理）、`qr-code-display.tsx`（闲鱼账号扫码登录）放在通用 UI 目录
5. **缺少居中弹窗抽象** — 项目中有 6+ 处内联实现的居中弹窗（`NewOpportunityModal`、`QrLoginModal`、`NewKeywordModal` 等），各自复制粘贴相同的外壳结构，没有一个统一的 Modal 组件

## 设计目标

1. 按交互模式分类，每个类别一个文件夹，内聚相关组件
2. 统一文件命名为 PascalCase
3. 删除功能重复的组件，合并到更成熟的实现
4. 业务组件移出至对应业务目录
5. 新增居中弹窗 Modal 组件，统一 6+ 处重复实现
6. 每个文件夹提供 barrel `index.ts` 聚合导出

---

## 组件分类框架

按"组件响应什么状态"为标准，分为六个类别：

| 分类 | 响应状态 | 设计约束 | 成员 |
|------|---------|---------|------|
| **overlay/** | open/close 二元状态 | 遮罩层、焦点管理、开合动画、ESC 关闭 | Modal、ConfirmDialog、Sheet |
| **feedback/** | loading/empty/error/success 四态 | 统一视觉语言、文案规范、操作引导 | EmptyState、ErrorBanner、ErrorBoundary、LoadingSpinner、StatusBadge |
| **data/** | 数据集合（列表+分页+排序+筛选） | 列宽分配、排序状态、斑马纹、sticky header | DataTable、EditableCell、Pagination、SearchToolbar |
| **navigation/** | 路由/视图切换 | 激活指示器、URL 同步、响应式折叠 | TabBar |
| **chart/** | 数据可视化渲染 | 按需导入、统一配色、响应式自适应、dark 主题 | useChart、AccountPieChart、ImStatusChart |
| 独立根级 | 非以上类别、或有全局单例需求 | — | Toaster、TextEditor |

---

## Overlay（浮层）三分法

浮层组件是最复杂的类别。根据交互目的和视觉重心，三分为：

### Modal — 居中弹窗

- **位置**：视口居中
- **大小**：可变（`sm`=384px, `md`=448px, `lg`=512px, `xl`=672px）
- **关闭逻辑**：点击遮罩**不关闭**（防误关，用户必须主动点击关闭按钮或取消）
- **视觉重心**：阻断式——遮罩不透明度最高（`bg-black/50`），强制用户聚焦
- **适用场景**：复杂表单编辑、多步骤流程、需要用户专注操作的场景
- **接入模式**：提供外壳容器（遮罩+白色卡片+标题栏+内容区+底部），内容区完全由 children 自由定义

### ConfirmDialog — 确认弹窗

- **位置**：视口居中
- **大小**：固定 `max-w-sm`
- **关闭逻辑**：点击遮罩可关闭、Escape 键可关闭
- **视觉重心**：轻量——快速决策，不阻断心智流
- **适用场景**：删除确认、操作确认、二次确认
- **接入模式**：结构化 API（`title` + `description` + `onConfirm` + `variant`），不接受 children

### Sheet — 侧边/底部抽屉

- **位置**：桌面端右侧滑入、移动端底部弹出（同一个组件内通过 `useIsMobile` 自动切换）
- **大小**：桌面端可变宽度（默认 500px）、移动端可调高度比例
- **关闭逻辑**：点击遮罩可关闭、移动端支持手势下拉关闭
- **视觉重心**：辅助式——不阻断背景视图，用户可感知页面上下文
- **适用场景**：编辑面板、配置抽屉、详情面板
- **接入模式**：提供外壳容器（遮罩+滑入面板+标题栏+可滚动内容区+可选底部操作栏），内容区由 children 自由定义

### 三者对比

| 维度 | Modal | ConfirmDialog | Sheet |
|------|-------|---------------|-------|
| 位置 | 居中 | 居中 | 右侧/底部 |
| 宽度 | 可变（`max-w-sm` ~ `max-w-2xl`） | 固定 `max-w-sm` | 可变（`500px` 默认） |
| 高度 | 内容撑开 | 内容撑开 | 全屏（桌面）/ 百分比（移动端） |
| 遮罩不透明度 | `bg-black/50` | `bg-black/50` | `bg-black/30`（桌面）/ `bg-black/40`（移动端） |
| 点击遮罩关闭 | **❌** | ✅ | ✅ |
| Escape 关闭 | ❌（无键盘监听） | ✅ | ❌（手势关闭） |
| 焦点管理 | ❌ | ✅（保存/恢复） | ❌ |
| 内容模式 | children 自由定义 | 结构化（title+description+buttons） | children 自由定义 |
| 底部操作区 | 可选 footer prop | 内置 confirm/cancel 按钮 | 可选 footer prop |

---

## 目标目录结构

```
components/ui/
│
├── overlay/
│   ├── Modal.tsx               ← 🆕 居中弹窗外壳
│   ├── ConfirmDialog.tsx       ← 已存在，从根级移入
│   ├── Sheet.tsx               ← 已存在，合并 slide-panel.tsx 功能，增加 subtitle prop
│   └── index.ts                ← barrel 导出
│
├── feedback/
│   ├── EmptyState.tsx          ← 已存在，从根级移入
│   ├── ErrorBanner.tsx         ← 已存在，从根级移入
│   ├── ErrorBoundary.tsx       ← 从 error-boundary.tsx 重命名移入
│   ├── LoadingSpinner.tsx      ← 从 loading-spinner.tsx 重命名移入
│   ├── StatusBadge.tsx         ← 已存在，从根级移入
│   └── index.ts
│
├── data/
│   ├── DataTable.tsx           ← 已存在，从根级移入
│   ├── EditableCell.tsx        ← 已存在，从根级移入
│   ├── Pagination.tsx          ← 从 pagination.tsx 重命名移入
│   ├── SearchToolbar.tsx       ← 已存在，从根级移入
│   └── index.ts
│
├── navigation/
│   └── TabBar/
│       └── index.tsx           ← 从 Tab/index.tsx 重命名目录，导出名已是 TabBar
│
├── chart/                      ← 从 echart/ 重命名
│   ├── useChart.ts
│   ├── AccountPieChart.tsx
│   ├── ImStatusChart.tsx
│   └── index.ts
│
├── Toaster.tsx                 ← 从 toaster.tsx 重命名
└── TextEditor.tsx              ← 从 text-editor.tsx 重命名
```

**移出到业务目录**：

| 源文件 | 目标位置 | 理由 |
|--------|---------|------|
| `ui/proxy-item.tsx` | `components/admin/ProxyItem.tsx` | admin 代理管理专用业务组件 |
| `ui/qr-code-display.tsx` | `components/accounts/QrCodeDisplay.tsx` | 闲鱼账号扫码登录专用业务组件 |

**删除**：

| 文件 | 原因 | 替换方案 |
|------|------|---------|
| `ui/slide-panel.tsx` | 与 Sheet 功能重复 | Sheet 增加 `subtitle` prop + 柔化宽度控制 |

---

## 各个组件详细设计

### 1. Modal（新增）

**Props 定义**：

```typescript
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** sm=384px | md=448px | lg=512px | xl=672px */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  /** 底部操作区，传入后渲染 border-t 分隔的固定底部 */
  footer?: ReactNode
}
```

**渲染结构**（提取自项目中 6 处内联实现的共同模式）：

```
<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl shadow-xl w-full max-w-{size} max-h-[90vh] flex flex-col">
    {title && (
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose}>✕</button>
      </div>
    )}
    <div className="flex-1 overflow-y-auto p-4">{children}</div>
    {footer && <div className="border-t border-gray-100 px-4 py-3">{footer}</div>}
  </div>
</div>
```

**关键设计决策**：

- **点击遮罩不关闭**：这是 Modal 与 ConfirmDialog/Sheet 的核心区别。编辑中的表单被误点遮罩关闭会导致数据丢失，用户必须通过关闭按钮或取消按钮退出
- **`max-h-[90vh]`**：防止内容过长时溢出视口，内容区独立滚动
- **不添加 Escape 监听**：居中弹窗承载复杂编辑任务，误触 Escape 的数据损失风险高于 Sheet。业务层如需 Escape 关闭，自行添加键盘监听包裹
- **footer prop 而非内置按钮**：编辑场景的按钮组合多样（取消+保存、取消+下一步、取消+提交+草稿），不预设按钮模式

**提取后，业务 Modal 的迁移模式**：

```typescript
// Before（内联外壳）
<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
    <div className="flex items-center justify-between p-4 border-b">
      <h3>新建商机</h3>
      <button onClick={onClose}>✕</button>
    </div>
    <form className="p-4 space-y-4">...</form>
  </div>
</div>

// After（使用 Modal）
<Modal open={true} onClose={onClose} title="新建商机" size="md"
  footer={<><CancelButton /><SubmitButton /></>}
>
  <form className="space-y-4">...</form>
</Modal>
```

### 2. Sheet（合并 slide-panel）

**变更**：

- 增加 `subtitle?: string` prop（从 SlidePanel 对齐）
- `width` prop 保持现在 `string` 类型（`"500px"` 或 `"w-96"` 均可），不限制格式

**SlidePanel 引用迁移**（9 处）：

| 文件 | 替换方式 |
|------|---------|
| `admin/proxy/page.tsx`（4 处） | `Sheet` 替换，保留 title/subtitle |
| `admin/users/page.tsx`（1 处） | `Sheet` 替换 |
| `admin/users/MembershipActionSheet.tsx`（1 处） | `Sheet` 替换 |
| `admin/accounts/page.tsx`（1 处） | `Sheet` 替换 |

### 3. ConfirmDialog

无功能变更，仅移动文件位置到 `overlay/` 目录。

### 4. feedback/ 各组件

均为文件移动 + 重命名（如 `error-boundary.tsx` → `ErrorBoundary.tsx`），无功能变更。

### 5. data/ 各组件

均为文件移动 + 重命名（如 `pagination.tsx` → `Pagination.tsx`），无功能变更。

### 6. navigation/TabBar/

目录 `Tab/` → `TabBar/`，内部 `index.tsx` 不变。导出名已是 `TabBar`，无需修改组件代码。

### 7. chart/

目录 `echart/` → `chart/`，内部文件不变。`echart` 是库名而非语义分类名，`chart` 更准确地表达"图表组件集合"。

### 8. Toaster / TextEditor

仅文件重命名 kebab-case → PascalCase，无功能变更。

### 9. proxy-item.tsx → components/admin/ProxyItem.tsx

文件移动 + 更新 2 处引用（`admin/accounts/page.tsx`、`admin/users/page.tsx`）。

### 10. qr-code-display.tsx → components/accounts/QrCodeDisplay.tsx

文件移动 + 更新 2 处引用（`accounts/QrLoginModal.tsx`、`app/login/link/page.tsx`）。

---

## Barrel 导出规范

每个分类目录的 `index.ts` 统一格式：

```typescript
// overlay/index.ts
export { Modal } from './Modal'
export { ConfirmDialog } from './ConfirmDialog'
export { Sheet, BottomSheet } from './Sheet'
```

外部引用从：
```typescript
import { Sheet } from '@/components/ui/Sheet'
```
变为：
```typescript
import { Sheet } from '@/components/ui/overlay'
```

---

## 实施步骤

按依赖关系和风险从低到高排列，居中弹窗（Modal）放在最后，因为它是**新增**组件，不影响现有引用。

### Phase 1：kebab-case → PascalCase 重命名

**目标**：消除命名风格混战，为后续分类迁移做铺垫。

| 步骤 | 文件操作 | import 更新 |
|------|---------|------------|
| 1.1 | `toaster.tsx` → `Toaster.tsx` | `app/layout.tsx` |
| 1.2 | `text-editor.tsx` → `TextEditor.tsx` | `ItemEditDrawer.tsx`, `ConfigDrawer.tsx`, `KeywordRuleForm.tsx` |
| 1.3 | `error-boundary.tsx` → `feedback/ErrorBoundary.tsx` | `DashboardLayout.tsx`, `AdminLayout.tsx` |
| 1.4 | `loading-spinner.tsx` → `feedback/LoadingSpinner.tsx` | 18 处引用（全项目范围搜索替换 `@/components/ui/loading-spinner`） |
| 1.5 | `pagination.tsx` → `data/Pagination.tsx` | 4 处引用 |

### Phase 2：创建分类目录 + 移动文件

**目标**：建立目录层级结构，批量迁移组件文件。

| 步骤 | 操作 |
|------|------|
| 2.1 | 创建 `overlay/`、`feedback/`、`data/`、`navigation/` 文件夹 |
| 2.2 | 逐类移动文件，同步更新所有 import 路径 |
| 2.3 | 每个目录创建 `index.ts` barrel 导出 |

**import 路径迁移对照**：

| 旧路径 | 新路径 |
|--------|--------|
| `@/components/ui/Sheet` | `@/components/ui/overlay` |
| `@/components/ui/ConfirmDialog` | `@/components/ui/overlay` |
| `@/components/ui/EmptyState` | `@/components/ui/feedback` |
| `@/components/ui/ErrorBanner` | `@/components/ui/feedback` |
| `@/components/ui/StatusBadge` | `@/components/ui/feedback` |
| `@/components/ui/LoadingSpinner` | `@/components/ui/feedback` |
| `@/components/ui/ErrorBoundary` | `@/components/ui/feedback` |
| `@/components/ui/DataTable` | `@/components/ui/data` |
| `@/components/ui/EditableCell` | `@/components/ui/data` |
| `@/components/ui/Pagination` | `@/components/ui/data` |
| `@/components/ui/SearchToolbar` | `@/components/ui/data` |
| `@/components/ui/Tab` | `@/components/ui/navigation/TabBar` |
| `@/components/ui/echart/useChart` | `@/components/ui/chart/useChart` |
| `@/components/ui/echart/AccountPieChart` | `@/components/ui/chart` |
| `@/components/ui/echart/ImStatusChart` | `@/components/ui/chart` |

### Phase 3：删除 slide-panel + 合并到 Sheet

**目标**：消除功能重复。

| 步骤 | 操作 |
|------|------|
| 3.1 | `Sheet` 增加 `subtitle?: string` prop |
| 3.2 | 替换所有 `SlidePanel` import 为 `Sheet`（9 处） |
| 3.3 | 删除 `slide-panel.tsx` |
| 3.4 | 验证 Sheet 的 `width` prop 能覆盖 SlidePanel 的 `w-96` 默认值 |

### Phase 4：目录重命名（语义化）

| 步骤 | 操作 |
|------|------|
| 4.1 | `echart/` → `chart/`（目录重命名 + 更新 4 处 import） |
| 4.2 | `Tab/` → `TabBar/`（目录重命名 + 更新 5 处 import） |

### Phase 5：业务组件移出

| 步骤 | 文件 | 目标 | import 更新 |
|------|------|------|------------|
| 5.1 | `ui/proxy-item.tsx` | `components/admin/ProxyItem.tsx` | `admin/accounts/page.tsx`, `admin/users/page.tsx` |
| 5.2 | `ui/qr-code-display.tsx` | `components/accounts/QrCodeDisplay.tsx` | `accounts/QrLoginModal.tsx`, `app/login/link/page.tsx` |

### Phase 6：新增 Modal 组件 + 业务 Modal 迁移

> **最后做**——这是唯一的新增组件，不涉及破坏性变更，可独立验证。

| 步骤 | 操作 |
|------|------|
| 6.1 | 创建 `overlay/Modal.tsx`，实现居中弹窗外壳 |
| 6.2 | 更新 `overlay/index.ts` 添加 Modal 导出 |
| 6.3 | 迁移 `NewOpportunityModal` — 使用 Modal 外壳，去除内联遮罩层 |
| 6.4 | 迁移 `QrLoginModal` — 同上 |
| 6.5 | 迁移 `NewKeywordModal` — 同上 |
| 6.6 | 迁移 `NewPublishedItemModal` — 同上 |
| 6.7 | 排查 `AccountCard`、`AccountTable`、`LinkManagement` 中的内联居中弹窗，评估是否适合用 Modal 统一 |
| 6.8 | 更新 `COMPONENTS.md` 组件索引 |

---

## 边界条件与风险

### 命名冲突风险

`ProxyItem` 移动到 `components/admin/ProxyItem.tsx` 时，`admin/` 目录下已有 `admin/proxy/page.tsx` 的页面组件。文件名与页面文件在同一个目录树的不同层级，无冲突——`components/admin/ProxyItem.tsx`（组件）vs `app/admin/proxy/page.tsx`（页面）。

### 循环依赖风险

`DataTable.tsx` 内部 import 了 `LoadingSpinner`、`ErrorBanner`、`EmptyState`。移动后这些组件都在 `feedback/` 目录，`DataTable` 在 `data/` 目录，两者是平级关系，不会产生循环依赖。

### 回归风险

本次重构**不改变任何组件的 Props 接口或行为逻辑**（除 Sheet 增加可选的 `subtitle` prop），纯文件移动和重命名。风险主要集中在 import 路径遗漏更新。缓解策略：

1. 每完成一个 Phase 运行 `npm run build` 检查编译错误
2. import 更新采用全局搜索替换，不手动逐个修改
3. Modal 迁移采用逐个文件模式，每迁移一个就验证一个

### 暂不处理

- **优先 Pill 统一** — `COMPONENTS.md` 中标记为 "🔴 待统一"，但属于独立任务，本次不涉及
- **RulesItemsingleDrawer 文件命名** — `COMPONENTS.md` 中记录的拼写错误，独立修复
- **Dark 模式适配** — 新 Modal 组件暂不做 dark 模式（项目中其他 overlay 组件也未做），后续 Phase 统一处理

---

## 验证标准

- [ ] `npm run build` 无编译错误
- [ ] 所有 import 路径使用新的 barrel 路径或分类路径
- [ ] 旧文件路径（`slide-panel.tsx`、`proxy-item.tsx`、`qr-code-display.tsx`）不存在于 `ui/` 目录中
- [ ] 目录 `echart/`、`Tab/` 已不存在
- [ ] 业务 Modal（NewOpportunityModal 等）使用 Modal 外壳，无内联 `fixed inset-0` 遮罩层
- [ ] `COMPONENTS.md` 组件索引已更新
