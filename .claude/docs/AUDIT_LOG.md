# 规范审计日志

本文档集中记录各规范域对代码库的审计发现。每个域的"现状问题"随代码修复状态更新。

> **与 KNOWN_ISSUES.md 的区别**：KNOWN_ISSUES 按 Issue 追踪单点问题；AUDIT_LOG 按规范域记录结构性的、跨文件的模式违规。

---

## 色彩体系审计（frontend-colors.md 规范域）

| 问题 | 状态 |
|------|------|
| 蓝色语义过载 — `bg-blue-600` 同时用于 CTA 按钮、选中行、数据指标、信息徽章、导航激活态（72 个文件） | 🔴 未修复 |
| 绿色语义过载 — `#22c55e` 同时表示 IM 在线状态、正向增长、操作成功反馈 | 🔴 未修复 |
| 灰度无层级 — `gray-50` 同时用于页面背景、输入框背景、表格 hover 行、禁用按钮 | 🔴 未修复 |
| 暗色主题死代码 — `globals.css` 中 `.dark` 变量零组件使用 | 🔴 未修复 |
| 语义 Token 形同虚设 — 仅 `toaster.tsx` 一处使用 `bg-primary`，其余全用 `bg-blue-600` | 🔴 未修复 |

---

## 图表实现审计（frontend-charts.md 规范域）

| 问题 | 状态 |
|------|------|
| 全量导入 ECharts — 8 个文件使用 `import * as echarts from 'echarts'` | 🔴 未修复 |
| 实现模式分裂 — `useChart` hook 与手动 `echarts.init` 模式并存（4 个文件各自重复样板代码） | 🔴 未修复 |
| 配色 4 套并存 — `USER_PALETTE` 在 2 个文件中重复定义，4 个 product chart 使用各自硬编码色值 | 🔴 未修复 |
| tooltip 颜色与折线颜色错配 — `ImStatusChart.tsx` 依赖 ECharts 自动配色但 tooltip 使用不同颜色 | 🔴 未修复 |
| 零 dataZoom 支持 — 所有时间序列图表无缩放/平移交互 | 🔴 未修复 |
| 零 click 下钻 — 所有图表不可点击导航 | 🔴 未修复 |
| legend 实现分裂 — 3 处 HTML 自定义 legend vs 内置 legend | 🔴 未修复 |
| 双 Y 轴滥用 — 量级差距 > 100x 的数据放在同一图表 | 🔴 未修复 |

---

## 格式化审计（frontend-format.md 规范域）

| 问题 | 状态 |
|------|------|
| `fmtPrice` 三处定义，行为各异（有的带 `maximumFractionDigits: 2`，有的不带） | ✅ Phase 2 已修复 |
| 价格在 JSX 中直接拼字符串（`ItemRow.tsx` 无千分位） | 🔴 未修复 |
| 无统一日期格式化函数 | 🔴 未修复 |
| 图表轴标签重复手写 `toLocaleString` | 🔴 未修复 |

---

## 性能审计（frontend-performance.md 规范域）

| 问题 | 状态 |
|------|------|
| ECharts 全部全量导入（8 处） | 🔴 未修复 |
| `React.memo` 零使用 | 🔴 未修复 |
| 虚拟滚动未使用 | 🔴 未修复 |
| `next/dynamic` 零使用 — 无代码分割 | 🔴 未修复 |
| `<img loading="lazy">` 零使用 | 🔴 未修复 |
| 裸 `useEffect + useState` 请求数据（1 处：admin proxy） | 🔴 未修复 |
| 部分 mutation 后双重 invalidateQueries（无乐观更新） | 🔴 未修复 |

---

## 生产环境 console 残留

| 位置 | 状态 |
|------|------|
| `selection.ts` 23 处 `console.debug` | ✅ Phase 0 已删除 |
| `auth.store.ts` 1 处 `console.warn` | ✅ Phase 0 已修复 |
| `admin/page.tsx` 3 处 `console.error` | 🔴 未修复 |
| `useImStatusSnapshots.ts` 1 处 `console.log` | 🔴 未修复 |
| `PublishInstanceList.tsx` 1 处 `console.log` | 🔴 未修复 |
