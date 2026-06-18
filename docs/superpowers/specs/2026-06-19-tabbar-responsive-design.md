# TabBar 响应式优化设计

> 2026-06-19 · 优化 TabBar 组件响应式设计，适配 PC、移动端竖屏、移动端横屏

## 背景

TabBar 组件（`components/ui/Tab/index.tsx`）当前有两个变体 `overline` 和 `inset`，均在 PC 端设计，无响应式断点。移动端直接等比例缩放导致 tab 栏垂直空间占比过大（`py-3` + `text-base` ≈ 48px 高），在 375px 宽竖屏手机上视觉过重。

同时 settings 页面使用内联 tab 栏代码，与 TabBar 组件的 `overline` 变体功能完全相同但未复用。

## 设计目标

1. TabBar 内部自动检测屏幕尺寸和方向，无需父页面传 prop
2. 三档响应式尺寸：PC / 横屏手机 / 竖屏手机
3. 移动端 tab 超出时横向滚动 + 渐变遮罩提示
4. 视觉语言与 PC 保持一致（底部指示线 + 品牌色）
5. settings 页面迁移为复用 TabBar 组件

## 三档响应式规格

| 档位 | 检测条件 | padding | 字号 | 字重 | 间距 | 布局 |
|------|----------|---------|------|------|------|------|
| PC | `≥ 768px` | `py-3 px-5` | `text-base` | `font-semibold` | `gap-0` | 水平排列 |
| 横屏手机 | `isMobile && isLandscape` | `py-2 px-4` | `text-sm` | `font-semibold` | `gap-1` | 横向滚动 + 渐变遮罩 |
| 竖屏手机 | `isMobile && !isLandscape` | `py-1.5 px-3` | `text-xs` | `font-semibold` | `gap-1` | 横向滚动 + 渐变遮罩 |

## 实现方案

### 1. 内部尺寸检测

```ts
// TabBar 内部
const isMobile = useIsMobile()                           // max-width: 767px
const isLandscape = useMediaQuery('(orientation: landscape)')

// 横屏手机：mobile + landscape（如 iPhone SE 横屏 667px）
// 竖屏手机：mobile + portrait
// 手机横屏 ≥ 768px 时（如 iPhone 14 横屏 844px），useIsMobile 返回 false，走 PC 档 — 宽度足够
```

使用 CSS media query 判定方向，避免 hydration 不匹配。`orientation` 由浏览器根据宽高比自动判定，无需手动比较 width/height。

### 2. 移动端滚动容器

- 外层 `overflow-x-auto` + 隐藏滚动条（`scrollbar-hide` 或 `-webkit-scrollbar` hidden）
- 左右两侧 CSS 渐变遮罩（`mask-image: linear-gradient(...)`），仅在可滚动方向显示
- 底部指示线 `border-b-2` 在所有尺寸保持不变

### 3. 渐变遮罩

```css
/* 右侧渐变提示可滑动 */
mask-image: linear-gradient(to right, black 85%, transparent 100%);
-webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
```

### 4. settings 页面迁移

- 删除 settings/page.tsx 中内联的 tab 栏代码（约 15 行）
- 替换为 `<TabBar tabs={MAIN_TABS} activeTab={activeMainTab} onTabChange={setActiveMainTab} variant="overline" />`
- 调整 `MAIN_TABS` 类型以匹配 TabBar 的 `{ key, label, icon? }` 接口（当前 icon 是 string emoji，TabBar 的 icon 是 ReactNode —— 需统一为 ReactNode）

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
| `components/ui/Tab/index.tsx` | 核心改动：添加响应式逻辑、三档样式、滚动容器 |
| `hooks/useIsMobile.ts` | 不修改（复用现有 hook） |
| `hooks/useMediaQuery.ts` | 不修改（复用现有 hook） |
| `app/dashboard/settings/page.tsx` | 内联 tab 栏替换为 TabBar 组件 |
| `app/dashboard/items/page.tsx` | 无改动（接口不变） |
| `app/dashboard/selection/page.tsx` | 无改动（接口不变） |
| `app/dashboard/publish/page.tsx` | 无改动（接口不变） |

## 非目标

- 不改变 PC 端现有视觉效果
- 不修改 `inset` 变体的 PC 端行为（当前仅 selection 页面未使用 inset，但保留变体完整性）
- 不引入新的外部依赖
- 不在 TabBar 上增加任何 prop
