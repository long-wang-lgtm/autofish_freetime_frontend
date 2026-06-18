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

当前 RuleForm 是居中弹窗 + 左右分栏（max-w-4xl，左50%表单 + 右50%绑定）：

```
┌──────────────────────────────────────────────────────┐
│ 创建规则                                         [✕] │  ← 标题栏
├──────────────────────────┬───────────────────────────┤
│ 关键词配置 (w-1/2)        │ 商品与商品组关联 (w-1/2)   │  ← 左右分栏
│                          │                           │
│ 回复类型: [▾]            │ 关联商品 (3个) [全选]      │
│ 关键词:   [____]         │ [搜索...]                 │
│ 匹配: [▾] 优先级: [__]   │ [商品1] [商品2] [商品3]   │
│ 回复内容: [____]         │                           │
│ [占位符][占位符]...      │ 关联商品组 (1个) [全选]   │
│                          │ [搜索...]                 │
│ ☑ 启用此规则             │ [商品组1]                 │
├──────────────────────────┴───────────────────────────┤
│                              [取消]  [创建]           │  ← 按钮栏
└──────────────────────────────────────────────────────┘
```

改为抽屉后，宽度受限（500-640px），左右分栏不可行。改为 **垂直堆叠 + 折叠分区**：

```
┌─────────────────────────────────┐
│ 创建规则                     [✕] │  ← Sheet 标题栏
├─────────────────────────────────┤
│ ▼ 关键词配置                     │  ← 默认展开
│   回复类型: [▾]                  │
│   关键词: [________]  匹配: [▾] │
│   优先级: [___]                  │
│   回复内容: [________________]  │
│   [占位符] [占位符] ...          │
│   + 插入商品卡片 (折叠面板)       │
│   ☑ 启用此规则                   │
├─────────────────────────────────┤
│ ▼ 商品与商品组关联 (已选 3 商品)  │  ← 折叠分区
│   搜索商品: [________]           │
│   ☑ 商品A  ☐ 商品B  ☑ 商品C     │
│   搜索商品组: [________]         │
│   ☐ 商品组1  ☑ 商品组2          │
├─────────────────────────────────┤
│                  [取消]  [创建]   │  ← 底部按钮
└─────────────────────────────────┘
```

## 四、通用组件设计

### 4.1 `KeywordRuleForm` — 规则表单核心

**位置**：`components/items/parts/KeywordRuleForm.tsx`

**职责**：关键词规则的创建/编辑表单字段，不包含商品绑定 UI。

**Props**：

```
interface KeywordRuleFormProps {
  rule?: KeywordRule                    // 编辑模式传已有规则
  linkedItem?: Item                     // 商品入口：显示关联商品提示
  bindingWarning?: string               // 编辑已绑定规则时的警告文案
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>       // 可选：删除规则
}
```

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

### 4.3 改造后的消费者

**KeywordDrawer（商品入口）**：

```
<Sheet>
  {view === "list" && <RuleListView />}    ← 规则列表（已有逻辑）
  {view === "form" && <KeywordRuleForm      ← 通用表单
    rule={editingRule}
    linkedItem={item}
    bindingWarning="此规则已关联 N 个商品，修改将影响所有关联商品"
    onSubmit={handleSave}
    onCancel={backToList}
    onDelete={handleDelete}
  />}
</Sheet>
```

注：商品入口不展示 RuleBindingPanel，创建时自动 linkItemToRule(currentItem)。

**RuleForm → RuleDrawer（规则入口）**：

```
<Sheet width="640px">                     ← 弹窗改为抽屉
  <KeywordRuleForm                        ← 通用表单
    rule={rule}
    onSubmit={handleSave}
    onCancel={onClose}
  />
  <RuleBindingPanel                       ← 绑定面板（折叠分区）
    items={...}
    groups={...}
    ...
  />
</Sheet>
```

## 五、组件层级（改造后）

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

## 六、执行顺序

### 第一阶段：Tab 提取（纯搬运，不改逻辑）

| 步骤 | 操作 | 风险 |
|------|------|------|
| 1 | 新建 `ItemsTab.tsx` — 从 page.tsx 搬移 items tab JSX | 低 |
| 2 | 新建 `RulesTab.tsx` — 从 page.tsx 搬移 rules tab JSX，STAT_CARDS 数组化 | 低 |
| 3 | 重写 `page.tsx` — 简化为薄壳 | 低 |
| 4 | 删除 `app/dashboard/rules/` 目录 | 低 |
| 5 | `tsc --noEmit` 验证 | — |

### 第二阶段：规则表单统一（改造逻辑 + 布局）

| 步骤 | 操作 | 风险 |
|------|------|------|
| 6 | 新建 `KeywordRuleForm.tsx` — 提取通用表单字段 + 逻辑 | 中 |
| 7 | 新建 `RuleBindingPanel.tsx` — 提取商品/组绑定面板 | 低 |
| 8 | 改造 `KeywordDrawer.tsx` — 使用 KeywordRuleForm，增加编辑警告 | 中 |
| 9 | 新建 `RuleDrawer.tsx` — 原 RuleForm 改为抽屉 + KeywordRuleForm + RuleBindingPanel | 中 |
| 10 | 更新 `page.tsx` — `<RuleForm>` → `<RuleDrawer>` | 低 |
| 11 | 删除 `components/rules/RuleForm.tsx`（保留 RuleTable.tsx） | 低 |
| 12 | `tsc --noEmit` + 功能验证 | — |

### 为什么不一步到位

- 第一阶段纯搬运，不动逻辑，零风险，可独立验证
- 第二阶段涉及 RuleForm 弹窗→抽屉的布局改造和 KeywordRuleForm 提取，需要更多设计验证
- 两个阶段互不阻塞：第一阶段完成后 page.tsx 已干净，第二阶段随时可以开始

## 七、约束

- 不修改任何业务逻辑（第一阶段）
- 不修改 `useItemsPage` / `useKeywords` 接口
- 不改变现有视觉效果（第一阶段）
- RuleForm → RuleDrawer 布局改动需保持功能完整

## 八、效果对比

| 指标 | 改前 | 第一阶段后 | 第二阶段后 |
|------|------|-----------|-----------|
| page.tsx 行数 | 344 | ~50 | ~50 |
| ItemsTab.tsx | 不存在 | ~180 | ~180 |
| RulesTab.tsx | 不存在 | ~100 | ~100 |
| KeywordRuleForm.tsx | 不存在 | 不存在 | ~200 |
| RuleBindingPanel.tsx | 不存在 | 不存在 | ~100 |
| 死代码 | rules/page.tsx | 0 | RuleForm.tsx 删除 |
| 规则容器统一 | 弹窗+抽屉混用 | 弹窗+抽屉混用 | 全部抽屉 |
