# 数字 / 日期 / 价格格式化规范

> 参考实现：`frontend/components/selection/product/ProductMonitorTab.tsx`（当前 fmt 函数集）、`frontend/lib/utils/auth.ts`（同目录工具文件风格参考）

## 现状问题

项目中格式化逻辑严重分散，同名函数在多个组件中重复定义，实现细节不一致：

- **`fmtPrice` 三处定义，行为各异**：
  - `ProductMonitorTab.tsx` 第 37 行：`¥${price.toLocaleString('zh-CN')}` — 千分位，无小数位限制
  - `ProductDiagnosticDrawer.tsx` 第 28 行：`¥${v.toLocaleString('zh-CN')}` — 同上
  - `GrowthPricePanel.tsx` 第 11 行：`¥${v.toLocaleString('zh-CN', {maximumFractionDigits: 2})}` — 多了 `maximumFractionDigits: 2`

- **价格在 JSX 中直接拼字符串**，无千分位：`ItemRow.tsx` 第 58 行 `<span>¥{item.price}</span>` — 价格 12345 展示为 `¥12345` 而非 `¥12,345`。

- **百分比格式化语义不统一**：
  - `fmtPercent`（`ProductMonitorTab.tsx`）：无正负号前缀，返回 `12.5%`
  - `fmtGrowth`（`ProductMonitorTab.tsx`）：有正号前缀，返回 `+15.3%`
  - `fmtAcceleration`（`ProductMonitorTab.tsx`）：文字前缀，返回 `加速 +12.0%` / `降温 -8.0%`

- **无日期/时间格式化函数**：项目中不存在 `fmtDate`、`fmtDateTime`、`fmtRelative`，日期格式化散落在各处使用原始 `toLocaleString` 调用。

- **`lib/utils/format.ts` 不存在**：`lib/utils/` 目录下仅有 `auth.ts`、`api.ts`、`validation.ts`，缺少格式化工具模块。

## 格式化函数定义（统一在 `lib/utils/format.ts`）

> **⚠️ 待创建**：`lib/utils/format.ts` 文件尚不存在，需在 Phase 2 重构中创建。在创建完成前，组件内的 `fmtPrice`/`fmtPercent` 等函数可暂时保留，但新组件禁止再定义同名函数。

所有格式化函数**必须**定义在 `lib/utils/format.ts`，**禁止**在组件中定义同名函数。

```ts
// lib/utils/format.ts

/**
 * 价格格式化——千分位，无小数
 * fmtPrice(12345) → "¥12,345"
 * fmtPrice(12345.5) → "¥12,346"
 */
export function fmtPrice(v: number): string {
  return `¥${Math.round(v).toLocaleString('zh-CN')}`
}

/**
 * 百分比——1 位小数，无正负号前缀（颜色承担语义）
 * fmtPercent(0.125) → "12.5%"
 * fmtPercent(-0.03) → "-3.0%"
 */
export function fmtPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

/**
 * 增长率——带正负号前缀
 * fmtGrowth(0.153) → "+15.3%"
 * fmtGrowth(-0.082) → "-8.2%"
 * fmtGrowth(0) → "0%"
 */
export function fmtGrowth(v: number): string {
  const pct = (v * 100).toFixed(1)
  return v > 0 ? `+${pct}%` : v < 0 ? `${pct}%` : '0%'
}

/**
 * 加速度——文字 + 增长率
 * fmtAcceleration(0.45) → "加速 +45.0%"
 * fmtAcceleration(-0.5) → "降温 -50.0%"
 * fmtAcceleration(0.1) → "平稳"
 */
export function fmtAcceleration(v: number): string {
  const pct = (v * 100).toFixed(1)
  if (v > 0.3) return `加速 +${pct}%`
  if (v < -0.3) return `降温 ${pct}%`
  return '平稳'
}

/**
 * 大数字——千分位
 * fmtNumber(1234567) → "1,234,567"
 */
export function fmtNumber(v: number): string {
  return v.toLocaleString('zh-CN')
}

/**
 * 日期——统一格式
 * fmtDate("2026-06-29") → "2026-06-29"
 */
export function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 日期时间
 * fmtDateTime("2026-06-29T14:30:00") → "2026-06-29 14:30"
 */
export function fmtDateTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

/**
 * 相对时间——用于列表项
 * fmtRelative("2026-06-29T12:00:00") 相对于当前时间 → "2小时前" / "3天前" / "刚刚"
 */
export function fmtRelative(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return fmtDate(date)
}
```

## 使用规范

### 禁止在 JSX 中直接调用 .toLocaleString()

```tsx
// ❌ 禁止：直接在 JSX 中格式化
<span>¥{item.price.toLocaleString('zh-CN')}</span>
<span>{count.toLocaleString('zh-CN')}</span>
<span>{(rate * 100).toFixed(1)}%</span>

// ✅ 始终通过格式化函数
<span>{fmtPrice(item.price)}</span>
<span>{fmtNumber(count)}</span>
<span>{fmtPercent(rate)}</span>
```

### 禁止在组件中定义格式化函数

```tsx
// ❌ 禁止：在组件文件顶部定义格式化函数（当前 ProductMonitorTab.tsx / ProductDiagnosticDrawer.tsx / GrowthPricePanel.tsx 的做法）
function fmtPrice(price: number): string {
  return `¥${price.toLocaleString('zh-CN')}`
}

// ✅ 从统一模块导入
import { fmtPrice, fmtPercent, fmtGrowth, fmtNumber } from '@/lib/utils/format'
```

### 格式化函数与颜色解耦

格式化函数只负责**文本格式**，不嵌入颜色逻辑。增长方向的视觉语义通过 CSS 类名在组件层处理：

```tsx
// ✅ 格式化函数只返回文本
import { fmtGrowth } from '@/lib/utils/format'

// 颜色在组件层通过 CSS 类名控制
<span className={growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-500'}>
  {fmtGrowth(growth)}
</span>

// ❌ 格式化函数内部嵌入 <span> 或 className（耦合了展示逻辑）
```

### 价格字段的展示

```tsx
// ✅ 价格展示——始终通过 fmtPrice
import { fmtPrice } from '@/lib/utils/format'

// ItemRow.tsx / MobileProductCard.tsx / ItemCardPanel.tsx 等组件中
<span className="text-gray-900 font-medium">{fmtPrice(item.price)}</span>

// ❌ 当前 ItemRow.tsx 第 58 行的做法——无千分位
<span>¥{item.price}</span>
```

### 图表中的数字格式化

ECharts 的 `valueFormatter`、`axisLabel.formatter` 中复用同一套格式化函数：

```tsx
import { fmtNumber, fmtPercent } from '@/lib/utils/format'

// ✅ 图表轴标签复用格式化函数
yAxis: {
  axisLabel: {
    formatter: (v: number) => fmtNumber(v),
  },
}

// tooltip 值格式化
tooltip: {
  valueFormatter: (v: number) => fmtNumber(v),
}

// ❌ 图表各处重复写 toLocaleString（当前 CumulativeGrowthChart.tsx / IntentConversionChart.tsx / TrafficActionChart.tsx 的做法）
axisLabel: { formatter: (v: number) => v.toLocaleString('zh-CN') }
```

## 函数对照表

| 函数 | 输入示例 | 输出示例 | 用途 |
|------|----------|----------|------|
| `fmtPrice(v)` | `12345` | `¥12,345` | 商品价格 |
| `fmtPercent(v)` | `0.125` | `12.5%` | 比例、占比 |
| `fmtGrowth(v)` | `0.153` | `+15.3%` | 环比/同比增长率 |
| `fmtAcceleration(v)` | `0.45` | `加速 +45.0%` | 增长加速度 |
| `fmtNumber(v)` | `1234567` | `1,234,567` | 大数字（总量、人数） |
| `fmtDate(d)` | `"2026-06-29"` | `2026-06-29` | 日期 |
| `fmtDateTime(d)` | `"2026-06-29T14:30:00"` | `2026-06-29 14:30` | 日期时间 |
| `fmtRelative(d)` | `2小时前的时间` | `2小时前` | 列表相对时间 |

## 反模式

- 在组件文件中定义 `fmtPrice` / `fmtPercent` / `fmtGrowth` 等格式化函数（当前 3 个 product 组件都在这样做）
- 直接在 JSX 中使用 `toLocaleString('zh-CN')` 格式化数字（至少 4 个文件存在）
- 价格展示不使用千分位格式（`ItemRow.tsx`、`MobileProductCard.tsx`、`ItemCardPanel.tsx` 等组件的当前做法）
- `fmtPrice` 在不同文件中实现不一致（有的带 `maximumFractionDigits: 2`，有的不带）
- 格式化函数内部嵌入 HTML/CSS（颜色逻辑应保留在组件 JSX 中通过 className 处理）
- 图表的 `axisLabel.formatter` 和 `valueFormatter` 中重复手写 `v.toLocaleString('zh-CN')` 而非导入统一函数

## 验证命令

```bash
# 查找 JSX 中直接调用 .toLocaleString（应使用 fmt 函数）
rg '\.toLocaleString\(' --type tsx

# 查找组件文件中定义的 fmtPrice（应在 format.ts 中）
rg 'function fmtPrice' --type tsx

# 查找组件文件中定义的 fmtGrowth（应在 format.ts 中）
rg 'function fmtGrowth' --type tsx
```

## 另见

- [图表实现规范](frontend-charts.md) — ECharts 轴标签复用格式化函数
- [字号规范](frontend-typography.md) — 数字列的 `tabular-nums` + `text-sm` 样式
