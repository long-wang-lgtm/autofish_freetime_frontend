# 发货配置弹窗 UX 融合

**日期**: 2026-08-01
**状态**: 设计中
**范围**: `components/items/parts/ShipConfigModal.tsx` — 融合 SkuConfigModal 为单一弹窗

---

## 背景

当前发货配置使用三个弹窗：

| 弹窗 | 文件 | 用途 |
|------|------|------|
| SkuConfigModal | `SkuConfigModal.tsx` | 多规格 SKU 列表 + 切换入口 |
| ShipConfigModal（按商品） | `ShipConfigModal.tsx` | 商品级配置表单 |
| ShipConfigModal（按SKU） | `ShipConfigModal.tsx` | SKU级配置表单 |

三者互相跳转——SkuConfigModal 点击 SKU 行 → 打开 SKU 配置弹窗 → 点"按商品" → 打开商品配置弹窗 → "返回SKU列表" → 回到 SkuConfigModal。三个弹窗反复切换，用户体验差。

## 设计目标

**融合为一个弹窗**。删除 `SkuConfigModal.tsx`，将所有功能整合进 `ShipConfigModal.tsx`。用户在一个弹窗内完成所有操作：查看 SKU 列表、切换配置范围、编辑配置、逐个保存 SKU——全程无跳转。

---

## 交互流程（新）

```
点击表格中 shipment/shipconfirm/evaluation 状态单元格
  │
  ├── item.skus 为 null 或 length ≤ 1（单规格）
  │   └── 打开 ShipConfigModal — 按商品模式，无 SKU 列表
  │
  └── item.skus 非 null 且 length > 1（多规格）
      └── 打开 ShipConfigModal — 默认按SKU模式，左栏显示 SKU 列表
          ├── 点击左栏 SKU 行 → 右栏加载该 SKU 配置
          │   └── 点保存 → 保存当前 SKU → 列表刷新，弹窗不关闭
          │
          ├── 切换至"按商品整体设置" → 左栏收起，右栏切换为商品级配置
          │   └── 点保存 → 保存商品级配置 → 列表刷新，弹窗不关闭
          │
          └── 点击取消/✕ → 弹窗关闭（如有未保存修改，提示确认）
```

### 关键规则

- **只有一个弹窗**，不再有 "返回SKU列表" 按钮
- **每个 SKU 单独保存**，保存后弹窗不关闭，可继续编辑下一个
- **切换范围**（按商品 ↔ 按SKU）在同一弹窗内即时切换，不需要确认
- **取消**：关闭弹窗，如有未保存的当前编辑项，弹出确认提示
- 单规格商品无 SKU 列表，仅显示按商品设置

---

## PC 端布局

### 按SKU模式：左右分栏

```
┌──────────────────────────────────────────────────────────┐
│  付款后发货                                           ✕  │
├──────────────────────────────────────────────────────────┤
│  商品：xxx ...                              ID: xxxxx    │
├──────────────────────────────────────────────────────────┤
│  销售规格    [按商品整体设置]  [按SKU设置]                │
├──────────────┬───────────────────────────────────────────┤
│  SKU 明细    │  发货方式    [无卡发货] [卡密发货]        │
│  (240px)     │              [卡种选择 ▼]  (仅卡密模式)   │
│              │                                           │
│  ● pdf版     │  使用说明    [插入: 分段符]               │
│    ¥990      │  ┌───────────────────────────────────┐   │
│    未配置    │  │ textarea                          │   │
│              │  └───────────────────────────────────┘   │
│  ○ pdf+txt   │                                   108字  │
│    ¥1,690    │                                           │
│    已配置    │                                           │
│              │                                           │
│  ○ pdftxt+   │                                           │
│    Excel     │                                           │
│    ¥2,990    │                                           │
│    未配置    │                                           │
│  ⋮ (滚动)    │                                           │
├──────────────┴───────────────────────────────────────────┤
│                                       [取消]  [保存]     │
└──────────────────────────────────────────────────────────┘
```

- 弹窗宽度：~800px（`size="xl"` 或自定）
- 左栏：240px 固定宽度，纵向滚动
- 右栏：flex-1，使用现有 `label(w-16) + content(flex-1)` 同行布局

### 按商品模式：单栏

```
┌─────────────────────────────────────┐
│  付款后发货                      ✕  │
├─────────────────────────────────────┤
│  商品：xxx ...         ID: xxxxx    │
├─────────────────────────────────────┤
│  销售规格  [按商品整体设置] [按SKU] │
├─────────────────────────────────────┤
│  发货方式    [无卡发货] [卡密发货]  │
│              [卡种选择 ▼]           │
│                                     │
│  使用说明    [插入: 分段符]         │
│  ┌─────────────────────────────┐   │
│  │ textarea                    │   │
│  └─────────────────────────────┘   │
│                             108字   │
├─────────────────────────────────────┤
│                     [取消]  [保存]  │
└─────────────────────────────────────┘
```

- 弹窗宽度：~560px（`size="lg"` 或自定）
- "按商品/按SKU"切换仍在顶行，左栏收起，右栏占满

### 模式切换行为

| 切换方向 | 左栏 | 弹窗宽度 | 表单内容 |
|----------|------|---------|---------|
| 按SKU → 按商品 | 收起（animate width → 0） | 800 → 560px | 切换为商品级配置 |
| 按商品 → 按SKU | 展开 | 560 → 800px | 加载上次选中的 SKU 配置 |

- 切换时如有未保存内容，弹出确认提示
- 切换方向为双向，可来回切换

### 模式切换过渡动画

- 左栏展开/收起：`transition-all duration-300 ease-in-out`，width 从 240px ↔ 0
- 弹窗宽度变化：同一 transition 跟随左栏同步变化
- SKU 列表内容淡入淡出：`opacity` 配合 `transition-opacity duration-200`
- 按商品模式时左栏不渲染（`display: none`），避免隐藏元素仍可聚焦

### 弹窗入场/出场动画

- **入场**：backdrop 淡入 + 弹窗从 `scale-95 opacity-0` → `scale-100 opacity-100`，`duration-200 ease-out`
- **出场**：反向动画，`duration-150 ease-in`
- 使用现有 `Modal` 组件的动画能力；若不支持则通过 CSS `@starting-style` 或 `transition` 实现
- 移动端全屏 Modal：出场使用 `translateY` 下滑动画替代缩放（更符合移动端手势语义）

---

## 移动端布局

### 布局：纵向堆叠 + 横向滑动 SKU 条

移动端全屏 Modal，纵向排列。SKU 选择使用横向滑动 chip 条。

```
┌─────────────────────────────────────┐
│  付款后发货                      ✕  │
├─────────────────────────────────────┤
│  商品：2000个案例（刑事类）...      │
├─────────────────────────────────────┤
│  销售规格    [按商品]  [按SKU]      │
├─────────────────────────────────────┤
│  ← 滑动查看更多 SKU →              │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │●pdf版│ │pdf+  │ │pdftxt│  ...  │  ← 横向滑动 chip 条
│  │ ¥990 │ │txt   │ │+Excel│       │
│  │  ●   │ │  ●   │ │  ●   │       │    3-4个可见，其余滑动
│  └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────┤
│  当前编辑: pdf版可检索              │
├─────────────────────────────────────┤
│  发货方式                            │
│  [  无卡发货  ] [  卡密发货  ]      │  ← 等宽按钮
│  [  卡种选择         ▼  ] (仅卡密) │
│                                      │
│  使用说明          [插入: 分段符]    │
│  ┌──────────────────────────────┐   │
│  │ textarea (16px font)         │   │
│  │                              │   │
│  └──────────────────────────────┘   │
│                              108字   │
├─────────────────────────────────────┤
│  [   取消   ]  [   保存   ]         │  ← 等宽全宽按钮
└─────────────────────────────────────┘
```

### SKU Chip 结构

每个 Chip 展示三项信息：

```
┌──────────┐
│ 规格名称  │  ← 11px，截断
│ ¥价格    │  ← 10px，橙红色
│ ●        │  ← 6px 圆点：绿=已配置，灰=未配置
└──────────┘
```

- 宽度：`min-width: 100px`，内容自适应
- 选中态：蓝色边框 + 蓝色背景
- 未选中态：灰色边框 + 白色背景
- 横向滚动容器：`overflow-x: auto`，隐藏滚动条
- **惯性滚动**：CSS `scroll-behavior: smooth` + `-webkit-overflow-scrolling: touch`（iOS 原生惯性）
- 选中 Chip 后自动滚动到可视区域：`scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })`

### 移动端特有行为

- Modal `size="full"` 或全屏，无圆角（与 PC 居中弹窗差异）
- 发货方式按钮等宽（`flex: 1`），触控目标 ≥ 44px
- textarea 字体 16px，防止 iOS 缩放
- 取消/保存按钮等宽，固定在底部
- "销售规格"切换时，Chip 条显示/隐藏（按商品模式下无 Chip 条）

### 按商品模式（移动端）

与 PC 端同理——Chip 条隐藏，"当前编辑"行隐藏，仅显示配置表单。弹窗布局不变。

---

## 组件变更

### 修改：ShipConfigModal

**路径**: `components/items/parts/ShipConfigModal.tsx`

新增 Props：

```typescript
interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number
  title: string
  
  // ── 多规格支持 ──
  skus?: ItemSKU[]                              // 多规格商品的 SKU 列表
  config?: ShipConfig                            // 完整配置（用于读取各SKU状态）
  
  // ── 当前编辑目标 ──
  currentConfig: ShipByVoucher | null            // 当前编辑项的已有配置
  byEntirety: boolean                            // 当前编辑范围
  
  voucherKinds: VoucherKind[]
  
  // ── 事件 ──
  onToggleByEntirety: () => void                 // 切换编辑范围
  onSelectSku: (skuid: number) => void           // 选择 SKU
  onSave: (data: ShipByVoucher) => Promise<void>
}
```

移除 Props（不再需要）：
- `onBackToSku` — 无返回需求（没有第二个弹窗了）
- `hasSkus` — 改为由 `skus` 数组是否存在判断
- `skuInfo` — 改为从 SKU 列表数据中读取

内部结构（三段式）：

1. **顶栏** — 标题 + 关闭按钮
2. **商品信息条** — 商品名称 + ID
3. **销售规格行** — label + [按商品] [按SKU] 按钮（仅多规格显示）
4. **下方主区域**：
   - 按SKU模式：左栏 SKU 明细（240px）+ 右栏配置表单（flex-1）
   - 按商品模式：单栏配置表单（100%）
5. **底栏** — 取消 + 保存

### 删除：SkuConfigModal

**路径**: `components/items/parts/SkuConfigModal.tsx`

所有功能已融合进 ShipConfigModal，此文件整体删除。

### 修改：ItemsTab.tsx

- 移除 `SkuConfigModal` 的引用和状态管理
- 点击配置列 → 直接打开 ShipConfigModal
- 多规格商品的 SKU 列表数据和切换逻辑移入 ShipConfigModal

---

## 响应式适配

### 断点策略

| 断点 | 布局 | 弹窗尺寸 |
|------|------|---------|
| ≥ 768px (md) | PC 左右分栏 | `size="xl"` (~800px) 或 `size="lg"` (~560px) |
| < 768px | 移动端纵向堆叠 + Chip 条 | `size="full"` 全屏 |

### 共用逻辑

两种布局共用同一套状态管理和保存逻辑：

- `byEntirety` / `selectedSku` — 编辑范围选择
- `kind` / `voucherkindid` / `useinstructions` — 表单数据
- `isDirty` — 脏状态跟踪
- 保存/取消处理函数

### 差异部分

| 区域 | PC | 移动端 |
|------|-----|--------|
| SKU 选择 | 左侧 240px 纵向列表 | 顶部横向滑动 Chip 条 |
| 弹窗模式 | 居中 Modal | 全屏 Modal |
| 按钮样式 | `inline-flex` 固定宽 | `flex: 1` 等宽全宽 |
| textarea font | 13px | 16px（防 iOS 缩放） |

实现方式：通过 `isMobile` prop 或 `useMediaQuery` 切换布局分支，共用核心表单组件。

---

## 状态管理

### 弹窗内部状态

```typescript
// 编辑范围（只能二选一）
const [byEntirety, setByEntirety] = useState(initialByEntirety)

// 当前选中的 SKU（仅按SKU模式有效）
const [selectedSku, setSelectedSku] = useState<ItemSKU | null>(null)

// 表单编辑状态（与当前 ShipConfigModal 相同）
const [kind, setKind] = useState<'DIRECT' | 'VOUCHER'>(...)
const [voucherkindid, setVoucherkindid] = useState<number | null>(...)
const [useinstructions, setUseinstructions] = useState(...)

// 脏状态跟踪
const [isDirty, setIsDirty] = useState(false)
```

### 切换逻辑

- 切换"按商品 ↔ 按SKU"：如果 `isDirty`，弹出确认提示；否则直接切换，表单状态重新初始化
- 切换 SKU（点击左栏行）：同上
- 选中 SKU 高亮：左侧蓝色左边框 + 背景色 `bg-blue-50`

### 保存逻辑

- 保存当前编辑项（商品级或 SKU 级），组装 `ShipByVoucher` → 调用 `onSave`
- 保存成功后：清除 `isDirty`，弹窗不关闭
- 保存失败：提示错误，保持弹窗和表单状态

---

## 不在本次范围

- `ConfigDrawer.tsx` 的 sendCode/ai_prompt 适配

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `components/items/parts/ShipConfigModal.tsx` | 融合 SkuConfigModal，新增 PC 左右分栏 + 移动端 Chip 条 |
| DELETE | `components/items/parts/SkuConfigModal.tsx` | 功能已融合，整体删除 |
| MODIFY | `components/items/ItemsTab.tsx` | 移除 SkuConfigModal 引用，统一使用 ShipConfigModal |
| MODIFY | `components/items/config.ts` | 可能新增 `SkuSummary`（如 PC 左栏需独立构建） |
