# 数字 / 日期 / 价格格式化规范

所有格式化函数统一定义在 `lib/utils/format.ts`，禁止在组件文件中定义同名函数。

## 函数对照表

| 函数 | 输入示例 | 输出示例 | 用途 |
|------|----------|----------|------|
| `fmtPrice(v)` | `12345` | `¥12,345` | 商品价格（千分位，四舍五入无小数） |
| `fmtPercent(v)` | `0.125` | `12.5%` | 比例、占比（1 位小数，无正负号前缀） |
| `fmtGrowth(v)` | `0.153` | `+15.3%` | 环比/同比增长率（带正负号前缀） |
| `fmtAcceleration(v)` | `0.45` | `加速 +45.0%` | 增长加速度（文字+增长率，小于阈值显示"平稳"） |
| `fmtNumber(v)` | `1234567` | `1,234,567` | 大数字千分位 |
| `fmtDate(d)` | `"2026-06-29"` | `2026-06-29` | 日期（yyyy-MM-dd） |
| `fmtDateTime(d)` | `"2026-06-29T14:30:00"` | `2026-06-29 14:30` | 日期时间（yyyy-MM-dd HH:mm） |
| `fmtRelative(d)` | 2小时前的时间戳 | `2小时前` | 相对时间（刚刚/N分钟前/N小时前/N天前） |

## 使用规范

### 禁止在 JSX 中直接调用 .toLocaleString()

所有数字格式化必须通过格式化函数，禁止在 JSX 中直接使用：
- `.toLocaleString('zh-CN')` — 应使用 `fmtPrice` 或 `fmtNumber`
- `.toFixed(1) + '%'` — 应使用 `fmtPercent` 或 `fmtGrowth`
- 日期字段直接拼接 — 应使用 `fmtDate` / `fmtDateTime` / `fmtRelative`

### 禁止在组件中定义格式化函数

所有 `fmtPrice`、`fmtPercent`、`fmtGrowth` 等格式化函数必须从 `lib/utils/format.ts` 导入，禁止在组件文件顶部定义。

### 格式化函数与颜色解耦

格式化函数只负责**文本格式**，不嵌入颜色逻辑。增长方向的视觉语义（正=绿、负=红）通过 CSS 类名在组件层处理，格式化函数仅返回纯文本字符串。

### 价格字段展示

所有价格展示必须通过 `fmtPrice` 函数，确保千分位格式统一。禁止在 JSX 中直接拼接 `¥{item.price}`（无千分位）。

### 图表中数字格式化

ECharts 的 `valueFormatter`、`axisLabel.formatter` 中复用同一套格式化函数（`fmtNumber`、`fmtPercent`），禁止在图表配置中重复手写 `v.toLocaleString('zh-CN')`。

## 反模式

- 在组件文件中定义 `fmtPrice` / `fmtPercent` / `fmtGrowth` 等格式化函数
- 直接在 JSX 中使用 `toLocaleString('zh-CN')` 格式化数字
- 价格展示不使用千分位格式
- `fmtPrice` 在不同文件中实现不一致（有的带 `maximumFractionDigits: 2`，有的不带）
- 格式化函数内部嵌入 HTML/CSS（颜色逻辑应保留在组件层通过 className 处理）
- 图表的 `axisLabel.formatter` 和 `valueFormatter` 中重复手写格式化逻辑而非导入统一函数

## 另见

- [图表实现规范](frontend-charts.md) — ECharts 轴标签复用格式化函数
- [设计 Token 规范](frontend-design-tokens.md) — 数字列的 `tabular-nums` + `text-sm` 样式
