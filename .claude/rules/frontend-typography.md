# 字号/字重/行高规范

> 参考实现：`frontend/app/dashboard/settings/page.tsx`（Tab 标签字号）、`frontend/components/layout/Header.tsx`（头尾字号层级）

## 一、字号体系

五档字号，对齐 Tailwind 默认档位，**严禁使用任意值 `text-[Npx]`**。

| 等级 | Token | 像素 | 适用场景 |
|------|-------|------|----------|
| caption | `text-xs` | 12px | Badge 文字、辅助信息、表格小字、时间戳 |
| body-sm | `text-sm` | 14px | 表格数据、描述文字、标签、按钮文字 |
| body | `text-base` | 16px | 正文、输入框文字、菜单项 |
| heading-sm | `text-base font-semibold` | 16px 加粗 | 卡片标题、一级 Tab 标签 |
| heading | `text-lg font-semibold` | 18px 加粗 | 页面主标题（仅非 Tab 页面用，Tab 页面标签即标题） |

### 例外：大数字

ProductMonitorTab 中 `text-[13px]` 的价格数字（`frontend/components/selection/product/ProductMonitorTab.tsx` 第 331 行）应统一为 `text-sm`。如需强调，用 `font-semibold` 而非缩小字号。

### 关于 text-[9px]

项目中 ProductMonitorTab 大量使用了 `text-[9px]`（第 254、264、270、276、289、298、312、333-335 行），用于：
- GID 链接
- 状态 badge
- 优先级 pill
- 入库按钮
- 价格趋势标注

**铁律**：这些元素必须改用 `text-xs`（12px）。如果 12px 在 1400px 宽表格中显得过大，应通过 `tabular-nums` + `tracking-tighter` 微调，而非缩小到 9px。

### 关于 text-[11px]

ProductMonitorTab 表头使用了 `text-[11px]`（第 490 行）。应统一为 `text-xs`（12px）。

### 关于 Header 中的 text-[11px]

`frontend/components/layout/Header.tsx` 第 70 行使用了 `text-[11px]` 用于移动端品牌名缩写。应改为 `text-xs`。

## 二、字重体系

| 等级 | Token | 适用场景 |
|------|-------|----------|
| 正文 | `font-normal`（默认） | 正文段落、描述文字、表格数据 |
| 强调 | `font-medium` | 强调文字、筛选控件激活态（搭配 `bg-blue-50 text-blue-700`）、下拉菜单项 |
| 标题 | `font-semibold` | Tab 标签（搭配 `text-base`）、卡片标题、页面主标题（搭配 `text-lg`） |

**铁律**：不使用 `font-bold`（`font-semibold` 已足够区分）。不使用 `font-light` 或 `font-thin`。

## 三、行高

| Token | 适用场景 |
|-------|----------|
| `leading-relaxed` | 正文段落、描述文字（多行文本） |
| `leading-snug` | 中等密度文字、卡片描述 |
| `leading-tight` | 表格数据、价格数字、标签 |
| `leading-none` | 紧凑数据列、badge、图标+文字组合 |

**表格数据默认行高**：`leading-tight`，确保单行单元格内容不产生额外行高。

## 四、颜色层级

| 等级 | Token | 用途 |
|------|-------|------|
| 标题色 | `text-gray-900` | 页面标题、卡片标题、表格表头 |
| 正文色 | `text-gray-700` | 正文、菜单项、表格数据（主要列） |
| 辅助色 | `text-gray-500` | 描述文字、次要表格列、占位符 |
| 禁用/占位 | `text-gray-400` | 空状态提示、禁用文字、placeholder |
| 链接色 | `text-blue-600` | 链接、可点击文字、激活态 Tab |

**铁律**：同一个数据点的颜色在不同视图中必须一致。例如 ProductMonitorTab 的状态 badge 和诊断抽屉中同样的 badge 必须用同一套颜色。

## 五、Badge/Tag/Pill 规范

### Badge（状态标签）

```tsx
<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  监控中
</span>
```

颜色映射：
- 正常/启用：`bg-green-100 text-green-700`，dot `bg-green-500`
- 禁用/暂停：`bg-gray-100 text-gray-500`，dot `bg-gray-400`
- 警告/异常：`bg-red-100 text-red-600`，dot `bg-red-500`
- 信息：`bg-blue-100 text-blue-700`，dot `bg-blue-500`

**铁律**：所有 Badge 统一 `text-xs` + `rounded-full`，不允许出现 `text-[9px]` 的 badge。

### Pill（非状态标签，如优先级）

```tsx
<span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
  ⚡3
</span>
```

### Tag（可交互标签）

```tsx
<button className="px-2 py-0.5 rounded-full text-xs border hover:bg-gray-100 transition-colors">
  关键词
</button>
```

## 六、表格文字规范

### 表头

```tsx
<div className="text-xs font-medium text-gray-500">  {/* 12px, medium, gray-500 */}
```

参考 `frontend/components/selection/product/ProductMonitorTab.tsx` 第 490 行（需将 `text-[11px]` 修正为 `text-xs`）。

### 数据行

```tsx
<span className="text-sm text-gray-700 tabular-nums">  {/* 数值列 */}
<span className="text-xs text-gray-500 tabular-nums">  {/* 辅助列 */}
```

`tabular-nums` 用于对齐数字列。

### 商品标题/描述

两行截断 + 辅助信息：
```tsx
<div className="text-sm text-gray-800 leading-snug line-clamp-2">
  {description}
</div>
```

## 七、禁止的写法

以下写法已在项目中发现，必须禁用：

| 禁止写法 | 原因 | 替代 |
|----------|------|------|
| `text-[9px]` | 任意值，无对应设计 Token | `text-xs`（12px） |
| `text-[11px]` | 任意值 | `text-xs`（12px） |
| `text-[13px]` | 任意值 | `text-sm`（14px） |
| `text-[10px]` | 任意值 | `text-xs`（12px） |
| `text-2xl` | 不在五档体系内 | `text-lg font-semibold` |
| `text-4xl` | 不在五档体系内 | 评估是否为必需 |
| `font-bold` | `font-semibold` 已够区分 | `font-semibold` |
| `font-light` | 不在三档字重体系内 | `font-normal` |

## 反模式

- 使用任意值 `text-[9px]` / `text-[11px]` / `text-[13px]` 替代标准 Tailwind 字号
- 同一数据在不同视图中使用不同字号（如 ProductMonitorTab badge 用 text-[9px]，诊断抽屉 badge 用 text-xs）
- 表格表头用 `text-[11px]` 非标准字号
- `font-bold` 替代 `font-semibold`
- Badge/Tag 不用 `rounded-full` 而用 `rounded` / `rounded-md`
- 数值列不使用 `tabular-nums` 导致数字参差不齐
- 同一个数据点的颜色在不同视图中不一致

## 验证命令

重构时可用以下命令快速定位违规：

```bash
# 查找所有任意值字号（text-[Npx]）
rg 'text-\[[0-9]+px\]' --type tsx

# 查找 font-bold 使用
rg 'font-bold' --type tsx

# 查找 text-2xl / text-4xl（非规范字号）
rg 'text-2xl|text-4xl' --type tsx

# 查找 Badge 不用 rounded-full
rg 'rounded-md|rounded-lg' --type tsx -l | xargs rg 'badge|Badge|tag|Tag|pill|Pill'
```

## 另见

- [色彩语义体系](frontend-colors.md) — Badge/Tag 的颜色规则
- [间距/圆角规范](frontend-spacing.md) — Badge 的圆角必须用 `rounded-full`
