# 移动端顶部布局改造设计

> 日期：2026-06-24 | 方案：纯 CSS 定位调整，不动数据流

## 目标

移动端将顶部空间重新分配——Tab 导航占据视口顶部，Header 退到右上角浮动。

```
移动端布局目标：
┌──────────────────────────────┐
│  tab1  tab2  tab3  →滑动  [逸][管]│  ← TabBar sticky top-0，Header absolute 右上角
│  🔍 搜索 / 子标签 / 筛选       │  ← 页面自有内容，紧接 tab 行
├──────────────────────────────┤
│                              │
│  卡片内容区 (pt-0)            │
│                              │
└──────────────────────────────┘
           右下角 FAB → Sidebar 滑入（不变）
```

---

## 1. Header.tsx — 移动端退到右上角

### 改动

| 属性 | PC（不变） | 移动端（新） |
|------|-----------|-------------|
| 定位 | 正常文档流，`flex-shrink-0` | `absolute top-0 right-0` |
| z-index | — | `z-20`（高于内容，低于下拉面板） |
| 宽度 | `w-full` | `w-auto`（内容撑开） |
| 高度 | `h-11 lg:h-14` | `h-auto`，由内部小方块撑开 |
| children | 渲染在中间区域 | 不渲染（移动端 Header 不再承载页面级内容） |
| 品牌区 | Logo 方块 + "闲逸通"/"逸" | Logo 方块变小，点击 → 管理员页（仅管理员可见） |
| 管理员按钮 | 独立按钮（盾牌图标） | **移除**，入口移入下拉菜单 |
| 用户区 | 头像 + 用户名 + 下拉箭头 | 仅头像单字 + 下拉箭头(可选) |
| 背景/边框 | `bg-white border-b shadow-sm` | 无背景、无边框（透明浮动） |

### 下拉菜单新增项

在「设置」上方插入「管理员」（仅 `role === 'administrators'` 显示）：

```
┌──────────────┐
│  用户名       │
│  角色标签     │
├──────────────┤
│ 🛡 管理员    │  ← 新增，仅管理员可见
│ ⚙ 设置      │
│ 🚪 退出登录  │
└──────────────┘
```

### 细化

- 两个小方块（Logo + 头像）水平排列，间距 `gap-1.5`
- Logo 方块：`w-7 h-7` 圆角小方块，品牌色背景 + 闪电图标
- 头像方块：`w-7 h-7` 圆形，渐变蓝底 + 用户名单字
- 点击 Logo → `router.push('/admin')`（仅管理员）
- 点击头像 → toggle 下拉菜单
- 两个方块都有 `min-h-11` 触摸热区

---

## 2. DashboardLayout — 释放 Header 占位

### 改动

```tsx
// 移动端右侧区域不再被 Header 挤占
<div className="flex-1 min-w-0 flex flex-col">
  {/* Header 改为 absolute，不占文档流 */}
  <Header />
  
  {/* 内容区 pt-0 在移动端 */}
  <main className="flex-1 min-h-0 p-4 lg:p-6 max-lg:pt-0 max-lg:px-0 overflow-auto">
    {children}
  </main>
</div>
```

注意：移动端 `min-h-0` 不要丢，否则 flex 子元素无法收缩。

---

## 3. TabBar — sticky 贴顶 + 横向滑动

### 改动

- TabBar 文件位置不变（`components/ui/Tab/index.tsx`）
- 页面负责包裹 sticky 容器，**不修改 TabBar 组件本身**
- `overline` 变体自然适合贴顶（已有 `border-b`）

### 页面用法

```tsx
{/* 移动端 sticky 贴顶，PC 端正常流 */}
<div className="sticky top-0 z-10 bg-white">
  <TabBar
    tabs={[...]}
    activeTab={activeTab}
    onTabChange={...}
    variant="overline"
  />
</div>
```

- `sticky top-0`：滚动时 tab 行保持可见
- `z-10`：高于内容区，低于 Header（z-20）
- `bg-white`：防止内容透过
- TabBar 已有的 `overflow-x-auto hide-scrollbar` 支持横向滑动

### 与 Header 的空间竞争

移动端 tab 行右侧要给 Header 留空：

```
┌──────────────────────────────┐
│  tab1  tab2  tab3  tab4  →   │  ← tabs 容器 mr-14（给 Header 留空间）
│                           ┌──┤
│                          │逸│管│  ← Header absolute right-0 top-0
└──────────────────────────────┘
```

方案：tab sticky 容器的 tabs 列表加 `pr-14`（约 56px = 两个 28px 方块 + 间距），确保长 tab 列表不会滑到 Header 小方块下面。

---

## 4. 各页面适配

### items/page.tsx
- TabBar 外包裹 `<div className="sticky top-0 z-10 bg-white">`
- 移除 `space-y-5` 中的顶部间距，改为移动端用 `space-y-3`

### settings/page.tsx
- 同上

### publish/page.tsx
- 同上（如果有 TabBar）

### selection/page.tsx
- 同上（如果有 TabBar）

### accounts/page.tsx（无 TabBar）
- 无需改动。页面标题/内容从顶部开始，Header 浮动右上角，互不干扰。

---

## 5. 影响范围

| 文件 | 改动类型 | 风险 |
|------|---------|------|
| `components/layout/Header.tsx` | 重写移动端渲染分支 | 低（纯 CSS + 条件渲染） |
| `app/dashboard/layout.tsx` | 移动端 main 的 padding | 低 |
| `app/dashboard/items/page.tsx` | 加 sticky wrapper | 低 |
| `app/dashboard/settings/page.tsx` | 加 sticky wrapper | 低 |
| `app/dashboard/publish/page.tsx` | 如需要，加 sticky wrapper | 低 |
| `app/dashboard/selection/page.tsx` | 如需要，加 sticky wrapper | 低 |
| `.claude/rules/frontend-mobile-layout.md` | 新增规范文档 | — |
| `CLAUDE.md` | 新增引用 | — |

## 6. 验收

- [ ] PC 端布局与改造前完全一致
- [ ] 移动端 Header 浮动右上角，不占整行
- [ ] 移动端 TabBar 贴顶，横向可滑动，右侧不被 Header 遮挡
- [ ] 无 TabBar 的页面（如账号管理）顶部正常
- [ ] 管理员入口在移动端下拉菜单中可见
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run build` 成功
