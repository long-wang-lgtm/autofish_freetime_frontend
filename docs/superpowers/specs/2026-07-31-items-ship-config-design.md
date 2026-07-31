# 商品管理页 — 发货/收货赠送/评价赠送 配置重构

**日期**: 2026-07-31
**状态**: 设计中
**范围**: `components/items/` 配置相关组件 + 表格适配 ShopItem

---

## 背景

后端 `ShopItemConfig` 已迁移为结构化 `ShipConfig` 模型，三个配置字段从纯文本变为结构化对象：

| 旧字段（纯文本） | 新字段（结构化） | 业务含义 |
|------------------|------------------|----------|
| `deliveryContent` | `config.shipment` | 付款后发货 |
| `receiptAfter` | `config.shipconfirm` | 收货后赠送 |
| `positiveReviewAfter` | `config.evaluation` | 评价后赠送 |

每个 `ShipConfig` 的结构：

```typescript
interface ShipConfig {
  byEntirety: boolean | null           // true=按商品 false=按SKU
  entirety: ShipByVoucher | null       // 商品级配置
  skus: Record<number, ShipByVoucher>  // SKU级配置
}

interface ShipByVoucher {
  kind: 'DIRECT' | 'VOUCHER'           // DIRECT=无卡直发 VOUCHER=卡密
  skuid: number | null
  voucherkindid: number | null          // 卡种ID
  useinstructions: string | null        // 使用说明（即发货内容）
}
```

---

## 交互流程

### 表格单元格点击 → 分支判断

```
点击表格中 shipment/shipconfirm/evaluation 状态单元格
  │
  ├── item.skus 为 null（无规格数据）
  │   └── 直接打开 ShipConfigModal（byEntirety=true, 无 skuInfo）
  │
  └── item.skus 非 null（有规格数据，多规格）
      └── 打开 SkuConfigModal（默认 SKU 明细视图）
          ├── SKU 明细视图：点击某 SKU 行 → 打开 ShipConfigModal
          │   （byEntirety=false, 传入该 SKU 的 skuid + values）
          │   ├── 保存 → 调用 updateItemShipConfig → 关闭弹窗，回到 SkuConfigModal（刷新数据）
          │   └── 取消 → 关闭弹窗，回到 SkuConfigModal
          │
          └── 切换至"按商品配置" → 打开 ShipConfigModal
              （byEntirety=true, 无 skuInfo）
              ├── 保存 → 调用 API → 关闭弹窗，回到 SkuConfigModal
              ├── 取消 → 关闭弹窗，回到 SkuConfigModal
              └── 顶部"返回SKU列表"按钮 → 同取消，回到 SkuConfigModal SKU 明细视图
```

### 关键规则

- 两个弹窗均为居中 Modal（桌面端 + 移动端统一）
- 多规格判断：`item.skus` 是否为 null。非 null = 有规格 = 多规格
- SkuConfigModal 中"按SKU / 按商品"切换为双向，可来回切换
- ShipConfigModal 从 SkuConfigModal 进入时，顶部显示"返回SKU列表"按钮（点击同取消，回到 SkuConfigModal）
- 每个 SKU 单独保存，调用 `updateItemShipConfig`，成功后通过 React Query 刷新列表缓存
- 取消不保存任何内容，直接回到 SkuConfigModal

---

## 组件设计

### 1. ShipConfigModal

**路径**: `components/items/parts/ShipConfigModal.tsx`

公共配置弹窗，三个 stage（shipment/shipconfirm/evaluation）共用。使用居中 Modal。

```typescript
interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number                          // 商品ID
  title: string                        // 商品标题
  skuInfo?: { skuid: number; values: string }  // SKU级配置时传入
  currentConfig: ShipByVoucher | null  // 当前配置（null=未配置）
  byEntirety: boolean                  // true=商品级 false=SKU级
  voucherKinds: VoucherKind[]          // 卡种列表
  onBackToSku?: () => void             // "返回SKU列表"回调（从SkuConfigModal进入时提供）
  onSave: (data: ShipByVoucher) => Promise<void>
}
```

**弹窗标题**: `FIELD_LABELS[stage]`（付款后发货 / 收货后赠送 / 评价后赠送）

**内部状态**（从 `currentConfig` 初始化）：
- `kind: 'DIRECT' | 'VOUCHER'` — 默认 `currentConfig?.kind ?? 'DIRECT'`
- `voucherkindid: number | null` — 默认 `currentConfig?.voucherkindid ?? null`
- `useinstructions: string` — 默认 `currentConfig?.useinstructions ?? ''`

**布局**:
1. 顶部信息条：商品名称 + SKU 信息（如有）
2. 发货方式切换：两个并列按钮（无卡配置 / 卡密配置），选中态 `bg-blue-50 text-blue-700`
3. 卡种选择（仅 VOUCHER 显示）：select 下拉，数据源 `voucherKinds`
4. 使用说明 / 发货内容：textarea
5. 占位符插入：始终展示，点击/拖拽插入到光标处（无光标则追加到末尾），当前仅 `{分段符}`，结构为数组可扩展
6. 底部：取消 + 保存按钮

**保存逻辑**: 组装 `ShipByVoucher` 对象，调用 `onSave`，成功后关闭弹窗。

---

### 2. SkuConfigModal

**路径**: `components/items/parts/SkuConfigModal.tsx`

多规格商品的 SKU 明细视图，管理"按SKU / 按商品"切换。

```typescript
interface SkuConfigModalProps {
  open: boolean
  onClose: () => void
  gid: number
  title: string                        // 商品标题
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  skus: ItemSKU[]                      // 商品SKU列表
  config: ShipConfig                   // 当前配置
  voucherKinds: VoucherKind[]
  onConfigSaved: () => void            // 配置保存后刷新数据
}
```

**内部状态**:
- `viewMode: 'sku' | 'entirety'` — 默认 `'sku'`
- `activeSkuId: number | null` — 当前选中的 SKU（驱动 ShipConfigModal 打开）

**布局**:
1. 标题："{stage_label} - SKU 明细"
2. 商品信息条
3. 切换控件：两个 pill 按钮 "按商品配置" / "按SKU配置"
4. SKU 列表（`viewMode === 'sku'` 时显示）：
   - 每行：规格值（如"红色 / XL"）+ 价格 + 配置状态 + 箭头
   - 配置状态从 `config.skus[skuid]` 读取
   - 点击行 → 设置 `activeSkuId` → 触发 ShipConfigModal

**切换逻辑**:
- 点击"按商品配置" pill → 设置 `activeSkuId` 为特殊标记 → 触发 ShipConfigModal（byEntirety=true）
- ShipConfigModal 的 `onBackToSku` → 设置 viewMode 回 `'sku'`

---

### 3. ConfigStatusCell

**路径**: `components/items/parts/ConfigStatusCell.tsx`

表格中显示配置状态的单元格组件。

```typescript
interface ConfigStatusCellProps {
  hasConfig: boolean
  label: string                        // "已配置" / "未配置"
  onClick: () => void
}
```

**显示逻辑**:
- `hasConfig=true`: 蓝色文字 "已配置"，可点击
- `hasConfig=false`: 灰色文字 "未配置"，可点击

**hasConfig 判断规则**（调用方计算）:
- `byEntirety === null`（从未配置过）：`hasConfig = false`
- `byEntirety === true`（按商品配置）：`entirety !== null`
- `byEntirety === false`（按 SKU 配置）：`Object.keys(skus).length > 0`

---

## API 补充

### 新增类型

```typescript
/** 卡种 */
export interface VoucherKind {
  id: number
  name: string
  desc: string | null
  prefix_credit: string | null
  prefix_secret: string | null
  secretsCount: number | null
}
```

### 新增函数

```typescript
/** 获取卡种列表 — GET /api/voucher.list */
export async function getVoucherKinds(): Promise<VoucherKind[]> {
  return fetchApi<VoucherKind[]>("/api/voucher.list")
}
```

`VoucherKind` 类型和 `getVoucherKinds` 添加到 `lib/api/items.ts`（就近原则，卡种用于商品发货配置）。

---

## 表格适配（ItemsTab → ShopItem）

### 修改范围

`ItemsTab.tsx` 列定义中的三个配置列，从旧逻辑：

```tsx
// 旧：纯文本判断
const value = item.deliveryContent || ''
const hasValue = value.trim().length > 0
```

改为新逻辑：

```tsx
// 新：结构化判断
const config = item.config
const hasConfig = config 
  ? (config.shipment.byEntirety !== null || config.shipment.entirety !== null)
  : false
```

点击时判断 `item.skus` 是否为 null，决定打开哪个弹窗。

### 表格列变更汇总

| 列 key | 旧字段 | 新字段 |
|--------|--------|--------|
| `deliveryContent` | `item.deliveryContent` (string) | `item.config?.shipment` (ShipConfig) |
| `receiptAfter` | `item.receiptAfter` (string) | `item.config?.shipconfirm` (ShipConfig) |
| `positiveReviewAfter` | `item.positiveReviewAfter` (string) | `item.config?.evaluation` (ShipConfig) |
| `auto_delivery` | `item.auto_delivery` (bool) | `item.auto_ship` (bool) |

其他列同样需要从旧 `Item` 类型迁移到 `ShopItem`：
- `item.price` → `item.reservePrice`（字符串，多SKU时为 "min~max"）
- `item.auto_ai_reply` → 保留
- `item.auto_restock` → 保留
- `item.sendCode` → `item.config?.sendCode`

---

## 占位符设计

当前仅保留 `{分段符}`，结构设计为可扩展数组：

```typescript
const PLACEHOLDERS: { label: string; value: string }[] = [
  { label: "分段符", value: "{分段符}" },
  // 后续可扩展：
  // { label: "订单号", value: "{订单号}" },
  // { label: "卡券信息", value: "{卡券信息}" },
]
```

---

## 移动端适配

全部使用居中 `Modal` 组件，移动端不降级为 BottomSheet。

- `ShipConfigModal`: `size="md"`（448px），移动端在小屏上自动占满宽度
- `SkuConfigModal`: `size="md"`（448px）
- 弹窗内表单元素确保触控目标 ≥ 44px

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| NEW | `components/items/parts/ShipConfigModal.tsx` | 公共配置弹窗 |
| NEW | `components/items/parts/SkuConfigModal.tsx` | SKU明细弹窗 |
| NEW | `components/items/parts/ConfigStatusCell.tsx` | 表格配置状态单元格 |
| MODIFY | `components/items/config.ts` | 更新 `ConfigField`、`FIELD_LABELS`；新增 `STAGE_LABELS` |
| MODIFY | `components/items/ItemsTab.tsx` | 列定义适配 ShopItem；集成 ShipConfigModal / SkuConfigModal |
| MODIFY | `components/items/views/ItemRow.tsx` | 适配 ShopItem（或标记 deprecated） |
| MODIFY | `components/items/views/MobileProductCard.tsx` | 适配 ShopItem，配置项改为结构化判断 |
| MODIFY | `components/items/drawers/ConfigDrawer.tsx` | 保留给 sendCode/ai_prompt 等非ShipConfig字段使用 |
| MODIFY | `lib/api/items.ts` | 新增 `VoucherKind` 类型 + `getVoucherKinds()` |
| MODIFY | `hooks/useItemsData.ts` | 适配 ShopItem 泛型 |
| MODIFY | `hooks/useItemMutations.ts` | 适配 ShopItem 类型 + 新增 shipConfig mutation |
| MODIFY | `hooks/useItemsFilters.ts` | 移除 chipsToFilters 等已删除导出依赖 |
| CHECK | `components/items/parts/ShelfActions.tsx` | 适配 ShopItem |
| CHECK | `components/items/parts/SendCodeEditor.tsx` | 适配 ShopItem（sendCode 移至 config） |

---

## 不在本次范围

- `RulesTab` 关键词规则 Tab 的 ShopItem 适配
- `ItemEditDrawer` / `ConfigDrawer` 的 sendCode/ai_prompt 适配（保留旧逻辑不动）
- `ItemsFilterBar` 搜索芯片的移除（后续 Phase）
- 移动端 MobileProductCard 的完整 ShopItem 适配（仅更新三个配置字段的判断逻辑）
