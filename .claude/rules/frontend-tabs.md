# Tab 页面设计规范

> 参考实现：`frontend/app/dashboard/settings/page.tsx`

## 核心原则

### 1. 内外分层

一级 tab 栏放在卡片容器**外部**，tab 内容放在卡片**内部**。利用容器的物理边界（`border` + `shadow-sm`）建立层级关系。

### 2. 重上轻下

视觉重量从上到下递减：

- 一级 tab：`text-base font-semibold`，激活时用品牌色（`text-blue-600`）
- 筛选控件/二级切换：`text-sm font-medium`，激活时用浅底（`bg-blue-50 text-blue-700`）
- 数据区：`text-xs` ~ `text-sm`，灰色为主

### 3. 语义区分色重

- **导航/筛选**（选了哪个）：浅底深字 `bg-blue-50 text-blue-700`
- **操作按钮**（要做什么）：实心底色白字 `bg-blue-600 text-white`
- **危险操作**：红色体系

### 4. 细分不抢眼

卡片内部分割线用 `border-gray-100`（不是 200、300）。

### 5. 少即是多

一级 tab 标签本身充当内容区标题，不额外加 h2 重复。

## 反模式

- 二级控件比一级 tab 更鲜艳/更大/更粗
- 筛选 pill 和操作按钮用同一套蓝底白字样式
- tab 内再加一个重复 tab 名称的标题
- 分割线用 `border-gray-200` 或更重
- tab 栏和内容区贴在一起，没有容器边界