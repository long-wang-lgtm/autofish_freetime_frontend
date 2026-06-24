# 移动端布局设计规范

> 参考：闲鱼 / 淘宝 / 微信等主流 app 的顶部布局模式

## 核心原则

### 1. 空间重分配：顶栏从独占一行退到角落

PC 端 Header 占一整行是合理的（屏幕宽、空间充裕）；移动端屏幕窄，顶部是最珍贵的空间，Header 应退让给导航和内容。

- **PC 端**：Header `w-full` 独立一行，品牌名 + 面包屑/操作区 + 管理入口 + 用户信息
- **移动端**：Header `absolute top-0 right-0`，只保留 2 个小方块（Logo 图标 + 用户头像单字），不占文档流

### 2. Tab 导航贴顶

移动端 tab 切换栏作为页面第一行内容，`sticky top-0` 贴顶：

```
┌──────────────────────────────┐
│  tab1  tab2  tab3  (→滑动)  │  ← sticky top-0, z-10
│  🔍 搜索 / 筛选 / 子标签     │
├──────────────────────────────┤
│  内容区                       │
```

- tab 行使用 `overflow-x-auto hide-scrollbar` 支持横向滑动
- tab 行右侧预留空间（`pr-14` ≈ 56px），防止被 Header 浮动小方块遮挡
- 无 tab 的页面不需要这层，内容直接从顶部开始

### 3. 三层 z-index 层级

```
z-30  ← 遮罩层 / Modal / 下拉面板
z-25  ← Sidebar 侧边栏
z-20  ← Header 浮动小方块（absolute 右上角）
z-10  ← TabBar sticky 贴顶行
z-0   ← 页面正文内容
```

### 4. 导航不变，侧边栏保持

- Sidebar 仍是唯一的一级导航入口（账号管理 / 商品管理 / 商品发布 / 选品监控 / 设置）
- 移动端 Sidebar 通过右下角 FAB 按钮触发，从右侧滑入
- TabBar 是**二级导航**——进入某个一级页面后的内部 tab 切换

### 5. 内容区从顶部开始

移动端 `main` 容器不再有顶部 padding：

```tsx
<main className="flex-1 min-h-0 p-4 lg:p-6 max-lg:pt-0 max-lg:px-0 overflow-auto">
```

页面自行管理顶部间距——有 TabBar 的页面 tab 行自带间距，无 TabBar 的页面自己加 `pt-4`。

## 组件适配

### Header

移动端变为浮动小方块组合：

| 要素 | PC 端 | 移动端 |
|------|-------|--------|
| 容器 | `w-full h-11/lg:h-14` 文档流 | `absolute top-0 right-0 z-20` 脱离文档流 |
| 品牌/Logo | 闪电方块 + "闲逸通" | 仅闪电小方块 `w-7 h-7`，点击 → 管理员页 |
| 管理员按钮 | 独立盾牌按钮 | **移除**，入口移入下拉菜单 |
| 用户区 | 头像 + 用户名 + 下拉箭头 | 仅头像单字 `w-7 h-7`，点击 → 下拉菜单 |
| children | 渲染在中间 | 不渲染 |
| 背景 | `bg-white border-b shadow-sm` | 透明无边框 |
| 触摸热区 | — | 每个方块 `min-h-11 min-w-11` |

### 下拉菜单

移动端下拉菜单比 PC 端多一项「管理员」入口（仅管理员可见），排在「设置」上方：

```
用户信息（名称 + 角色）
────────────
🛡 管理员    ← 新增，仅 role === 'administrators'
⚙ 设置
🚪 退出登录
```

### TabBar

不修改组件本身。页面使用时自行包裹 sticky 容器：

```tsx
<div className="sticky top-0 z-10 bg-white">
  <TabBar
    tabs={[...]}
    activeTab={activeTab}
    onTabChange={...}
    variant="overline"
  />
</div>
```

- TabBar 已有的 `overline` 变体自带 `border-b`，适合贴顶
- TabBar 已有的响应式尺寸（pc / landscape-mobile / portrait-mobile）继续生效
- 多个 tab 空间不足时自动横向滑动（`overflow-x-auto`）

### 搜索栏 / 子标签 / 筛选栏

这些是页面级内容，放在 TabBar 下方、卡片上方，由各页面自行管理。

## 反模式

- **移动端 Header 继续占一整行**——浪费顶部黄金空间
- **tab 栏和 Header 争抢同一行空间**——tab 右侧不应被 Header 遮挡（用 `pr-14` 预留）
- **sticky tab 没有 bg-white**——滚动时下方内容透过 tab 行
- **z-index 混乱**——tab sticky、Header absolute、Sidebar/Dropdown 的层级要分层明确
- **移动端 main 有顶部 padding**——释放 Header 后顶部的 padding 应移除
- **在 TabBar 组件内部耦合 sticky 逻辑**——sticky 是页面布局关注点，不是 TabBar 自身职责
