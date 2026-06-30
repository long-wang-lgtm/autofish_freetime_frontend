# Phase 3+ 硬编码值清理设计

> 状态：✅ 已批准 | 2026-06-30

## 目标

清理 Phase 3 完成后代码中残留的硬编码值，确保与更新后的设计规范一致，为后续主题切换和视口缩放铺路。

## 审计来源

4 个子代理并行审计（宽高尺寸、颜色间距、字号圆角阴影、inline style），结果经 `frontend-design-tokens.md`（v2，圆角六级体系）、`frontend-colors.md`、`frontend-layout.md` 三份更新后规范重新审计。

## 总体策略

三批提交 P0 → P1 → P2，每批独立通过 `tsc --noEmit`。

---

## P0 批：明确违规修复（约 103 处）

### 1. `rounded-md` → 按元素类型替换（90 处）

**替换规则**：
- 表单控件（`<input>`、`<select>`、`<textarea>`、操作 `<button>`）→ `rounded-lg`
- 模态框/抽屉容器 → `rounded-xl`
- 表格内图片缩略图 → `rounded-lg`
- 下拉菜单项、分页按钮、Tab/筛选切换按钮 → `rounded-lg`

**文件清单**：

```
auth/LoginForm.tsx              → rounded-lg (6处 inputs + button)
auth/RegisterForm.tsx           → rounded-lg (3处 inputs + button)

accounts/AccountCard.tsx        → rounded-xl (modal), rounded-lg (inputs/buttons 3处)
accounts/AccountTable.tsx       → rounded-xl (modal), rounded-lg (inputs/buttons 4处)
accounts/QrLoginModal.tsx       → rounded-lg (button 1处)
accounts/ReviewTemplateSheet.tsx → rounded-lg (rows 1处)
accounts/LinkManagement.tsx     → 核实宽度后决定 rounded-xl 或 rounded-2xl

admin/page.tsx                  → rounded-lg (tab toggles 2处)
admin/proxy/page.tsx            → rounded-lg (inputs/selects/buttons 14处)

layout/Header.tsx               → rounded-lg (icons/dropdown 3处)
layout/AdminLayout.tsx          → rounded-lg (badge icon 1处)
layout/SidebarBase.tsx          → rounded-lg (toggle 1处)

ui/pagination.tsx               → rounded-lg (buttons 3处)

items/FilterBar.tsx             → rounded-lg (inputs/buttons 6处)
items/ItemEditDrawer.tsx        → rounded-lg (inputs/buttons 5处)
items/RulesItemsingleDrawer.tsx → rounded-lg (buttons 3处)
items/RulesTab.tsx              → rounded-lg (buttons 2处)
items/ItemsTab.tsx              → rounded-lg (toggles 2处)
items/MobileRuleCard.tsx        → rounded-lg (buttons 2处)
items/RuleTable.tsx             → rounded-lg (buttons 3处)
items/SendCodeEditor.tsx        → rounded-lg (input 1处)
items/RuleBindingPanel.tsx      → rounded-lg (selects 2处)
items/KeywordRuleForm.tsx       → rounded-lg (inputs/buttons 7处)
items/ItemCardPanel.tsx         → rounded-lg (search input 1处)
items/IconToggle.tsx            → rounded-lg (button 1处)

publish/OpportunityHeader.tsx   → rounded-lg (image/inputs 5处)
publish/OpportunityDetailCard.tsx → rounded-lg (image/inputs 6处)

selection/ProductMonitorTab.tsx → rounded-lg (badge/button 2处)
selection/CollectionConfig.tsx  → rounded-lg (toggles 2处)
selection/ReportSubTabs.tsx     → rounded-lg (sub-tabs 1处)
```

### 2. 单项违规（9 处）

| 文件 | 当前 | 修复 |
|------|------|------|
| ProductMonitorTab.tsx:425 | `text-[11px]` | `text-xs` |
| ProductMonitorTab.tsx:432 | `text-[11px]` | `text-xs` |
| login/page.tsx:25 | `space-y-8` | `space-y-6` |
| register/page.tsx:24 | `space-y-8` | `space-y-6` |
| Tab/index.tsx:61 | `-mb-[2px]` | 父容器 border-b-2 border-transparent，激活态 border-blue-600，消除负 margin |
| ProductMonitorTab.tsx:580 | `py-[12px]` | `py-3` |
| OpportunityHeader.tsx:108,115 | 裸 `rounded` | `rounded-lg` |
| KeywordRuleForm.tsx:196 | 裸 `rounded` | `rounded-lg` |
| login/link/page.tsx:55,65 | `rounded-2xl`（卡片 <600px） | `rounded-xl` |

---

## P1 批：阻碍 rem 缩放的值（约 14 处）

### 1. inline style → Tailwind className（7 处）

| 文件 | 当前 | 修复 |
|------|------|------|
| admin/page.tsx:299,304 | `style={{ height: 260 }}` | `className="h-64"` |
| ItemsTab.tsx:137,182 | `style={{ minHeight: "200px" }}` | `className="min-h-[200px]"` |
| AccountPieChart.tsx:114 | `style={{ aspectRatio: '1/1' }}` | `className="aspect-square"` |
| PublishInstanceRow.tsx:180,195 | `style={{ WebkitLineClamp: 3 }}` | `className="line-clamp-3"` |

### 2. FilterBar min-w 收缩（3 处）

FilterBar.tsx:57,75,88 — `min-w-[150px]` → `min-w-0`

### 3. 移动端文本截断 max-w（4 处，保留）

MobileProductCard.tsx:107 (`max-w-[80px]`), MobileProductCard.tsx:249 (`max-w-[100px]`), SendCodeEditor.tsx:133 (`max-w-[100px]`) — 移动端卡片有限空间，保留并添加注释。

---

## P2 批：布局重构（约 40 处）

### 1. 发布模块 12 列 → fr（24 处）

在 `components/publish/constants.ts` 新建 `PUBLISH_GRID_COLS`：

```
18px 1.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr
```

对应列：复选框 | 封面图 | 改写内容 | 封面策划 | 价格 | 账号 | 分类 | 进度 | 状态 | 操作 | (flexible)

`PublishInstanceRow.tsx` 和 `PublishInstanceList.tsx` 共享同一常量。行 `min-h-[96px]` 保留。

### 2. 商品管理 13 等宽列 → fr（3 处）

`ItemRow.tsx` + `ItemsTab.tsx`：`repeat(13, minmax(0, 1fr))` → 按列内容特征分配 fr 比例，提取为常量为 `ITEMS_GRID_COLS`。

### 3. 非标准间距（8 处）

| 当前 | 数量 | 修复 |
|------|------|------|
| `gap-2.5` | 6 | → `gap-2`（8px，取整向下） |
| `space-y-2.5` | 2 | → `space-y-2` |

### 4. 豁免项

| 类别 | 依据 |
|------|------|
| `px-1.5`/`py-0.5`/`gap-1.5` (~80处) | 规范第五节 Badge/Tag/Pill 定义 |
| `min-w-[44px] min-h-[44px]` (4处) | 布局规范触摸目标 ≥44px |
| toaster hex 色值 (12处) | 色彩规范第六节精确对照表 |
| ECharts 配置色值 | 库 API，非 Tailwind |
| `max-h-[Nvh]` 模态框 | 必须用 vh 限制高度 |
| `w-[90px] h-[32px]` MiniTrendChart | 固定尺寸 SVG |
| `w-[34px] h-[18px]` 移动端 Switch | 固定比例组件 |
| `h-[3px]` 数据条 | `rounded-sm` + `<8px` 规则允许 |

---

## 提交计划

```
commit 1: P0 — rounded-md 替换 + 单项违规修复
commit 2: P1 — inline style → Tailwind + min-w 收缩
commit 3: P2 — 列宽 fr 化 + 间距标准化
```

每批提交后运行 `npx tsc --noEmit` 验证。
