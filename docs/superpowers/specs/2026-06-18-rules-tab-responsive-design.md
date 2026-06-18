# RulesTab 响应式布局设计

## 概述

为 `RulesTab` 添加移动端响应式支持，参考 `ItemsTab` 的 `desktop table + mobile card` 模式，新建 `MobileRuleCard` 组件，使规则列表在移动端以卡片形式展示，支持快捷启用/禁用切换。

## 设计原则

- 对齐 `ItemsTab` / `MobileProductCard` 的移动端设计模式
- 桌面端保持现有表格布局不变
- 移动端卡片以关键词为主视觉焦点
- 状态 badge 可点击切换启用/禁用，减少进入抽屉的频率
- 关联详情统一进抽屉查看，移动端卡片不展开

## 组件结构

```
RulesTab (modified)
├── 统计区
│   ├── 桌面端: 5列 grid (现有)
│   └── 移动端: 横向滚动 pill 行
├── 操作栏 (桌面/移动通用)
├── 规则列表
│   ├── 桌面端: RuleTable (现有，不变)
│   └── 移动端: MobileRuleCard[] (新建)
└── 抽屉 (现有，不变)
    └── RuleDrawer (create/edit)
```

## MobileRuleCard 组件设计

### Props

```ts
interface MobileRuleCardProps {
  rule: KeywordRule
  onToggleEnabled: (rule: KeywordRule) => void
  onEdit: (rule: KeywordRule) => void
  onDelete: (rule: KeywordRule) => void
}
```

### 布局结构

```
┌──────────────────────────────────────┐
│ [启用] 你好                     #10  │  ← 标题行
│ 模糊匹配 · 预定义关键词             │  ← 信息行
│ 亲，在的哦~有什么可以帮助您的？     │  ← 回复预览
│ 📦 2商品  📁 1组      [编辑][删除] │  ← 底部操作栏
└──────────────────────────────────────┘
```

### 信息层级

| 行 | 内容 | 样式 |
|----|------|------|
| 标题行 | `[状态badge]` + 关键词 + `#优先级` | 关键词 14px semibold，badge 可点击切换状态，优先级 `#N` 格式右对齐 |
| 信息行 | 匹配方式 · 回复类型 | 10px text-gray-400，匹配方式用小标签 |
| 回复预览 | 回复内容摘要 | 11px，单行截断，禁用态置灰 |
| 底部栏 | 关联标签 + 编辑/删除按钮 | 关联标签显示数量，编辑灰色按钮，删除红色文字按钮 |

### 状态 badge 交互

- 启用态：`bg-green-100 text-green-700` 显示"启用"
- 禁用态：`bg-gray-100 text-gray-500` 显示"禁用"
- 点击 badge 调用 `onToggleEnabled(rule)`，触发 API 请求切换 `rule.enabled`
- 加载中显示 spinner 替代文字
- 禁用态卡片整体置灰（bg-gray-50，文字 color-gray-400）

### 回复预览截断

- 单行 `truncate`，最大宽度约 200px
- 完整内容通过点击"编辑"进入抽屉查看

### 关联标签

- 仅显示数量：`📦 N商品` `📁 N组`
- 无可关联时显示"无关联"（灰色）
- 不展开、不弹出，关联详情进抽屉查看

## 统计区改动

### 桌面端

保持现有 5 列 grid 不变。微调：启用卡添加浅绿底色 `bg-green-50`，禁用卡添加浅灰底色，关联商品/组卡片保持语义色。

### 移动端

```html
<div class="flex gap-2 px-2 py-2 overflow-x-auto">
  <!-- 横向滚动 pill 行 -->
  <span class="pill">12 总数</span>
  <span class="pill pill-green">8 启用</span>
  <span class="pill">4 禁用</span>
  <span class="pill pill-blue">15 商品</span>
  <span class="pill pill-purple">3 组</span>
</div>
```

- 每个 stat 渲染为圆角 pill：`rounded-full px-3 py-1.5`
- 数字 + 标签并排：`font-semibold` 数字 + `text-xs text-gray-500` 标签
- 水平可滚动（`overflow-x-auto`），不换行
- 高：~32px，不占垂直空间

## 操作栏

桌面端和移动端共用同一结构：

```
左侧: 规则数量提示文字（"共 N 条规则，按优先级降序排列"）
右侧: [+ 创建规则] 按钮
```

移动端文字缩短为"共 N 条规则"。

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `components/items/views/MobileRuleCard.tsx` | 移动端规则卡片组件 |
| 修改 | `components/items/RulesTab.tsx` | 添加 `isMobile` prop，移动端分支（pill 统计 + MobileRuleCard 列表） |
| 修改 | `app/dashboard/items/page.tsx` | 向 RulesTab 传递 `isMobile` prop |

`RuleTable` 组件保持不变，仅在桌面端使用。

## 空状态 / 加载 / 错误

- 加载中：居中 LoadingSpinner（桌面/移动通用）
- 加载错误：红色错误提示条（桌面/移动通用）
- 空数据：居中空状态提示 + 创建按钮（桌面/移动通用）

以上三种状态不区分桌面/移动端。

## Props 变更

### RulesTab

```ts
interface RulesTabProps {
  isMobile: boolean              // 新增
  keywordRules: KeywordRule[]
  rulesStats: { total: number; enabled: number; disabled: number; linkedItems: number; linkedGroups: number }
  keywordsLoading: boolean
  keywordsError: unknown
}
```

### page.tsx

向 `<RulesTab>` 传递 `isMobile={isMobile}`，与 `ItemsTab` 保持一致。

## RuleTable 桌面端微调

无结构性变更。统计卡片增加语义底色（`bg-green-50` / `bg-blue-50` / `bg-purple-50`），视觉上与移动端 pill 行保持一致的颜色体系。

## 数据流

### 启用/禁用切换

当前 `handleToggleEnabled` 逻辑在 `RuleTable` 组件内部（调用 `updateKeywordRule` + `queryClient.invalidateQueries`）。

**变更**：将切换逻辑提升到 `RulesTab`，通过 props 传递给 `RuleTable` 和 `MobileRuleCard`：

```
RulesTab (owns toggle logic, useQueryClient)
├── RuleTable — onToggleEnabled prop (替代内部 handleToggleEnabled)
└── MobileRuleCard — onToggleEnabled prop
```

RuleTable 内部移除 `handleToggleEnabled`，改为调用 `onToggleEnabled(rule)` prop。

### 删除确认

同样提升到 RulesTab，`confirm()` 弹窗逻辑从 RuleTable 移至 RulesTab。

## 边界情况

- **切换状态失败**：toast 提示错误，badge 恢复原状态
- **删除确认**：复用 RuleTable 的 `confirm()` 弹窗逻辑
- **规则列表为空时**：不渲染移动端卡片区域，显示空状态
- **长关键词/正则表达式**：`word-break: break-all` + `line-clamp-1` 防止溢出
- **大量关联**：关联标签只显示数量，不罗列具体商品名
