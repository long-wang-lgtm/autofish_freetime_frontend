# TabBar 响应式优化设计

> 2026-06-19 · 优化 TabBar 组件响应式设计，适配 PC、移动端竖屏、移动端横屏

## 背景

TabBar 组件（`components/ui/Tab/index.tsx`）当前有两个变体 `overline` 和 `inset`，均在 PC 端设计，无响应式断点。移动端直接等比例缩放导致 tab 栏垂直空间占比过大（`py-3` + `text-base` ≈ 48px 高），在 375px 宽竖屏手机上视觉过重。

同时 settings 页面使用内联 tab 栏代码，与 TabBar 组件的 `overline` 变体功能完全相同但未复用。

## 设计目标

1. TabBar 内部自动检测屏幕尺寸和方向，无需父页面传 prop
2. 三档响应式尺寸：PC / 横屏手机 / 竖屏手机
3. 移动端 tab 超出时横向滚动 + 右渐变遮罩提示可滑动
4. 视觉语言与 PC 保持一致（底部指示线 + 品牌色）
5. settings 页面迁移为复用 TabBar 组件

## 三档响应式规格

| 档位 | 检测条件 | padding | 字号 | 字重 | 按钮间距 | 布局 |
|------|----------|---------|------|------|----------|------|
| PC | `!isMobile` (≥ 768px) | `py-3 px-5` | `text-base` | `font-semibold` | `gap-0` | 水平排列 |
| 横屏手机 | `isMobile && isLandscape` | `py-2 px-4` | `text-sm` | `font-semibold` | `gap-1` | 横向滚动 + 右渐变遮罩 |
| 竖屏手机 | `isMobile && !isLandscape` | `py-1.5 px-3` | `text-xs` | `font-semibold` | `gap-1` | 横向滚动 + 右渐变遮罩 |

"按钮间距"指 tab 按钮之间的水平间距（外层 flex 容器的 `gap`），不改变按钮内部 icon-label 间距（保持 `gap-1.5`）。

### 已接受的权衡

- **767/768px 一像素差异**：`useIsMobile` 断点在 767px（即 `< 768px`），而 `publish/page.tsx` 使用 `max-width: 768px`。在恰好 768px 宽的视口上，TabBar 显示 PC 布局而 publish 页面其他部分可能视为移动端。差异仅 1px，可接受。
- **竖屏触摸目标约 28px 高**（`py-1.5` + `text-xs` line-height）：低于 WCAG 建议的 44px，但用户已确认选择该尺寸。tab 按钮之间留有合理间距（`gap-1` = 4px）减少误触。
- **双重 hydration 闪烁**：`useIsMobile()` 和 `useMediaQuery()` 均初始化为 `false`，SSR/首屏渲染时先显示 PC 布局，`useEffect` 后修正。这是项目所有响应式页面的既有模式，本次不改动。TabBar 在 `useEffect` 执行前的 PC 布局不会导致页面抖动（高度变化在几个像素内）。

## 实现方案

### 1. 内部尺寸检测

```ts
// TabBar 内部
const isMobile = useIsMobile()                           // max-width: 767px
const isLandscape = useMediaQuery('(orientation: landscape)')

// 横屏手机：isMobile && isLandscape（如 iPhone SE 横屏 667px）
// 竖屏手机：isMobile && !isLandscape
// 手机横屏 ≥ 768px 时（如 iPhone 14 横屏 844px），isMobile 返回 false，走 PC 档
```

`orientation` media query 由浏览器根据宽高比自动判定。软键盘弹出时 viewport 高度缩小可能导致 landscape 变 portrait — 此时用户正在输入，不影响 tab 栏使用，可接受的边缘情况。

### 2. 移动端滚动容器

- 外层容器 `overflow-x-auto` + 自定义隐藏滚动条样式
- 右边缘 CSS mask 渐变遮罩（`transparent` 收尾），提示内容可向右滑动
- tab ≤ 2 个且宽度不溢出时，渐变遮罩仍然存在但不影响视觉效果（最后 15% 才淡出，tab 内容在 85% 以内完全可见）
- 底部指示线 `border-b` + `border-b-2` + `-mb-[1px]` 在所有尺寸保持不变

### 3. 滚动条隐藏

项目已有 `styles/globals.css` 中的 `.custom-scrollbar`（`scrollbar-width: thin`，hover 时显示滑块）。TabBar 移动端不使用该类 — 改为用内联 style 或自定义 class 完全隐藏滚动条，因为 tab 栏下方显示滑块不美观：

```css
/* TabBar 移动端容器 — 隐藏滚动条，跨浏览器 */
.tab-scroll-container::-webkit-scrollbar {
  display: none;           /* Chrome/Safari/Edge */
}
.tab-scroll-container {
  scrollbar-width: none;   /* Firefox */
  -ms-overflow-style: none; /* IE/旧 Edge */
}
```

### 4. 右渐变遮罩

```css
/* 右侧渐变提示可滑动 */
mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
-webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
```

渐变仅在最后 32px 淡出。tab 内容占据的空间始终 100% 不透明。如果所有 tab 宽度总和小于容器宽度（没有溢出），渐变在空白区域淡出，不影响 tab 文字可读性。

### 5. settings 页面迁移

**文件：`app/dashboard/settings/page.tsx`**

改动：
1. 导入 `TabBar`：`import { TabBar } from '@/components/ui/Tab'`
2. 调整 `MAIN_TABS` 中的 `icon` 类型从 `string` 改为 `ReactNode`（`string` 本身 extends `ReactNode`，但显式标注更清晰，且将 emoji 包裹为 `<span>` 与 TabBar 渲染一致）
3. 删除内联 tab 栏代码（`<div className="flex items-center gap-0 border-b ...">` 块），替换为：
   ```tsx
   <TabBar
     tabs={MAIN_TABS}
     activeTab={activeMainTab}
     onTabChange={(key) => setActiveMainTab(key as MainTabType)}
     variant="overline"
   />
   ```
4. **保留** `const isMobile = useIsMobile()` — AIConfigTab 和 NotificationTab 仍然需要它

**迁移注意事项：**
- `onTabChange` 回调需要 `key as MainTabType` 类型断言，因为 TabBar 的 `onTabChange` 签名是 `(key: string) => void`，而 `setActiveMainTab` 期望 `MainTabType`
- `MAIN_TABS` 可以保留 emoji 字面量（`'🤖'`），`string` 是 `ReactNode` 的子类型，TypeScript 不会报错
- TabBar 渲染 icon 时使用 `{tab.icon && tab.icon}`，字符串 emoji 为 truthy，渲染正常

## 接口不变

```ts
// TabBar props 完全不改
interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
  variant?: TabVariant  // 'inset' | 'overline'
}
```

## 影响范围

| 文件 | 改动 |
|------|------|
| `components/ui/Tab/index.tsx` | 核心改动：添加 useIsMobile/useMediaQuery、三档样式、滚动容器+渐变遮罩、隐藏滚动条 |
| `styles/globals.css` | 添加 `.tab-scroll-container` 滚动条隐藏样式（或写在 Tab 组件 inline） |
| `app/dashboard/settings/page.tsx` | 内联 tab 栏替换为 `<TabBar>`，保留 `useIsMobile()` |
| `hooks/useIsMobile.ts` | 不修改 |
| `hooks/useMediaQuery.ts` | 不修改 |
| `app/dashboard/items/page.tsx` | 无改动（接口不变） |
| `app/dashboard/selection/page.tsx` | 无改动（接口不变） |
| `app/dashboard/publish/page.tsx` | 无改动（接口不变） |

## 非目标

- 不改变 PC 端现有视觉效果
- 不修改 `inset` 变体（当前无页面使用 `inset`，但保留以备将来使用；`inset` 变体也获得响应式检测但 PC 端行为不变）
- 不引入新的外部依赖（包括 Tailwind 插件）
- 不在 TabBar 上增加任何 prop
- 不修复 TabBar 源码中关于 `inset` 的注释（"selection风格" — 实际 selection 页面使用 overline，但该注释修复超出本次范围）
