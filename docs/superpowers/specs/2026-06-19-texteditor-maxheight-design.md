# TextEditor maxHeight 约束 — 设计文档

**日期:** 2026-06-19
**状态:** 已批准

## 背景

`TextEditor` 组件去掉了 `resize-none`，允许用户拖拽调整 textarea 大小。但浏览器原生 resize 没有上限，拖拽过高会撑破外层 Sheet/BottomSheet 容器。

## 方案

调用方通过 `maxHeight` prop 告知 TextEditor 所在容器可分配的最大垂直空间。TextEditor 负责应用 `style={{ maxHeight }}`。

### Props 新增

```ts
maxHeight?: string  // CSS 值，如 "40vh", "300px", "calc(100vh - 200px)"
```

### 调用方传值

| 文件 | TextEditor 位置 | maxHeight | 理由 |
|------|----------------|-----------|------|
| ConfigDrawer | 1 处 | `"40vh"` | 上方有商品信息卡片 + 占位符选择器 |
| ItemEditDrawer | 6 处 | `"30vh"` | 字段多、rows=2~3，不需要过高 |
| KeywordRuleForm | 1 处 | `"35vh"` | 上方有匹配规则卡片 + 占位符工具栏 |

全部用 `vh` 单位，天然适配 PC/移动横屏/移动竖屏。

## 修改范围

- `components/ui/text-editor.tsx` — 新增 `maxHeight` prop
- `components/items/drawers/ConfigDrawer.tsx` — 传 `maxHeight="40vh"`
- `components/items/drawers/ItemEditDrawer.tsx` — 6 处 TextEditor 各传 `maxHeight="30vh"`
- `components/items/parts/KeywordRuleForm.tsx` — 传 `maxHeight="35vh"`
