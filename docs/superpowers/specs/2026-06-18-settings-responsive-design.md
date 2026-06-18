# 设置页响应式布局设计

## 概述

为设置页（`app/dashboard/settings/page.tsx`）的两个 tab — AI 配置和通知渠道 — 添加移动端响应式支持。AIConfigTab 的 6 列表格移动端不可用，需卡片化；NotificationTab 布局简单，微调即可。

## 设计原则

- 对齐 `MobileProductCard` / `MobileRuleCard` 的移动端设计模式
- 紧凑卡片，减少垂直空间
- 移动端信息层级：名称为主焦点，元信息次要，操作放底部
- 桌面端保持现有布局不变

## 组件改动

### 1. page.tsx

- 添加 `useIsMobile()` hook
- 向 `AIConfigTab` 和 `NotificationTab` 传递 `isMobile` prop

### 2. AIConfigTab — 紧凑卡片

#### Props 变更

```ts
interface AIConfigTabProps {
  isMobile: boolean  // 新增
}
```

#### 桌面端

保持现有 6 列 table 不变。

#### 移动端卡片布局

```
┌─────────────────────────────────┐
│ DeepSeek 文字            [文字] │  ← 名称 (13px semibold) + 用途 badge
│ DeepSeek · deepseek-chat       │  ← 服务商 · 模型名 (10px gray)
│ ✓ 默认模型                     │  ← 默认状态
│              复制  编辑  删除  │  ← 底部操作栏
└─────────────────────────────────┘
```

**信息层级：**

| 行 | 内容 | 样式 |
|----|------|------|
| 标题行 | 名称 + `[文字/生图]` badge | 名称 13px semibold，badge 右对齐，语义色 |
| 信息行 | 服务商 · 模型名 | 10px text-gray-500 |
| 默认状态 | ✓ 默认模型（绿）或"设为默认"按钮（灰） | 10px |
| 底部栏 | 复制 / 编辑 / 删除 | 右对齐，复制无背景，编辑灰底，删除红底 |

#### 工具栏

移动端子 tab pill 和"添加模型"按钮同行：pill 靠左，按钮靠右。不换行，pill 标签文字缩短（全部/文字/生图）。

#### Sheet 抽屉

```tsx
<Sheet width={isMobile ? "100%" : "500px"} ...>
```

移动端全屏宽度。

#### 删除确认

桌面端 inline 确认（确认/取消），移动端卡片内同样支持。点删除后该行变为"确认 取消"。

### 3. NotificationTab — 紧凑单行

#### Props 变更

```ts
interface NotificationTabProps {
  isMobile: boolean  // 新增
  // ... 其余 props 不变
}
```

#### 桌面端

保持现有布局：`🔔 icon | 飞书通知 / webhook | toggle | 配置按钮` 一行。

#### 移动端

同一行布局，调整间距和字号：

```
🔔 | 飞书通知 / webhook... | [toggle] | 配置
```

- icon 缩小：24px → 20px
- toggle 缩小：w-12 h-6 → w-[34px] h-[18px]
- 字号缩小适配
- 不添加分割线，单行 padding 包裹全部元素

#### Sheet 抽屉

同 AIConfigTab，`width={isMobile ? "100%" : "500px"}`。

### 4. 一级 Tab 栏

现有 tab 栏本身已够简洁（`text-base font-semibold`），移动端只需调整 padding 和字号：

- 桌面端：`px-5 py-3 text-base`
- 移动端：`px-4 py-2.5 text-sm`

## 空状态 / 加载

AIConfigTab 的空状态和加载状态不区分桌面/移动端，保持现有实现。

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `app/dashboard/settings/page.tsx` | 添加 `useIsMobile`，传递 `isMobile` 给两个 tab |
| 修改 | `components/settings/AIConfigTab.tsx` | 添加 `isMobile` prop，移动端卡片列表 + Sheet 响应式 |
| 修改 | `components/settings/NotificationTab.tsx` | 添加 `isMobile` prop，移动端紧凑单行 + Sheet 响应式 |

## 边界情况

- **长名称**：`truncate` 截断
- **长 webhook URL**：`truncate` + `text-ellipsis`，移动端可用宽度约 150px
- **删除确认**：移动端卡片内 inline confirm，与桌面端逻辑一致
- **Sheet 宽度**：`100%` 模式下内部表单无需额外适配
