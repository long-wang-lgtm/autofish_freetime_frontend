# 侧边栏布局优化 — 设计文档

> 日期：2026-06-18 | 状态：已确认

## 1. 问题诊断

### 1.1 用户提出的问题

| # | 问题 | 位置 |
|---|------|------|
| 1 | KeywordDrawer 宽度 560px 太窄，与 RuleDrawer 66vw 不一致 | `KeywordDrawer.tsx:231` |
| 2 | 列表页"删除"按钮语义错误 — 应改为"解除绑定"，只取消关联不删规则 | `KeywordDrawer.tsx:171-177` |
| 3 | 关键词与回复内容编辑栏距离太远，视觉断裂 | `KeywordRuleForm.tsx` |
| 4 | Priority 一个数字输入框独占一行，浪费空间 | `KeywordRuleForm.tsx:265-273` |
| 5 | Enabled checkbox 独占一行 | `KeywordRuleForm.tsx:315-325` |
| 6 | 商品卡片选择面板在 textarea 下方展开，挤占空间 | `KeywordRuleForm.tsx:161-209` |

### 1.2 额外发现的问题

| # | 问题 | 位置 |
|---|------|------|
| 7 | RuleBindingPanel 以 children 注入 KeywordRuleForm 底部，与规则编辑区距离远 | `RuleDrawer.tsx:197-215` |
| 8 | KeywordRuleForm.onDelete 在 KeywordDrawer 场景应解绑而非删规则，语义混乱 | `KeywordDrawer.tsx:91-106` |
| 9 | 回复类型 select 内容仅 6 字宽，独占一行（含 label） | `KeywordRuleForm.tsx:214-222` |
| 10 | ItemEditDrawer 用 Sheet footer prop 传按钮，KeywordDrawer/RuleDrawer 按钮内嵌 form，不一致 | 三个 drawer |

## 2. 设计目标

1. **两列布局**：表单左列（flex-1）+ 折叠面板右列（~220px），抽屉统一 `min(66vw, 900px)`
2. **信息紧凑**：关键词与回复内容上下紧邻，小字段合并同行
3. **默认折叠**：商品卡片、关联商品、关联商品组三个面板均默认折叠，展开时发起请求
4. **抽屉不滚动**：Sheet 容器 `overflow-hidden`，仅内部面板独立滚动
5. **语义修正**："删除"→"解除绑定"，不删除规则本体

## 3. 布局方案

### 3.1 桌面端 RuleDrawer

```
┌─────────────────────────────────────────────────────────────┐
│ [toggle] 启用                                    ← 左上角    │
├────────────────────────────┬────────────────────────────────┤
│ 🔑 匹配规则                │                                │
│ [自定义|预定义]    优先级[0] │  📦 商品卡片 ▾                 │
│ 关键词[________] 匹配[精确▾]│    点击展开 · 选择插入          │
│                            │                                │
│ 💬 回复内容 *              │  🔗 关联商品 (3) ▾             │
│ [{标题}][{价格}][{库存}]    │    已关联 3 个 · 点击管理      │
│ [_____________________]    │                                │
│ [_____________________]    │  📁 关联商品组 (1) ▾           │
│ {名称} / [ITEM:ID]         │    已关联 1 个 · 点击管理      │
│                            │                                │
├────────────────────────────┴────────────────────────────────┤
│                              [取消]  [保存]                  │
└─────────────────────────────────────────────────────────────┘
```

**空间分配：**
- 抽屉容器：`min(66vw, 900px)`，`height: 100vh`，`overflow: hidden`
- 左列（表单）：`flex: 1`，无独立滚动
- 右列（面板）：`width: 220px`，`flex-shrink: 0`，纵向堆叠三个折叠面板
- 展开的面板：各自 `max-height` + `overflow-y: auto` 内部滚动

### 3.2 桌面端 KeywordDrawer

与 RuleDrawer 差异：
- 右列仅「商品卡片」面板（无关联商品/商品组）
- 底部有蓝色提示条：关联商品信息 + 修改影响警告
- 列表页"删除"→"解除绑定"（橙色文字，非红色）

### 3.3 移动端

- 继续使用 BottomSheet（`heightRatio: 0.95`）
- 三个折叠面板改为底部 accordion 列表，单列纵向排列
- 展开的面板在 BottomSheet 内部滚动

## 4. 组件改动清单

### 4.1 KeywordRuleForm.tsx — 重构表单布局

**改动：**

1. **回复类型**：select → pill 按钮组，嵌入「匹配规则」卡片标题行
2. **优先级**：移至卡片标题行右端，42px 数字输入框
3. **Enabled**：从表单底部 checkbox 改为左上角 toggle switch，仍由表单内部渲染（值绑定到 form `enabled` 字段）
4. **匹配规则卡片**：关键词 + 匹配方式同行（flex 5:2）
5. **回复内容卡片**：占位符 bar + textarea，下方留一行格式提示
6. **移除**"+ 插入商品卡片"按钮 — 功能移至右列面板
7. **移除**表单内 Enabled checkbox
8. **移除**独立的 Priority 行
9. **移除**独立的 Reply type 行
10. **children slot**：保留但不用于 RuleBindingPanel（改为右列）

**Props 变更：**
- `onDelete` → `onDestructiveAction?: { label: string; onAction: () => Promise<void> }`，调用方自行决定按钮文案和行为（KeywordDrawer 传「解除绑定」+ `unlinkItemFromRule`；RuleDrawer 不传）
- Enabled 字段仍由 form 管理，渲染位置从底部 checkbox 改为左上角 toggle switch

### 4.2 RuleBindingPanel.tsx — 折叠化

**改动：**
- 默认折叠，点击标题栏展开/收起
- 移除「全选」按钮
- 折叠态显示关联数量 badge
- 展开时发起数据请求（已在 RuleDrawer 中处理，面板只需切换 UI）

### 4.3 新增 CollapsiblePanel 组件

通用的折叠面板容器，供右列三个面板复用：

```tsx
interface CollapsiblePanelProps {
  title: string
  badge?: number           // 折叠态显示的计数
  defaultExpanded?: boolean // 默认 false
  onExpand?: () => void     // 展开时回调（发起请求）
  children: ReactNode
}
```

### 4.4 新增 ItemCardPanel 组件

商品卡片选择面板（从 KeywordRuleForm 内联 itemPickerPanel 提取）：

- 折叠态：「📦 商品卡片 ▾」+「点击展开 · 选择插入」
- 展开态：搜索框 + 商品列表（内部滚动）+ 点击插入
- `onInsert(itemId: string)` 回调

### 4.5 KeywordDrawer.tsx

**改动：**
- 宽度 `560px` → `"min(66vw, 900px)"`
- 列表页按钮 `删除` → `解除绑定`（`text-orange-600` 替代 `text-red-600`）
- 解除绑定调用 `unlinkItemFromRule` 而非 `deleteKeywordRule`
- 移除 `handleDeleteRule`，新增 `handleUnlinkRule`
- Toggle 开关渲染在内容区左上角

### 4.6 RuleDrawer.tsx

**改动：**
- 宽度已是 `min(900px, 66vw)`，保持不变
- 右列改为 CollapsiblePanel 包装的三个折叠面板
- RuleBindingPanel 从 children 移到右列
- Toggle 开关渲染在内容区左上角

### 4.7 Sheet.tsx

**无需改动** — Portal 渲染、`overflow-hidden` 内容区、`flex-col` 布局已正确实现。

## 5. 数据流

```
KeywordDrawer                    RuleDrawer
─────────────                    ─────────
item (prop)                      rule? (prop)
  │                                │
  ├─ getRulesForItem(item.gid)     ├─ listRuleItems()  (展开时)
  │                                ├─ listItemGroups() (展开时)
  │                                │
  ├─ 编辑: updateKeywordRule       ├─ create/updateKeywordRule
  │   + linkItemToRule             │   + linkItemToRule
  │                                │   + unlinkItemFromRule
  ├─ 解除绑定: unlinkItemFromRule  │   + linkGroupToRule
  │                                │   + unlinkGroupFromRule
  └─ 不直接删除规则               │
                                   └─ 不直接删除规则
```

## 6. 边界情况

| 场景 | 处理 |
|------|------|
| 右列面板展开时抽屉高度不足 | 面板内部 `max-height` + `overflow-y: auto`，抽屉本身不滚动 |
| 关联商品搜索无结果 | 显示「未找到匹配的商品」 |
| 编辑已关联多商品的规则 | 显示黄色警告条：修改影响所有关联商品 |
| 解除最后一个绑定 | 规则不删除，仅取消关联；商品回退到无规则状态 |
| 移动端面板展开 | BottomSheet 内部滚动，面板列表纵向排列 |
| 表单未保存关闭 | `closeOnBackdrop={!isDirty}` — 已有脏数据时阻止关闭 |

## 7. 不变更范围

- ItemEditDrawer 本次不改（非关键词规则相关）
- PlaceholderPicker 组件本次不改
- Sheet / BottomSheet 组件本次不改
- 移动端 ConfigDrawer 本次不改
