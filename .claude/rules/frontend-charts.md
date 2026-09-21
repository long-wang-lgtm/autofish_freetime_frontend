# 图表实现规范

## 核心原则

### 1. 统一使用 useChart Hook

所有 ECharts 图表必须通过统一的 `useChart` hook 初始化，禁止在组件中手动调用 `echarts.init()` / `chart.dispose()`。

useChart hook 已封装：初始化、setOption、窗口 resize 自适应、组件卸载时 dispose。用法详见 docs/CHART_PATTERNS.md。

### 2. ECharts 按需导入

禁止 `import * as echarts from 'echarts'` 全量导入。改为从 `echarts/core`、`echarts/charts`、`echarts/components`、`echarts/renderers` 按需导入实际使用的模块，通过 `echarts.use([])` 注册。具体组件清单见 docs/CHART_PATTERNS.md。

### 3. 图表配色集中管理

所有图表的系列颜色、调色板必须从 `lib/constants/chart-theme.ts` 统一导入，禁止在图表组件中硬编码颜色。

| 调色板/常量 | 用途 |
|-------------|------|
| `USER_PALETTE` | 用户账号饼图调色板（10 色） |
| `OTHER_COLOR` | 饼图"其他"分类颜色 `#cccccc` |
| `CHART_COLORS.want` | 想要——核心转化 `#2563eb` |
| `CHART_COLORS.browse` | 浏览——流量指标 `#d97706` |
| `CHART_COLORS.collect` | 收藏——兴趣指标 `#7c3aed` |
| `CHART_COLORS.inquiryRate` | 询单率——转化率 `#059669` |
| `CHART_COLORS.movingAverage` | 移动平均线 `#9ca3af` |
| `CHART_COLORS.reference` | 参考线 `#6b7280` |

### 4. 跨图表颜色一致性

同一业务指标在所有图表中使用完全相同的颜色。"浏览"指标在所有图表中均为 `#d97706`，"想要"均为 `#2563eb`，"收藏"均为 `#7c3aed`。所有图表引用同一颜色常量，禁止不同图表中同一指标使用不同颜色。

### 5. 图表交互最低要求

所有图表必须支持以下基础交互：

| 交互 | 适用范围 | 实现方式 |
|------|----------|----------|
| tooltip | 所有图表 | ECharts tooltip 配置，值格式化 |
| dataZoom | 时间序列图表（折线图、柱状图） | ECharts dataZoom 组件：底部滑块（type: slider, bottom: 8, height: 16）+ 内置缩放（type: inside） |
| legend | 多系列图表 | 统一使用 ECharts 内置 legend（bottom: 32），禁止 HTML 自定义 legend |

### 6. tooltip 颜色必须与 series 颜色同步

设置 series 时必须同时显式指定 `color`、`lineStyle.color` 和 `itemStyle.color`，tooltip formatter 中展示的颜色标记必须使用同一色值常量，禁止依赖 ECharts 自动配色而 tooltip 中使用不同颜色。具体示例见 docs/CHART_PATTERNS.md。

### 7. 移动端图表降级

移动端不使用完整 ECharts 图表。表格内嵌的趋势预览使用 SVG 实现的 MiniTrendChart 组件（纯 SVG，90x32px，零外部依赖）。MiniTrendChart 接收 props：`hourlyData`（24 小时数据点）、`slope`（趋势斜率）、`dailyAvg`（日均值）、`cv`（变异系数）、`color`（amber/blue/violet 三色主题）。

ECharts 图表仅在桌面端展开详情或完整仪表盘中使用。

### 8. 双 Y 轴使用规则

只有量级相近（差距小于 10 倍）的指标才能共享双 Y 轴。量级差距超过 10 倍的指标应拆分为独立图表，避免产生虚假视觉关联——用户会误认为量级完全不同的两条曲线走势相关。

### 9. click 下钻

数据概览图表应支持点击下钻到详情。通过 useChart hook 返回的 ref 配合 useEffect 绑定 ECharts 的 click 事件，在事件处理器中根据点击的数据点导航到详情页。具体实现见 docs/CHART_PATTERNS.md。

### 10. 上下子图的 x 轴必须对齐

同一张图里上下两个子图共用 x 轴时，两个 `grid` 的 `left` 必须是同一个值。ECharts 的规则是「绘图区左边界 = max(grid.left, 最宽刻度标签宽 + axisLabel.margin)」——各自写自己的 `left`，标签宽的那张（如销售额轴带 `¥`）就会把绘图区往右推，两条 x 轴错位。

统一走 `lib/utils/chart-axis.ts`（2026-09 实测定型，分时段成交/账号每日趋势两张图共用）：

- 值轴上限用 `niceAxisMax(数据最大值)` 定到整档 —— 最宽的刻度标签因此就是上限那一个，量标签宽时不必猜 ECharts 会取到多大的刻度，顺带控住顶部留白；
- 两张值轴里最宽的刻度标签经 `sharedAxisGutter([...])` 量出公共列宽，两个 `grid` 都用它；
- 值轴刻度标签用 `axisCountLabel`（销量）/`axisAmountLabel`（销售额，整数不带角分），两张轴都要 `minInterval: 1`——刻度不带小数。

折线平滑度用 `LINE_SMOOTH`（`lib/constants/chart-theme.ts`，0.3）配 `smoothMonotone: 'x'`：拐点带弧但不糊，且曲线不会越出相邻两点的取值范围（峰值不越上限、谷底不穿零轴）。别用 ECharts 默认的 `smooth: true`（= 0.5，把尖峰抹圆，趋势图的读图重点——哪小时冲高——反而看不清）。

类目密集时让刻度全展示（如分时段成交的 24 个小时点）：办法是把标签写短——用补零小时数 `"00"`~`"23"` 而不是 `"00:00"`（`HourlyData.hours` 本身就是这个格式），标签窄了才铺得下（24 格 × 25px 里放 12px 的标签，间距仍有 14px），不要用 `interval` 抽稀把刻度砍掉一半；语义在 tooltip 头补回（`14:00`）。

### 11. 近 3 日图表：「今日为主角」+ 今日数据不完整

近 3 日类图表（时段面积图 / 成单条形图）的统一语言：**末位（今日）用指标实色**，历史日退中性灰阶（`HISTORY_DAY_LINE_COLORS`，前天浅、昨天深）——三条线叠在一张图上，同色浅阶根本分不开今昔（2026-09-21 用户明确要求「今日要有对比性、突出重要性」）。时段图额外：今日线加粗、面积只给今日（`TODAY_LINE_WIDTH` / `TODAY_AREA_ALPHA`），历史日只留细线。

**今日的数据是不完整的**：未到的小时不渲染——补 `null` 断线，不要补 0（补 0 会画出一条「夜里归零」的假线，看着像今日已经收摊）；tooltip 里这些小时显示 `—`。

**截止点必须取自数据本身**：数据行里就带 `date` + `hour`，最新一天＝今日，只画到该天最后一个有数据的小时（`lastHourOf`）。**不要用 `new Date()` 之类的本地时钟**——机器/浏览器时间跟业务数据的口径不一致（时区、机器时间漂移），会把没有的点画出来、把有数据的点截掉。

## 反模式

- 手动调用 `echarts.init()` 而非使用 useChart hook
- 使用 `import * as echarts from 'echarts'` 全量导入
- 在同一项目多个文件中重复定义相同的调色板常量
- HTML 自定义 legend 替代 ECharts 内置 legend
- 时间序列图表无 dataZoom
- 上下子图各自写自己的 `grid.left`（值轴标签宽度不同 → 两条 x 轴错位）
- 折线只开 `smooth` 不加 `smoothMonotone`（曲线越出取值范围：谷底穿零轴、峰值越上限）
- 值轴刻度带小数（金额刻度显示到角分；应 `minInterval: 1` + 整数格式化函数）
- 用本地时钟（`new Date()`）判「今日」或截断数据（口径与业务数据不一致；数据行里自带 `date` / `hour`）
- tooltip marker 颜色与 series 实际颜色不一致（依赖 ECharts 默认配色但 tooltip 使用不同颜色）
- 量级差距超过 10 倍的数据放在双 Y 轴图表中
- 移动端使用完整 ECharts 替代 SVG sparkline（表格内嵌场景应使用 MiniTrendChart）
- 图表无 click 下钻交互
- 在 option 中使用手动索引配色替代 ECharts 全局 color 调色板配置

## 另见

- [色彩语义体系](frontend-colors.md) — UI 交互色与图表色的分离原则
- [数字/日期/价格格式化规范](frontend-format.md) — 图表轴标签和 tooltip 的格式化函数
- [性能检查清单](frontend-performance.md) — ECharts 按需导入和懒加载
