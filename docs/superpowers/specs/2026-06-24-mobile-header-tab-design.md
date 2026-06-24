# 移动端顶部布局改造设计

> 日期：2026-06-24 | 方案：纯 CSS 定位调整，不动数据流、不引入新状态管理

## 目标

移动端将顶部空间重新分配——Tab 导航占据视口顶部，Header 退到右上角。

```
移动端布局：
┌──────────────────────────────┐
│  tab1  tab2  tab3  →滑动  [U][逸]│  TabBar sticky top-0 + Header absolute 右上角
│  🔍 搜索 / 筛选               │  页面自有内容
├──────────────────────────────┤
│  卡片内容区 (pt-0)            │
└──────────────────────────────┘
PC 端布局不变。
```

---

## 1. Header.tsx — 移动端退到右上角

- 移动端：`absolute top-0 right-0 z-20`，脱离文档流，透明无背景
- 只渲染两个小方块：用户头像单字（`w-7 h-7`） + Logo 图标（`w-7 h-7`），水平排列
- Logo 方块点击 → 跳转管理员页（仅 `role === 'administrators'`）
- 管理员按钮从独立位置**移除**，入口移入下拉菜单（排在「设置」上方）
- 移动端不渲染 `children` slot
- 两个方块各自 `min-h-11 min-w-11` 触摸热区
- PC 端行为完全不变

## 2. DashboardLayout — 释放 Header 占位

移动端 main 容器移除顶部 padding：
```tsx
<main className="flex-1 min-h-0 p-4 lg:p-6 max-lg:pt-0 max-lg:px-0 overflow-auto">
```

## 3. TabBar — sticky 贴顶包装

- TabBar 组件本身不改动，文件位置不变
- 各页面自行包裹 sticky 容器：

```tsx
<div className="sticky top-0 z-10 bg-white pr-14">
  <TabBar tabs={...} activeTab={...} onTabChange={...} variant="overline" />
</div>
```

- `pr-14` 预留 Header 小方块空间（~56px），防止 tab 被遮挡
- `z-10` 低于 Header 的 `z-20`

## 4. 各页面适配

| 页面 | 改动 |
|------|------|
| items/page.tsx | TabBar 外包裹 sticky div |
| settings/page.tsx | 同上 |
| publish/page.tsx | 同上（如有 TabBar） |
| selection/page.tsx | 同上（如有 TabBar） |
| accounts/page.tsx | 无 TabBar，无需改动 |

## 5. z-index 层级

```
z-30  ← 遮罩 / Modal / 下拉面板
z-25  ← Sidebar
z-20  ← Header 浮动小方块
z-10  ← TabBar sticky
z-0   ← 页面内容
```

## 6. 影响文件

| 文件 | 改动类型 |
|------|---------|
| `components/layout/Header.tsx` | 重写移动端渲染分支 |
| `app/dashboard/layout.tsx` | 移动端 main padding |
| `app/dashboard/items/page.tsx` | 加 sticky wrapper |
| `app/dashboard/settings/page.tsx` | 加 sticky wrapper |

## 7. 验收

- [ ] PC 端布局与改造前一致
- [ ] 移动端 Header 浮动右上角，不占整行
- [ ] 移动端 TabBar 贴顶，横向可滑动
- [ ] 管理员入口在移动端下拉菜单中可见
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run build` 成功
