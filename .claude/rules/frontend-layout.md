# PC/移动端布局铁律

> 参考实现：`frontend/app/dashboard/settings/page.tsx`（Tab 内外分层）、`frontend/app/dashboard/publish/page.tsx`（左右分栏+ResizableDivider）

## 一、PC 端布局铁律

### 1. 页面顶级容器统一

所有 Tab 页面使用 `flex flex-col gap-5 h-full`，非 Tab 页面使用 `space-y-5`。

| 页面类型 | 顶级容器 | 示例 |
|----------|----------|------|
| Tab 页面（items / selection / publish） | `flex flex-col gap-5 h-full` | `frontend/app/dashboard/selection/page.tsx` |
| 非 Tab 单页（settings / accounts） | `space-y-5` | `frontend/app/dashboard/settings/page.tsx` |

**正确示例**（selection/page.tsx）：
```tsx
<div className="flex flex-col gap-5 h-full">
  <TabBar ... />
  {activeTab === 'product' && <ProductMonitorTab />}
</div>
```

**反例**（items/page.tsx 当前写法）：
```tsx
<div className="flex flex-col min-h-0 h-full space-y-5">
  {/* space-y-5 与 gap-5 不一致 */}
</div>
```

### 2. Header 区域统一位置

TabBar + 筛选栏 + 排序栏统一放在页面顶级容器内、内容卡片外部。不允许在内容卡片内部嵌套过滤控件。

**正确**（selection/page.tsx）：TabBar 和设置按钮在页面顶级 flex row 中，内容卡片在下方。

**反例**：FilterBar 放到了 ItemsTab 内容卡片内部（`frontend/components/items/ItemsTab.tsx` 第 78 行），导致卡片圆角与内部控件视觉冲突。

### 3. 禁止负 margin hack

严禁使用 `-mt-3`、`-ml-2` 等负 margin 来微调间距。如需减小间距，应调整上方元素的 margin-bottom 或容器 gap。

**反例**（items/page.tsx 第 49 行）：
```tsx
<p className="text-sm text-gray-500 -mt-3 hidden md:block">
```
应改为：将描述文字放入 TabBar 下方 gap 内，或使用 `mt-1` 正间距。

### 4. 内容卡片统一外壳

所有内容卡片使用统一的容器样式：

```tsx
<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
```

不允许混用 `rounded-lg`（ItemsTab 第 78 行）或 `rounded-md`。

### 5. 卡片内边距三档

| 档位 | 用法 | 示例位置 |
|------|------|----------|
| `p-6` | 页面级大卡片 | 设置页主卡片 |
| `p-4` | 区域级中卡片 | FilterBar、工具栏 |
| `p-3` | 紧凑级小卡片/表格行 | 表头行、筛选行 |

禁止使用 `p-2`、`p-3.5`、`p-5`、`px-4 py-2`、`px-5 py-4` 等非标准值。

### 6. 表格列宽：fr 显式比例，禁止 repeat(N, 1fr)

CSS Grid 表格列宽必须使用明确的 `fr` 比例，根据内容特征分配不同宽度。

**正确**（ProductMonitorTab 第 81 行）：
```tsx
const GRID_COLS = '3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr 2fr 2fr 40px'
```

**反例**（ItemsTab 第 121 行）：
```tsx
style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
```
13 列等宽导致"商品信息"列（col-span-2）与其他单列内容宽度比例失衡。

### 7. 左右分栏必须支持拖拽

所有左右分栏的页面必须使用 `ResizableDivider`（`frontend/components/publish/ResizableDivider.tsx`）支持拖拽调整宽度，并将宽度持久化到 localStorage。

**参考实现**（publish/page.tsx）：商机库与发布工作区的左右分栏。

### 8. 分页组件收敛为公共组件

分页组件不应在多个页面中重复定义。当前 admin 4 个页面（`admin/page.tsx`、`admin/users/page.tsx`、`admin/accounts/page.tsx`、`admin/proxy/page.tsx`）各自定义了相同的 `Pagination` 函数。

应提取为 `components/ui/pagination.tsx`，统一复用。

### 9. 分割线只用 border-gray-100

卡片内部的 section 分割线统一使用 `border-gray-100`，不用 `border-gray-200` 或更重。

## 二、移动端布局铁律

### 1. 所有数据表格必须有移动端卡片视图

桌面端的 `<table>` / CSS Grid 表格在移动端必须有对应的卡片视图，不可仅靠横向滚动。

**正确**（ItemsTab）：桌面端 `<ItemRow>` + 移动端 `<MobileProductCard>`（`frontend/components/items/views/MobileProductCard.tsx`）。

**反例**（ProductMonitorTab 第 489 行）：`min-w-[1400px]` 硬编码最小宽度，移动端完全不可用，无卡片降级方案。

### 2. 移动端检测统一使用 useIsMobile()

项目存在 3 种移动端检测实现：
- `useIsMobile()` — `frontend/hooks/useIsMobile.ts`（CSS matchMedia，正确方式）
- `useMediaQuery()` — `frontend/hooks/useMediaQuery.ts`（通用版，保留给特殊断点）
- `window.innerWidth` — `frontend/app/dashboard/accounts/page.tsx` 第 27 行（**反模式**，有 hydration 不匹配风险）

**铁律**：所有页面/组件的移动端判断统一使用 `useIsMobile()`。横屏手机宽度 ≥ 768px 自动走 PC 布局，不单独维护第 3 套横屏移动端布局。`useMediaQuery` 仅用于非移动端检测场景（如 `prefers-color-scheme`）。禁止直接读取 `window.innerWidth`。

### 3. 触摸目标最小 44x44px

所有可点击元素（按钮、链接、开关、菜单项）的最小触摸区域为 44x44px。Header.tsx 已正确实现（`max-lg:min-h-11`），其他组件应遵循。

**反例**：ProductMonitorTab 中的状态 badge（`px-1.5 py-0.5 text-[9px]`）触摸区域远小于 44px。

### 4. 弹窗/抽屉统一使用 Sheet/BottomSheet

移动端所有弹窗和抽屉使用 `Sheet` 组件（`frontend/components/ui/Sheet.tsx`），该组件自动根据 `useIsMobile()` 切换为底部弹出（BottomSheet）。

**参考**：`frontend/components/selection/product/ProductDiagnosticDrawer.tsx` 同时导入了 `Sheet` 和 `BottomSheet`。

### 5. 侧边栏从左侧滑出，汉堡菜单在 Header 内

**当前问题**（`frontend/components/layout/Sidebar.tsx`）：
- 移动端侧边栏从**右侧**滑入（第 296 行：`fixed top-0 right-0`）
- 用右下角 FAB 浮动按钮触发（第 332 行）
- FAB 支持拖拽（不必要的复杂度）

**应改为**：
- 侧边栏从**左侧**滑入（`fixed top-0 left-0`）
- 汉堡菜单按钮移入 Header 左侧
- 删除 FAB 拖拽逻辑

### 6. 底部固定元素必须加 safe-area-inset-bottom

所有固定在页面底部的元素（底部导航栏、BottomSheet、操作栏）必须添加：

```css
padding-bottom: env(safe-area-inset-bottom, 0px);
```

### 7. 五页面移动端布局模式

根据各页面内容特征，移动端采用不同布局模式（不强制统一为卡片）：

| 页面 | 移动端模式 | 说明 |
|------|-----------|------|
| 账号管理 | 紧凑监控卡 | 高密度开关状态，参考 `AccountCard` |
| 商品管理 | 自适应卡 + 渐进展开 | `MobileProductCard` 方向正确，继续完善 |
| 商品发布 | Push/Pop 导航栈 | 替代当前的 `MobileTabView` 底部 Tab（`frontend/components/publish/MobileTabView.tsx`），改用顶部返回+推入导航 |
| 选品监控 | 焦点卡片 + KPI 面板 + 横屏兜底 | 一行一个商品的焦点卡片，顶部 KPI 摘要，横屏时显示简化表格 |
| 设置页 | iOS 风格分组卡片 | 参考 `settings/page.tsx`，各配置项分组卡片 |

### 8. 移动端不使用自定义底部 Tab

`frontend/components/publish/MobileTabView.tsx` 在移动端使用自定义底部 Tab 切换"商机库/创作发布"，与桌面端顶部的 `TabBar` 不一致。应改为 Push/Pop 导航（从商机列表点入 -> 推入创作发布页）。

## 反模式

- 页面顶级容器不用 `flex flex-col gap-5 h-full` 而用 `space-y-5` / `space-y-4`
- 使用 `-mt-3`、`-ml-2` 等负 margin 微调间距
- 内容卡片混用 `rounded-lg` / `rounded-md`
- 表格列宽用 `repeat(N, 1fr)` 等宽列
- 分页组件在多个页面中内联重复定义
- 移动端检测直接读取 `window.innerWidth`
- 触摸目标小于 44x44px
- 数据表格移动端无卡片视图，仅靠横向滚动
- 侧边栏从右侧滑出（应为左侧）
- 使用 FAB 浮动按钮触发侧边栏（应移入 Header）
- 底部固定元素未加 `safe-area-inset-bottom`

## 验证命令

```bash
# 查找页面顶级容器不规范的用法
rg 'space-y-4' app/dashboard/ --type tsx

# 查找负 margin hack
rg -- '-mt-' --type tsx
rg -- '-ml-' --type tsx

# 查找 rounded-md 使用（应为 rounded-lg 或 rounded-xl）
rg 'rounded-md' --type tsx

# 查找 等宽 repeat(N, 1fr) 表格列
rg 'repeat\(.*1fr' --type tsx

# 查找直接读取 window.innerWidth（应用 useIsMobile）
rg 'window\.innerWidth' --type tsx
```
- 移动端使用自定义底部 Tab 替代桌面端顶部 TabBar

## 另见

- [间距/圆角/阴影 Token](frontend-spacing.md) — 本规范引用的间距值和圆角标准
- [组件设计规范](frontend-components.md) — 分页组件、表格组件的提取标准
- [路由一览表](../docs/ROUTES.md) — 页面路由与布局的对应关系
