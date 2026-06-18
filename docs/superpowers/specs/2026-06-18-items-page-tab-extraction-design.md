# 商品管理页 Tab 提取 & 规则表单统一设计文档

**日期**: 2026-06-18  
**状态**: 待审批  

---

## 一、背景

`app/dashboard/items/page.tsx` 当前 344 行，虽然业务逻辑已通过 `useItemsPage` hook 抽离，但两个 tab 的全部 JSX（商品管理 tab ~170 行 + 回复规则 tab ~70 行）仍挤在同一个文件中。

同时存在三个问题：

1. **死代码路由** — `app/dashboard/rules/page.tsx`（85 行）是独立的规则管理页面，实际从未使用
2. **规则表单分裂** — `KeywordDrawer`（商品入口）和 `RuleForm`（规则入口）各自实现了几乎相同的表单字段，但容器不同（抽屉 vs 弹窗）、绑定逻辑不同
3. **容器不统一** — `KeywordDrawer` 用响应式抽屉，`RuleForm` 用居中弹窗，体验不一致

## 二、目标

- `page.tsx` 缩减到 ~50 行，只做 tab 切换 + 抽屉调度
- tab 内容分别移到 `components/items/ItemsTab.tsx` 和 `components/items/RulesTab.tsx`
- 删除无用路由 `app/dashboard/rules/`
- 统一两个 tab 中相似的 UI 模式
- **规则创建/编辑统一使用抽屉**，提取通用表单组件 `KeywordRuleForm`

## 三、当前架构分析

### 3.1 关键词规则编辑：两条路径对比

```
商品列表入口 (KeywordDrawer)              规则页面入口 (RuleForm)
═══════════════════════════              ═══════════════════════
触发: 点击 ItemRow 的"关键词回复"图标    触发: 点击"创建规则"/RuleTable 编辑
容器: 响应式抽屉 (Sheet/BottomSheet)      容器: 固定居中弹窗 (max-w-4xl)
范围: 仅当前商品                          范围: 全店商品 + 商品组
```

```
┌──────────────────────────┬──────────────────┬──────────────────┐
│ 功能                       │ KeywordDrawer     │ RuleForm          │
├──────────────────────────┼──────────────────┼──────────────────┤
│ 表单 schema (zod)          │ ✅ 完全一致        │ ✅ 完全一致        │
│ reply_type / keyword       │ ✅                │ ✅                │
│ match_type / priority      │ ✅                │ ✅                │
│ reply_content / enabled    │ ✅                │ ✅                │
│ 占位符工具栏               │ PlaceholderPicker │ 内联按钮组          │
│ 商品卡片选择器              │ 内联折叠面板        │ 弹窗叠加            │
│ getDisplayKeyword          │ 内联函数           │ lib/api 导出       │
│ 创建规则                    │ ✅ + auto-link    │ ✅                │
│ 更新规则                    │ ✅                │ ✅                │
│ 删除规则                    │ ✅                │ ❌（RuleTable 做）  │
│ 商品/商品组多选绑定          │ ❌                 │ ✅ 右侧面板         │
│ 规则列表视图                │ ✅ 卡片列表        │ ❌（父级 RuleTable） │
│ 编辑影响其他商品的警告       │ ❌ 缺失            │ N/A               │
│ 容器类型                    │ 抽屉               │ 居中弹窗            │
└──────────────────────────┴──────────────────┴──────────────────┘
```

**结论**：表单字段 JSX、schema、占位符插入、商品卡片插入逻辑高度重复，应提取为 `KeywordRuleForm` 通用组件。绑定面板作为可选的附属组件。

### 3.2 RuleForm 弹窗 → 抽屉布局改造

当前 RuleForm 是居中弹窗 + 左右分栏（max-w-4xl，左50%表单 + 右50%绑定）。

改为抽屉后，宽度增大到 **半屏~2/3屏**（`min(900px, 66vw)`），适应规则编辑的多配置项。布局从左右分栏改为 **垂直堆叠 + 折叠分区**：

```
┌──────────────────────────────────────────────┐  ← 遮罩层（有修改时点击无效）
│                                        ┌────┤
│                                        │ ✕  │  ← 关闭按钮
│ 创建规则                                └────┤
├──────────────────────────────────────────────┤
│ ▼ 关键词配置                                  │  ← 默认展开
│   回复类型: [▾]                               │
│   关键词: [________]  匹配: [▾]  优先级: [__] │
│                                               │
│   回复内容: [____________________________]   │
│   [占位符] [占位符] [占位符] ...               │
│   + 插入商品卡片 (折叠面板)                     │
│   ☑ 启用此规则                                │
├──────────────────────────────────────────────┤
│ ▼ 商品与商品组关联 (已选 3 商品 / 1 商品组)     │  ← 折叠分区
│   搜索商品: [________]              [全选]    │
│   ☑ 商品A  ☐ 商品B  ☑ 商品C                  │
│                                               │
│   搜索商品组: [________]           [全选]     │
│   ☐ 商品组1  ☑ 商品组2                       │
├──────────────────────────────────────────────┤
│                          [取消]  [保存/创建]   │  ← 必须点按钮才能退出
└──────────────────────────────────────────────┘

Key behaviors:
- 遮罩层：isDirty ? 点击无效 : 点击关闭
- BottomSheet 拖拽手柄：isDirty ? 不可见 + 手势禁用 : 可见
- 关闭按钮 (✕)：始终可关闭
- 取消按钮：始终可关闭，放弃修改
- 提交按钮：保存后关闭
```

## 四、Sheet/BottomSheet 增强：防误关闭

### 问题

当前 Sheet/BottomSheet 点击遮罩层即关闭。规则编辑抽屉配置项多、无自动保存，误触关闭会导致编辑内容丢失。

### 方案

给 Sheet 和 BottomSheet 增加 `closeOnBackdrop` 属性：

```typescript
interface SheetProps {
  // ...existing props
  /** 点击遮罩是否关闭抽屉。默认 true。false 时只能通过 onClose 回调（即按钮）退出 */
  closeOnBackdrop?: boolean   // 默认 true（向后兼容）
}

interface BottomSheetProps {
  // ...existing props
  /** 点击遮罩是否关闭抽屉。默认 true。false 时拖拽手柄不渲染、下拉手势禁用 */
  closeOnBackdrop?: boolean   // 默认 true（向后兼容）
}
```

### 行为明细

**Sheet（桌面端）**：
| `closeOnBackdrop` | 遮罩点击 | 关闭按钮 (✕) |
|-------------------|---------|-------------|
| `true`（默认）     | 关闭抽屉 | 关闭抽屉 |
| `false`           | 无反应   | 关闭抽屉 |

**BottomSheet（移动端）**：
| `closeOnBackdrop` | 遮罩点击 | 拖拽手柄 | 下拉手势 | 关闭按钮 (✕) |
|-------------------|---------|---------|---------|-------------|
| `true`（默认）     | 关闭     | **可见** | 启用    | 关闭         |
| `false`           | 无反应   | **不可见** | 禁用  | 关闭         |

关键：`closeOnBackdrop={false}` 时拖拽手柄 **完全不渲染**，不可见。避免用户看到手柄尝试下拉却发现无效的困惑。

### 动态控制

`closeOnBackdrop` 由父级根据表单脏状态动态传入，实现"无修改可点遮罩退出，有修改必须点按钮"：

```typescript
// 消费者侧
const [isDirty, setIsDirty] = useState(false)

<Sheet closeOnBackdrop={!isDirty} ...>
  <KeywordRuleForm onDirtyChange={setIsDirty} ... />
</Sheet>
```

### 扩展性

- 默认值 `true` 保证所有现有消费者行为不变
- 新抽屉按需传入 `closeOnBackdrop={!isDirty}` 即可获得防误关闭能力
- 无需修改 Sheet/BottomSheet 内部逻辑即可适配未来更多抽屉场景
- 若未来需要"完全禁止遮罩关闭"（如强制填写表单），只需传 `closeOnBackdrop={false}` 常量即可

---

## 五、通用组件设计

### 5.1 `KeywordRuleForm` — 规则表单核心

**位置**：`components/items/parts/KeywordRuleForm.tsx`

**职责**：关键词规则的创建/编辑表单字段，不包含商品绑定 UI。内置表单脏状态跟踪，通过回调通知父级以控制抽屉关闭行为。

**Props**：

```
interface KeywordRuleFormProps {
  rule?: KeywordRule                    // 编辑模式传已有规则
  linkedItem?: Item                     // 商品入口：显示关联商品提示
  bindingWarning?: string               // 编辑已绑定规则时的警告文案
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>       // 可选：删除规则
  onDirtyChange?: (dirty: boolean) => void  // 表单脏状态变化回调
}
```

**内部脏状态跟踪**：
- watch 所有表单字段，与 initialValues（rule 传入值或空默认值）做深度对比
- 任一字段变化 → `onDirtyChange(true)`
- 提交成功 / 取消 / 重置 → `onDirtyChange(false)`

**内部包含**：
- reply_type / keyword / match_type / priority 字段
- reply_content 文本区 + PlaceholderPicker + 内联商品卡片选择器
- enabled 开关
- 关联商品提示条（当 linkedItem 传入时）
- 编辑警告条（当 bindingWarning 传入时）
- 提交/取消按钮

### 4.2 `RuleBindingPanel` — 商品/商品组绑定面板

**位置**：`components/items/parts/RuleBindingPanel.tsx`

**职责**：选择关联的商品和商品组（从全店范围）。

**Props**：

```
interface RuleBindingPanelProps {
  items: RuleItem[]                     // 全店商品列表
  groups: ItemGroup[]                   // 商品组列表
  selectedItemIds: string[]
  selectedGroupIds: string[]
  onToggleItem: (id: string) => void
  onToggleGroup: (id: string) => void
  onSelectAllItems: () => void
  onSelectAllGroups: () => void
}
```

### 5.3 改造后的消费者

**KeywordDrawer（商品入口）**：

```
const [isDirty, setIsDirty] = useState(false)

<Sheet closeOnBackdrop={!isDirty}>
  {view === "list" && <RuleListView />}       ← 规则列表（列表视图无脏状态）
  {view === "form" && <KeywordRuleForm         ← 通用表单
    rule={editingRule}
    linkedItem={item}
    bindingWarning="此规则已关联 N 个商品，修改将影响所有关联商品"
    onSubmit={handleSave}
    onCancel={backToList}
    onDelete={handleDelete}
    onDirtyChange={setIsDirty}
  />}
</Sheet>
```

**RuleDrawer（规则入口，原 RuleForm 弹窗改抽屉）**：

```
const [isDirty, setIsDirty] = useState(false)

<Sheet width="min(900px, 66vw)" closeOnBackdrop={!isDirty}>
  <div className="flex flex-col h-full">       ← 垂直堆叠
    <KeywordRuleForm                            ← 通用表单
      rule={rule}
      onSubmit={handleSave}
      onCancel={onClose}
      onDirtyChange={setIsDirty}
    />
    <RuleBindingPanel                           ← 折叠分区
      items={...}
      groups={...}
      ...
    />
    {/* 按钮在 KeywordRuleForm 内部 */}
  </div>
</Sheet>
```

## 六、组件层级（改造后）

```
page.tsx (~50行)
├── <TabBar />
├── {items && <ItemsTab />}              components/items/ItemsTab.tsx
├── {rules && <RulesTab />}              components/items/RulesTab.tsx
├── <ItemEditDrawer />                   components/items/drawers/
├── <KeywordDrawer />                    ← 内部使用 KeywordRuleForm
├── <ConfigDrawer />
└── <RuleDrawer />                       ← 原 RuleForm，改为抽屉 + KeywordRuleForm

components/items/
├── config.ts
├── FilterBar.tsx
├── ItemsTab.tsx                         (新建)
├── RulesTab.tsx                         (新建)
├── drawers/
│   ├── ConfigDrawer.tsx
│   ├── ItemEditDrawer.tsx
│   ├── KeywordDrawer.tsx                ← 改造
│   └── RuleDrawer.tsx                   ← 新建（替代 RuleForm）
├── parts/
│   ├── IconToggle.tsx
│   ├── KeywordRuleForm.tsx              (新建 — 通用规则表单)
│   ├── PlaceholderPicker.tsx
│   ├── RuleBindingPanel.tsx             (新建 — 商品/组绑定面板)
│   └── SendCodeEditor.tsx
└── views/
    ├── ItemRow.tsx
    └── MobileProductCard.tsx
```

## 七、执行顺序

### 第一阶段：Tab 提取 + Sheet 增强（纯搬运，不改业务逻辑）

| 步骤 | 操作 | 风险 |
|------|------|------|
| 1 | Sheet/BottomSheet 增加 `closeOnBackdrop` prop（默认 `true`） | 低 |
| 2 | 新建 `ItemsTab.tsx` — 从 page.tsx 搬移 items tab JSX | 低 |
| 3 | 新建 `RulesTab.tsx` — 从 page.tsx 搬移 rules tab JSX，STAT_CARDS 数组化 | 低 |
| 4 | 重写 `page.tsx` — 简化为薄壳 | 低 |
| 5 | 删除 `app/dashboard/rules/` 目录 | 低 |
| 6 | `tsc --noEmit` 验证 | — |

### 第二阶段：规则表单统一（改造逻辑 + 布局）

| 步骤 | 操作 | 风险 |
|------|------|------|
| 7 | 新建 `KeywordRuleForm.tsx` — 提取通用表单字段 + 脏状态跟踪 | 中 |
| 8 | 新建 `RuleBindingPanel.tsx` — 提取商品/组绑定面板 | 低 |
| 9 | 改造 `KeywordDrawer.tsx` — 使用 KeywordRuleForm + closeOnBackdrop + 编辑警告 | 中 |
| 10 | 新建 `RuleDrawer.tsx` — 宽抽屉 `min(900px, 66vw)` + KeywordRuleForm + RuleBindingPanel | 中 |
| 11 | 更新 `page.tsx` — `<RuleForm>` → `<RuleDrawer>` | 低 |
| 12 | 删除 `components/rules/RuleForm.tsx`（保留 RuleTable.tsx） | 低 |
| 13 | `tsc --noEmit` + 功能验证 | — |

### 为什么不一步到位

- 第一阶段纯搬运，不动逻辑，零风险，可独立验证
- 第二阶段涉及 RuleForm 弹窗→抽屉的布局改造和 KeywordRuleForm 提取，需要更多设计验证
- 两个阶段互不阻塞：第一阶段完成后 page.tsx 已干净，第二阶段随时可以开始

## 八、约束

- 不修改任何业务逻辑（第一阶段）
- 不修改 `useItemsPage` / `useKeywords` 接口
- 不改变现有视觉效果（第一阶段）
- Sheet/BottomSheet 增加 `closeOnBackdrop` 默认 `true`，向后兼容
- RuleDrawer 宽度 `min(900px, 66vw)`，KeywordDrawer 保持 560px
- 有编辑时必须通过按钮退出，不可点遮罩关闭

## 九、效果对比

| 指标 | 改前 | 第一阶段后 | 第二阶段后 |
|------|------|-----------|-----------|
| page.tsx 行数 | 344 | ~50 | ~50 |
| ItemsTab.tsx | 不存在 | ~180 | ~180 |
| RulesTab.tsx | 不存在 | ~100 | ~100 |
| KeywordRuleForm.tsx | 不存在 | 不存在 | ~200 |
| RuleBindingPanel.tsx | 不存在 | 不存在 | ~100 |
| Sheet 防误关闭 | ❌ | ✅ closeOnBackdrop | ✅ |
| 死代码 | rules/page.tsx | 0 | RuleForm.tsx 删除 |
| 规则容器 | 弹窗+抽屉混用 | 弹窗+抽屉混用 | 全部抽屉 |
| 抽屉宽度（规则编辑）| N/A | N/A | min(900px, 66vw) |
