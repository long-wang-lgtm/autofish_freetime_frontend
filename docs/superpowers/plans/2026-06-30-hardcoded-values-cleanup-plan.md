# Phase 3+ 硬编码值清理实施计划

> **For agentic workers:** 使用 subagent-driven-development 逐任务执行。每任务完成后 TypeScript 编译检查。

**Goal:** 清理约 150 处硬编码值违规，分 P0→P1→P2 三批提交

**Architecture:** 机械化替换为主，P0 为圆角 Token 统一 + 单项违规修复，P1 为 inline style → Tailwind className 迁移，P2 为表格列宽 fr 化 + 间距标准化

**Tech Stack:** Next.js + React + Tailwind CSS v3 + TypeScript

---

## P0 批：rounded-md 替换 + 单项违规修复（约 99 处）

### Task 1: auth/ 模块 rounded-md → rounded-lg（9 处）

**文件：**
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`

**操作：** 两个文件中的所有 `rounded-md` → `rounded-lg`（全是表单输入框和提交按钮，属于控件级）

- LoginForm.tsx:46,65 (inputs), :79 (submit button) — 3处
- RegisterForm.tsx:54,74,94,113,140 (inputs), :168 (submit button) — 6处

**验证：** `grep -n "rounded-md" components/auth/` 返回空

---

### Task 2: accounts/ 模块 rounded-md 替换（9 处）

**文件：**
- `components/accounts/AccountCard.tsx` — :57 (textarea控件), :69 (取消按钮), :75 (确认按钮) → `rounded-lg`
- `components/accounts/AccountTable.tsx` — :62 检查 `rounded-md` → 如为模态框容器则→`rounded-xl`，如为控件则→`rounded-lg`；:88 (textarea), :96 (取消), :102 (确认) → `rounded-lg`
- `components/accounts/QrLoginModal.tsx` — :99 (按钮) → `rounded-lg`
- `components/accounts/ReviewTemplateSheet.tsx` — :199 (列表行) → `rounded-lg`
- `components/accounts/LinkManagement.tsx` — 检查 `rounded-md` 是否存在，按场景替换

**注意：** AccountTable.tsx:62 是模态框容器（`max-h-[90vh]`），应改为 `rounded-xl`

**验证：** `grep -n "rounded-md" components/accounts/` 返回空

---

### Task 3: admin/ 模块 rounded-md 替换（16 处）

**文件：**
- `app/admin/page.tsx` — :317, :328 (tab 切换按钮) → `rounded-lg`
- `app/admin/proxy/page.tsx` — 14 处全部在 form inputs/selects/buttons → `rounded-lg`

**验证：** `grep -n "rounded-md" app/admin/` 返回空

---

### Task 4: layout/ 模块 rounded-md 替换（5 处）

**文件：**
- `components/layout/Header.tsx` — :76 (header 图标), :175, :181 (dropdown 头像) → `rounded-lg`
- `components/layout/AdminLayout.tsx` — :86 (badge 图标) → `rounded-lg`
- `components/layout/SidebarBase.tsx` — :59 (toggle 按钮) → `rounded-lg`

**验证：** `grep -n "rounded-md" components/layout/` 返回空

---

### Task 5: ui/ 模块 rounded-md 替换（3 处）

**文件：**
- `components/ui/pagination.tsx` — :31, :45, :58 (分页按钮) → `rounded-lg`

**验证：** `grep -n "rounded-md" components/ui/` 返回空

---

### Task 6: items/ 模块 rounded-md 替换 — FilterBar + 表单（13 处）

**文件：**
- `components/items/FilterBar.tsx` — :64, :83, :96, :108 (inputs), :122, :139 (buttons) → `rounded-lg`
- `components/items/parts/KeywordRuleForm.tsx` — :205, :219, :227 (inputs), :309, :317, :324 (buttons) → `rounded-lg`
- `components/items/parts/SendCodeEditor.tsx` — :102 (input) → `rounded-lg`

**验证：** 确认上述文件中无 `rounded-md` 残留

---

### Task 7: items/ 模块 rounded-md 替换 — 抽屉/面板/规则（14 处）

**文件：**
- `components/items/drawers/ItemEditDrawer.tsx` — :129, :137, :259 (inputs), :304, :312 (buttons) → `rounded-lg`
- `components/items/drawers/RulesItemsingleDrawer.tsx` — :124, :167, :174 (buttons) → `rounded-lg`
- `components/items/parts/RuleBindingPanel.tsx` — :60, :111 (selects) → `rounded-lg`
- `components/items/parts/ItemCardPanel.tsx` — :53 (input) → `rounded-lg`
- `components/items/parts/IconToggle.tsx` — :25 (toggle button) → `rounded-lg`
- `components/items/rules/RuleTable.tsx` — :144, :152, :170 (buttons) → `rounded-lg`

**验证：** 确认上述文件中无 `rounded-md` 残留

---

### Task 8: items/ 模块 rounded-md 替换 — 视图卡片（6 处）

**文件：**
- `components/items/views/MobileRuleCard.tsx` — :109, :115 (buttons) → `rounded-lg`
- `components/items/RulesTab.tsx` — :136, :165 (CTA buttons) → `rounded-lg`
- `components/items/ItemsTab.tsx` — :205, :219 (filter toggles) → `rounded-lg`

**验证：** 确认上述文件中无 `rounded-md` 残留

---

### Task 9: publish/ 模块 rounded-md 替换（11 处）

**文件：**
- `components/publish/OpportunityHeader.tsx` — :147 (图片缩略图), :152 (图片占位区), :160 (输入框组), :178 (text input), :190 (textarea) → 均为控件级 → `rounded-lg`
- `components/publish/OpportunityDetailCard.tsx` — :73 (图片缩略图), :78 (图片占位区), :106 (输入框组), :120 (text input), :131 (text input), :165 (textarea) → 均为控件级 → `rounded-lg`

**验证：** `grep -n "rounded-md" components/publish/` 返回空

---

### Task 10: selection/ 模块 rounded-md 替换（5 处）

**文件：**
- `components/selection/product/ProductMonitorTab.tsx` — :540 (高亮行指示 Badge), :611 (删除按钮) → `rounded-lg`
- `components/selection/config/CollectionConfig.tsx` — :15, :48 (tab toggles) → `rounded-lg`
- `components/selection/keyword/ReportSubTabs.tsx` — :25 (sub-tab button) → `rounded-lg`

**验证：** `grep -n "rounded-md" components/selection/` 返回空

---

### Task 11: 单项违规修复（9 处）

**文件操作：**

**A. `text-[11px]` → `text-xs`（2处）**
- `components/selection/product/ProductMonitorTab.tsx:425` — status badge span
- `components/selection/product/ProductMonitorTab.tsx:432` — overflow count span

**B. `space-y-8` → `space-y-6`（2处）**
- `app/(auth)/login/page.tsx:25`
- `app/(auth)/register/page.tsx:24`

**C. `-mb-[2px]` 负 margin 消除（1处）**
- `components/ui/Tab/index.tsx:61` — 将 `-mb-[2px]` 移除，改为在父容器（TabBar wrapper）添加 `border-b-2 border-transparent`，激活 Tab 使用 `border-blue-600`。具体改动：
  - 父容器：在 buttons wrapper 上加 `border-b-2 border-gray-200`
  - 激活 Tab：保留 `border-b-2 border-blue-600`
  - 移除 `-mb-[2px]`

**D. `py-[12px]` → `py-3`（1处）**
- `components/selection/product/ProductMonitorTab.tsx:580`

**E. 裸 `rounded` → `rounded-lg`（3处）**
- `components/publish/OpportunityHeader.tsx:108,115` — title input + display
- `components/items/parts/KeywordRuleForm.tsx:196` — duration input

**F. `rounded-2xl` 小面板降级 → `rounded-xl`（2处）**
- `app/login/link/page.tsx:55` — login card container
- `app/login/link/page.tsx:65` — login form container
  注：登录卡片宽度 <600px，不符合 `rounded-2xl` 使用条件

**验证：** `npx tsc --noEmit` 通过，然后提交

---

### Task 12: P0 批提交

```bash
git add -A
git commit -m "refactor: P0 — rounded-md→rounded-lg/xl + 单项违规修复 (~99处)

- rounded-md→rounded-lg: 表单控件/按钮/图片缩略图
- rounded-md→rounded-xl: 模态框容器
- text-[11px]→text-xs, space-y-8→space-y-6
- -mb-[2px]→父容器 border 方案, py-[12px]→py-3
- 裸rounded→rounded-lg, rounded-2xl 小面板→rounded-xl
- 涉及 35+ 文件

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## P1 批：inline style → Tailwind + min-w 收缩（约 10 处）

### Task 13: admin/page.tsx inline style → className（2 处）

**文件：** `app/admin/page.tsx`

- :299 — `<div ref={trendRef} className="w-full" style={{ height: 260 }} />`
  → `<div ref={trendRef} className="w-full h-64" />`
- :304 — `<div ref={accountTrendRef} className="w-full" style={{ height: 260 }} />`
  → `<div ref={accountTrendRef} className="w-full h-64" />`

---

### Task 14: ItemsTab.tsx inline minHeight → className（2 处）

**文件：** `components/items/ItemsTab.tsx`

- :137 — `style={{ minHeight: "200px" }}` → `className` 追加 `min-h-[200px]`
- :182 — `style={{ minHeight: "200px" }}` → `className` 追加 `min-h-[200px]`

移除 `style` prop（如果只有这一个属性）。

---

### Task 15: AccountPieChart.tsx + PublishInstanceRow.tsx（3 处）

**文件：**
- `components/ui/echart/AccountPieChart.tsx:114` — `style={{ aspectRatio: '1 / 1' }}` → `className` 追加 `aspect-square`，移除 style prop
- `components/publish/PublishInstanceRow.tsx:180-185` — `style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}` → `className="line-clamp-3"`
- `components/publish/PublishInstanceRow.tsx:195-200` — 同上

---

### Task 16: FilterBar min-w-[150px] → min-w-0（3 处）

**文件：** `components/items/FilterBar.tsx`

- :57, :75, :88 — `min-w-[150px]` → `min-w-0`

这三个是桌面端筛选下拉框和输入框的外层 wrapper div。改为 `min-w-0` 配合 flex 容器允许在小屏下收缩。

---

### Task 17: P1 批提交

```bash
git add -A
git commit -m "refactor: P1 — inline style→Tailwind + min-w 收缩 (~10处)

- style={{height:260}}→h-64 (admin charts)
- style={{minHeight:200px}}→min-h-[200px] (ItemsTab)
- style={{aspectRatio}}→aspect-square (AccountPieChart)
- style={{WebkitLineClamp}}→line-clamp-3 (PublishInstanceRow)
- min-w-[150px]→min-w-0 (FilterBar 筛选框收缩)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## P2 批：列宽 fr 化 + 间距标准化（约 38 处）

### Task 18: 发布模块 12 列 → fr 体系（24 处）

**新建文件：** `components/publish/constants.ts`

```typescript
/** PublishInstance 表格列宽定义 — 12 列 fr 比例 */
export const PUBLISH_GRID_COLS = '18px 2fr 1.5fr 1.5fr 1fr 1fr 1fr 1fr 0.8fr 0.6fr 0.6fr 0.6fr'
```

对应列：复选框(18px) | 封面图 | 改写内容 | 封面策划 | 价格 | 账号 | 分类 | 进度 | 状态 | 操作 | (flexible)

**修改文件：**

`components/publish/PublishInstanceRow.tsx`:
- :81 — `min-w-[900px]` 替换为 `min-w-0`，移除所有固定列宽类
- :90 — `w-[18px]` → 用 grid 列定义控制，移除单独宽度类
- :101 — `w-[280px]` → 移除
- :177 — `min-w-[160px]` → 移除
- :192 — `min-w-[200px]` → 移除
- :207 — `w-[70px]` → 移除
- :240 — `w-[90px]` → 移除
- :265 — `w-[100px]` → 移除
- :293 — `w-[130px]` → 移除
- :304 — `w-[60px]` → 移除
- :309 — `w-[40px]` → 移除

改为在行 div 上使用 `style={{ gridTemplateColumns: PUBLISH_GRID_COLS }}`

`components/publish/PublishInstanceList.tsx`:
- 同上 12 处修改，共享 `PUBLISH_GRID_COLS` 常量
- :357 — `min-w-[900px]` → `min-w-0`

**注意：** 修改前后确保 PublishInstanceRow 和 PublishInstanceList 列对齐一致

---

### Task 19: 商品管理 grid columns → fr 比例（3 处）

**修改文件：**
- `components/items/views/ItemRow.tsx:38` — `gridTemplateColumns: "repeat(13, minmax(0, 1fr))"` → 按内容特征分配 fr 比例
- `components/items/ItemsTab.tsx:141` — 同上，保持一致

**新建常量**（放在 ItemRow.tsx 顶部或 lib/constants/ 下）：
```typescript
export const ITEMS_GRID_COLS = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'
```
（首列（商品标题）分配 2fr 更宽，其余列等宽 1fr）

---

### Task 20: 非标准间距标准化（8 处）

**gap-2.5 → gap-2（6处）：**
- `components/layout/Header.tsx:144,157` — user menu items（lg breakpoint）
- `components/layout/AdminLayout.tsx:136` — admin sidebar logout
- `components/accounts/LinkManagement.tsx:129` — link CTA button
- `components/publish/OpportunityHeader.tsx:89` — header action bar
- `components/items/FilterBar.tsx:291` — filter dropdown grid

**space-y-2.5 → space-y-2（2处）：**
- `components/items/FilterBar.tsx:290` — filter dropdown wrapper
- `components/items/ItemsTab.tsx:182` — mobile item list

---

### Task 21: P2 批提交与最终验证

```bash
# 提交 P2
git add -A
git commit -m "refactor: P2 — 列宽 fr 化 + 间距标准化 (~38处)

- 发布模块: 12列 w-[Npx]→fr 比例, 提取 PUBLISH_GRID_COLS 常量
- 商品管理: repeat(13,1fr)→非等宽 fr 比例
- gap-2.5→gap-2, space-y-2.5→space-y-2
- 新建 components/publish/constants.ts

Co-Authored-By: Claude <noreply@anthropic.com>"

# 最终验证
npx tsc --noEmit
```

---

## 全量验证清单

P0/P1/P2 全部完成后：

- [ ] `grep -rn "rounded-md" components/ app/ --include="*.tsx"` 返回空
- [ ] `grep -rn "text-\[11px\]" components/ app/ --include="*.tsx"` 返回空
- [ ] `grep -rn "rounded " components/ app/ --include="*.tsx"` 无裸 rounded（排除 rounded-lg/xl/2xl/full/none/sm）
- [ ] `grep -rn "space-y-8" app/ --include="*.tsx"` 返回空
- [ ] `grep -rn "\-mb-\[" components/ app/ --include="*.tsx"` 返回空
- [ ] `grep -rn "py-\[12px\]" components/ app/ --include="*.tsx"` 返回空
- [ ] `grep -rn "style={{ height:" app/ --include="*.tsx"` 确认无残留（admin page 已迁移）
- [ ] `grep -rn "style={{ minHeight:" components/items/ --include="*.tsx"` 确认无残留
- [ ] `grep -rn "WebkitLineClamp" components/ --include="*.tsx"` 确认无残留
- [ ] `grep -rn "min-w-\[150px\]" components/items/FilterBar.tsx` 返回空
- [ ] `grep -rn "min-w-\[900px\]" components/publish/` 返回空
- [ ] `npx tsc --noEmit` 零错误
