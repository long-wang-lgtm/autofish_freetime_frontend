# 发货配置弹窗 UX 融合 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三个发货配置弹窗融合为一个，PC 端自适应左右分栏，移动端 Chip 条 + 纵向堆叠。

**Architecture:** ShipConfigModal 内部管理 byEntirety/selectedSku/表单状态，通过 `isMobile` prop 切换 PC/移动端布局分支。删除 SkuConfigModal.tsx，ItemsTab 简化为直接打开 ShipConfigModal。

**Tech Stack:** Next.js App Router + React + TypeScript + Tailwind CSS v3

## Global Constraints

- 所有 import 在文件顶部
- 使用现有 `Modal` 组件（`@/components/ui/overlay/Modal`）
- 使用现有 `config.ts` 工具函数（`STAGE_LABELS`, `PLACEHOLDERS`, `hasShipConfig`, `getSkuConfig`, `SkuSummary`）
- 现有 label + content 同行布局模式保持（`w-16 label + flex-1 content`）
- `isMobile` 从 ItemsTab props 透传
- 类型从 `@/lib/api/items` 导入

---

### Task 1: 重写 ShipConfigModal — Props 与内部状态

**Files:**
- Modify: `components/items/parts/ShipConfigModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/ui/overlay/Modal`, `STAGE_LABELS`/`PLACEHOLDERS`/`SkuSummary` from `../config`, types from `@/lib/api/items`
- Produces: `ShipConfigModal` component with new Props interface

- [ ] **Step 1: 替换 Props 接口**

删除旧 Props，替换为新的简化接口。文件顶部 `interface ShipConfigModalProps` 替换为：

```typescript
import type { ItemSKU, ShipConfig, ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { STAGE_LABELS, PLACEHOLDERS, type SkuSummary } from "../config"
import { fmtPrice } from "@/lib/utils/format"

interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number
  title: string
  isMobile: boolean
  /** 商品 SKU 列表（null=单规格或无SKU，不显示SKU选区） */
  skus: ItemSKU[] | null
  /** 当前 stage 的完整配置 */
  config: ShipConfig | null
  voucherKinds: VoucherKind[]
  /** 保存回调：voucher 数据 + 当前编辑范围 */
  onSave: (data: ShipByVoucher, byEntirety: boolean) => Promise<void>
}
```

移除旧 Props：`skuInfo`, `currentConfig`, `hasSkus`, `onBackToSku`, `onToggleByEntirety`, `onSelectSku`, `byEntirety`（全改为内部状态）。

- [ ] **Step 2: 添加内部状态管理逻辑**

在组件函数体内，替换旧的 `useState` 为新的状态结构：

```typescript
export function ShipConfigModal({
  open, onClose, stage, gid, title, isMobile, skus, config, voucherKinds, onSave,
}: ShipConfigModalProps) {
  // ── 规格判断 ──
  const hasMultiSku = skus != null && skus.length > 1

  // ── 编辑范围（内部状态） ──
  const initialByEntirety = config?.byEntirety ?? (hasMultiSku ? false : true)
  const initialSku = hasMultiSku && skus ? skus[0] : null
  const [byEntirety, setByEntirety] = useState(initialByEntirety)
  const [selectedSku, setSelectedSku] = useState<ItemSKU | null>(initialSku)

  // ── 辅助：获取当前应编辑的配置 ──
  const resolveConfig = (
    isEntirety: boolean,
    sku: ItemSKU | null,
  ): ShipByVoucher | null => {
    if (isEntirety) return config?.entirety ?? null
    if (sku) return config?.skus[sku.skuid] ?? null
    return null
  }
  const currentCfg = resolveConfig(byEntirety, selectedSku)

  // ── 表单状态（从 currentCfg 初始化） ──
  const [kind, setKind] = useState<'DIRECT' | 'VOUCHER'>(
    currentCfg?.kind ?? 'DIRECT'
  )
  const [voucherkindid, setVoucherkindid] = useState<number | null>(
    currentCfg?.voucherkindid ?? null
  )
  const [useinstructions, setUseinstructions] = useState(
    currentCfg?.useinstructions ?? ''
  )
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  // 切换确认对话框
  const [pendingSwitch, setPendingSwitch] = useState<{
    byEntirety: boolean
    sku: ItemSKU | null
  } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── 切换编辑目标（带脏确认） ──
  const switchEditTarget = (newByEntirety: boolean, newSku: ItemSKU | null) => {
    if (isDirty) {
      setPendingSwitch({ byEntirety: newByEntirety, sku: newSku })
      return
    }
    applySwitch(newByEntirety, newSku)
  }

  const applySwitch = (newByEntirety: boolean, newSku: ItemSKU | null) => {
    setByEntirety(newByEntirety)
    setSelectedSku(newSku)
    const cfg = resolveConfig(newByEntirety, newSku)
    setKind(cfg?.kind ?? 'DIRECT')
    setVoucherkindid(cfg?.voucherkindid ?? null)
    setUseinstructions(cfg?.useinstructions ?? '')
    setIsDirty(false)
  }

  // ── SKU 摘要列表（PC 左栏 / 移动端 Chip 行共用） ──
  const skuSummaries = useMemo<SkuSummary[]>(() => {
    if (!skus) return []
    return skus.map((sku) => ({
      skuid: sku.skuid,
      values: sku.values.map((v) => v.value).join(' / '),
      price: sku.price,
      hasConfig: (config?.skus[sku.skuid]) != null && isShipByVoucherValid(config!.skus[sku.skuid]),
    }))
  }, [skus, config])

  // ── 表单变更标记 ──
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  // ... 占位符插入、保存、关闭逻辑（后续 Step 中完成）
}
```

需要在文件顶部新增 `useMemo` import，以及 `isShipByVoucherValid` import from config：

```typescript
import { useRef, useState, useMemo } from "react"
import { STAGE_LABELS, PLACEHOLDERS, isShipByVoucherValid, type SkuSummary } from "../config"
```

- [ ] **Step 3: 保存逻辑**

```typescript
const handleSave = async () => {
  setSaving(true)
  try {
    const skuId = byEntirety ? null : (selectedSku?.skuid ?? null)
    await onSave({
      kind,
      skuid: skuId,
      voucherkindid: kind === 'VOUCHER' ? voucherkindid : null,
      useinstructions: useinstructions || null,
    }, byEntirety)
    setIsDirty(false)
    // modal stays open
  } finally {
    setSaving(false)
  }
}
```

- [ ] **Step 4: 关闭与脏确认逻辑**

```typescript
const handleClose = () => {
  if (isDirty) {
    setPendingSwitch({ byEntirety: false, sku: null }) // reuse pendingSwitch mechanism
    // Actually, we need separate confirm states for close vs switch
    // Replace pendingSwitch with a more general confirmDialog state
  } else {
    onClose()
  }
}
```

将 `pendingSwitch` 改为更通用的确认状态：

```typescript
// 替换 pendingSwitch state:
type ConfirmAction =
  | { type: 'switch'; byEntirety: boolean; sku: ItemSKU | null }
  | { type: 'close' }

const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

const handleClose = () => {
  if (isDirty) {
    setConfirmAction({ type: 'close' })
  } else {
    onClose()
  }
}

const switchEditTarget = (newByEntirety: boolean, newSku: ItemSKU | null) => {
  if (isDirty) {
    setConfirmAction({ type: 'switch', byEntirety: newByEntirety, sku: newSku })
    return
  }
  applySwitch(newByEntirety, newSku)
}

const handleConfirmDiscard = () => {
  if (!confirmAction) return
  if (confirmAction.type === 'close') {
    onClose()
  } else {
    applySwitch(confirmAction.byEntirety, confirmAction.sku)
  }
  setConfirmAction(null)
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/items/parts/ShipConfigModal.tsx
git commit -m "refactor: rewrite ShipConfigModal props and internal state for merged UX"
```

---

### Task 2: 重写 ShipConfigModal — PC 布局渲染

**Files:**
- Modify: `components/items/parts/ShipConfigModal.tsx`

**Interfaces:**
- Consumes: Task 1 的状态变量和函数

- [ ] **Step 1: 公共子组件 — 配置表单（发货方式 + 使用说明）**

在 `ShipConfigModal` 内部提取配置表单为局部渲染函数：

```typescript
const toggleBtnClass = (active: boolean) =>
  `inline-flex ${isMobile ? 'flex-1 justify-center' : ''} px-4 h-9 text-sm rounded-lg border transition-colors font-medium items-center ${
    active
      ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200'
      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
  }`

const renderConfigForm = () => (
  <>
    {/* 发货方式 */}
    <div className="flex gap-4">
      <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1.5">发货方式</label>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setKind('DIRECT'); markDirty() }}
            className={toggleBtnClass(kind === 'DIRECT')}
          >
            无卡发货
          </button>
          <button
            type="button"
            onClick={() => { setKind('VOUCHER'); markDirty() }}
            className={toggleBtnClass(kind === 'VOUCHER')}
          >
            卡密发货
          </button>
        </div>
        {kind === 'VOUCHER' && (
          <div className="mt-2">
            <select
              value={voucherkindid ?? ''}
              onChange={(e) => { setVoucherkindid(e.target.value ? Number(e.target.value) : null); markDirty() }}
              className={`${isMobile ? 'w-full' : 'w-full max-w-[260px]'} h-9 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white`}
            >
              <option value="">选择卡种</option>
              {voucherKinds.map((vk) => (
                <option key={vk.id} value={vk.id}>{vk.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>

    {/* 使用说明 */}
    <div className="flex gap-4">
      <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1">使用说明</label>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs text-gray-400 flex-shrink-0">插入:</span>
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => insertPlaceholder(p.value)}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md whitespace-nowrap active:scale-95 transition-all select-none"
              title={`插入 ${p.value}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={useinstructions}
          onChange={(e) => { setUseinstructions(e.target.value); markDirty() }}
          rows={kind === 'VOUCHER' ? 4 : 5}
          className={`w-full px-3.5 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical placeholder:text-gray-400 ${
            isMobile ? 'text-base' : 'text-sm'
          }`}
          placeholder="输入发货内容，点击上方按钮插入占位符…"
        />
        <span className="text-xs text-gray-400 mt-1 self-end">{useinstructions.length} 字</span>
      </div>
    </div>
  </>
)
```

- [ ] **Step 2: PC SKU 列表面板**

```typescript
const renderSkuListPanel = () => (
  <div className="w-[240px] flex-shrink-0 border-r border-gray-100 bg-gray-50/50 overflow-y-auto max-h-[420px]">
    <div className="p-2">
      {skuSummaries.map((sku) => {
        const isActive = sku.skuid === selectedSku?.skuid
        return (
          <button
            key={sku.skuid}
            onClick={() => {
              const target = skus?.find((s) => s.skuid === sku.skuid)
              if (target && !isActive) switchEditTarget(false, target)
            }}
            className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
              isActive
                ? 'bg-blue-50 border-l-[3px] border-l-blue-500 text-blue-700'
                : 'border-l-[3px] border-l-transparent hover:bg-gray-100 text-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                {sku.values}
              </span>
              <span className="text-xs text-orange-600 font-semibold flex-shrink-0 ml-2">
                {sku.price != null ? fmtPrice(sku.price) : '-'}
              </span>
            </div>
            <div className={`text-[10px] mt-0.5 ${sku.hasConfig ? 'text-green-600' : 'text-gray-400'}`}>
              {sku.hasConfig ? '已配置' : '未配置'}
            </div>
          </button>
        )
      })}
    </div>
  </div>
)
```

- [ ] **Step 3: PC 整体布局渲染（return 部分）**

```typescript
// PC footer
const footer = (
  <div className="flex justify-end gap-2.5">
    <button
      onClick={handleClose}
      disabled={saving}
      className="inline-flex px-5 h-9 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 items-center"
    >
      取消
    </button>
    <button
      onClick={handleSave}
      disabled={saving}
      className="inline-flex px-6 h-9 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm items-center"
    >
      {saving ? '保存中...' : '保存'}
    </button>
  </div>
)

// 弹窗尺寸：按SKU模式用 xl，按商品模式用 lg
const modalSize = hasMultiSku && !byEntirety ? 'xl' : 'lg'

if (isMobile) {
  // mobile rendering — Task 3
  return null
}

// ── PC 布局 ──
return (
  <Modal open={open} onClose={handleClose} title={STAGE_LABELS[stage]} size={modalSize} footer={footer}>
    <div className="min-h-[410px]">
      {/* 商品信息条 */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 leading-snug">ID: {gid}</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">商品：{title}</p>
      </div>

      {/* 销售规格 — 仅多规格显示 */}
      {hasMultiSku && (
        <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
          <label className="w-16 flex-shrink-0 text-sm font-semibold text-gray-800 pt-1.5">销售规格</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (!byEntirety) switchEditTarget(true, null) }}
              className={toggleBtnClass(byEntirety)}
            >
              按商品整体设置
            </button>
            <button
              type="button"
              onClick={() => { if (byEntirety) switchEditTarget(false, skus![0]) }}
              className={toggleBtnClass(!byEntirety)}
            >
              按SKU设置
            </button>
          </div>
        </div>
      )}

      {/* 主区域 */}
      {hasMultiSku && !byEntirety ? (
        // 按SKU：左右分栏
        <div className="flex -mx-4">
          {renderSkuListPanel()}
          <div className="flex-1 min-w-0 px-4 flex flex-col gap-5">
            {selectedSku && (
              <p className="text-xs text-gray-500">
                当前编辑: <span className="text-gray-700 font-medium">{selectedSku.values.map(v => v.value).join(' / ')}</span>
              </p>
            )}
            {renderConfigForm()}
          </div>
        </div>
      ) : (
        // 按商品 / 单规格：单栏
        <div className="flex flex-col gap-5">
          {renderConfigForm()}
        </div>
      )}
    </div>

    {/* 脏确认对话框 */}
    {confirmAction && (
      <ConfirmDialog
        title="放弃未保存的修改？"
        message="当前编辑的内容尚未保存，切换将丢失这些修改。"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setConfirmAction(null)}
      />
    )}
  </Modal>
)
```

需要在文件顶部新增 import：
```typescript
import { ConfirmDialog } from "@/components/ui/overlay/ConfirmDialog"
```

- [ ] **Step 4: Check — 确保 left/right 分栏的 padding 抵消正确**

`-mx-4` 抵消 Modal 内容区的 `p-4`，让左栏贴边。左栏内部 padding 自行处理。

- [ ] **Step 5: Commit**

```bash
git add frontend/components/items/parts/ShipConfigModal.tsx
git commit -m "feat: add PC two-column layout with SKU list panel"
```

---

### Task 3: 重写 ShipConfigModal — 移动端布局

**Files:**
- Modify: `components/items/parts/ShipConfigModal.tsx`

**Interfaces:**
- Consumes: Task 1 状态 + Task 2 的 `renderConfigForm()` 和 `footer`

- [ ] **Step 1: 移动端 SKU Chip 行**

```typescript
const renderSkuChipRow = () => (
  <div className="pb-3 border-b border-gray-100">
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
      style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
    >
      {skuSummaries.map((sku) => {
        const isActive = sku.skuid === selectedSku?.skuid
        return (
          <button
            key={sku.skuid}
            onClick={() => {
              const target = skus?.find((s) => s.skuid === sku.skuid)
              if (target && !isActive) switchEditTarget(false, target)
            }}
            ref={(el) => {
              if (el && isActive) {
                el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              }
            }}
            className={`flex-shrink-0 min-w-[90px] px-3 py-2 rounded-lg border-2 transition-colors text-left ${
              isActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="text-[11px] font-medium text-gray-800 truncate max-w-[80px]">
              {sku.values}
            </div>
            <div className="text-[10px] text-orange-600 font-semibold">
              {sku.price != null ? fmtPrice(sku.price) : '-'}
            </div>
            <div
              className={`w-[6px] h-[6px] rounded-full mt-1 ${
                sku.hasConfig ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          </button>
        )
      })}
    </div>
    <p className="text-[10px] text-gray-400 text-center mt-1.5">← 滑动查看更多 SKU →</p>
  </div>
)
```

- [ ] **Step 2: 移动端完整布局**

```typescript
if (isMobile) {
  return (
    <Modal open={open} onClose={handleClose} title={STAGE_LABELS[stage]} size="lg" footer={mobileFooter}>
      <div className="min-h-[360px]">
        {/* 商品信息条 — 紧凑 */}
        <div className="text-xs text-gray-500 mb-3 truncate">
          商品：<span className="font-medium text-gray-900">{title}</span>
        </div>

        {/* 销售规格 — 仅多规格显示 */}
        {hasMultiSku && (
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-gray-800 flex-shrink-0">销售规格</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { if (!byEntirety) switchEditTarget(true, null) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  byEntirety
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                按商品
              </button>
              <button
                type="button"
                onClick={() => { if (byEntirety) switchEditTarget(false, skus![0]) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  !byEntirety
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                按SKU
              </button>
            </div>
          </div>
        )}

        {/* SKU Chip 行 — 仅多规格+按SKU模式 */}
        {hasMultiSku && !byEntirety && renderSkuChipRow()}

        {/* 当前编辑提示 */}
        {hasMultiSku && !byEntirety && selectedSku && (
          <p className="text-[11px] text-gray-500 mt-3 mb-1">
            当前编辑: <span className="font-medium text-gray-800">{selectedSku.values.map(v => v.value).join(' / ')}</span>
          </p>
        )}

        {/* 配置表单 */}
        <div className={`flex flex-col gap-5 ${hasMultiSku ? 'mt-3' : 'mt-0'}`}>
          {renderConfigForm()}
        </div>

        {/* 脏确认对话框 */}
        {confirmAction && (
          <ConfirmDialog
            title="放弃未保存的修改？"
            message="当前编辑的内容尚未保存，切换将丢失这些修改。"
            onConfirm={handleConfirmDiscard}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: 移动端 footer（等宽按钮）**

```typescript
const mobileFooter = (
  <div className="flex gap-3">
    <button
      onClick={handleClose}
      disabled={saving}
      className="flex-1 h-11 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
    >
      取消
    </button>
    <button
      onClick={handleSave}
      disabled={saving}
      className="flex-1 h-11 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center"
    >
      {saving ? '保存中...' : '保存'}
    </button>
  </div>
)
```

PC footer 已在 Task 2 中定义。在 return 前根据 `isMobile` 选择使用哪个 footer。

- [ ] **Step 4: 添加滚动条隐藏 CSS**

在文件顶部添加 Tailwind 的自定义 utility。由于 `scrollbar-none` 不是默认 Tailwind 类，需要确认项目是否有此 utility，否则用 inline style 替代：

```typescript
// 替代 scrollbar-none：使用 inline style
style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/items/parts/ShipConfigModal.tsx
git commit -m "feat: add mobile chip row layout for ShipConfigModal"
```

---

### Task 4: 更新 ItemsTab — 移除 SkuConfigModal，简化为直接调用

**Files:**
- Modify: `components/items/ItemsTab.tsx`

**Interfaces:**
- Consumes: `ShipConfigModal` (new API), `ShipStage` type
- Produces: Simplified `ItemsTab` config modal handling

- [ ] **Step 1: 替换 import**

```typescript
// 删除这行：
import { SkuConfigModal } from "@/components/items/parts/SkuConfigModal"
// ShipConfigModal 保留（已存在）
```

- [ ] **Step 2: 替换配置弹窗状态**

删除 `directStage/directItem` 和 `skuModalStage/skuModalItem`，替换为统一状态：

```typescript
// 替换旧的：
// const [directStage, setDirectStage] = useState<ShipStage | null>(null)
// const [directItem, setDirectItem] = useState<ShopItem | null>(null)
// const [skuModalStage, setSkuModalStage] = useState<ShipStage | null>(null)
// const [skuModalItem, setSkuModalItem] = useState<ShopItem | null>(null)

// 新：
const [configStage, setConfigStage] = useState<ShipStage | null>(null)
const [configItem, setConfigItem] = useState<ShopItem | null>(null)
```

- [ ] **Step 3: 替换 handleConfigClick**

```typescript
// 替换旧的分支逻辑：
const handleConfigClick = (item: ShopItem, stage: ShipStage) => {
  setConfigStage(stage)
  setConfigItem(item)
}
```

- [ ] **Step 4: 替换保存回调**

删除 `handleSaveSkuConfig`、`handleSaveEntiretyConfig`、`handleSaveDirectConfig`，替换为单一：

```typescript
const handleSaveConfig = async (voucher: ShipByVoucher, byEntirety: boolean) => {
  if (!configItem || !configStage) return
  await shipConfigMutation.mutateAsync({
    gid: configItem.gid,
    stage: configStage,
    byEntirety,
    voucher,
  })
}
```

- [ ] **Step 5: 替换 JSX 弹窗渲染**

删除以下两个 block：
- `{directStage && directItem && ( ... ShipConfigModal ... )}`
- `{skuModalStage && skuModalItem && ( ... SkuConfigModal ... )}`

替换为：

```tsx
{/* 发货配置弹窗（单规格 + 多规格统一使用） */}
{configStage && configItem && (
  <ShipConfigModal
    open
    onClose={() => { setConfigStage(null); setConfigItem(null) }}
    stage={configStage}
    gid={configItem.gid}
    title={configItem.title}
    isMobile={isMobile}
    skus={configItem.skus}
    config={configItem.config?.[configStage] ?? null}
    voucherKinds={voucherKinds}
    onSave={handleSaveConfig}
  />
)}
```

- [ ] **Step 6: 验证 — 确认 `isMultiSku` 函数**

检查 `isMultiSku` 是否仍被其他代码引用。如果已无引用，删除它：

```typescript
// 如果不再需要：
// function isMultiSku(item: ShopItem): boolean {
//   return item.skus !== null && item.skus.length > 1
// }
```

（ShipConfigModal 内部自行判断 `hasMultiSku`，ItemsTab 不再需要此函数。）

- [ ] **Step 7: 检查未使用的 import**

移除 `ShipByVoucher` 等不再直接使用的类型（如果仅传给回调则可保留，看实际引用）。确认 `config` import 中无冗余引用。

- [ ] **Step 8: Commit**

```bash
git add frontend/components/items/ItemsTab.tsx
git commit -m "refactor: simplify ItemsTab to use unified ShipConfigModal, remove SkuConfigModal refs"
```

---

### Task 5: 删除 SkuConfigModal.tsx

**Files:**
- Delete: `components/items/parts/SkuConfigModal.tsx`

- [ ] **Step 1: 确认无引用**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i "SkuConfigModal" || echo "No references found"
```

- [ ] **Step 2: 删除文件**

```bash
rm frontend/components/items/parts/SkuConfigModal.tsx
```

- [ ] **Step 3: 类型检查**

```bash
cd frontend && npx tsc --noEmit
```

确保零错误。

- [ ] **Step 4: Commit**

```bash
git rm frontend/components/items/parts/SkuConfigModal.tsx
git commit -m "refactor: delete SkuConfigModal, fully merged into ShipConfigModal"
```

---

### Task 6: 检查 config.ts — SkuSummary 是否仍被引用

**Files:**
- Modify: `components/items/config.ts`（如有需要）

- [ ] **Step 1: 确认 `SkuSummary` 和 `getSkuConfig` 仍被使用**

```bash
cd frontend && grep -rn "SkuSummary\|getSkuConfig" components/items/
```

- [ ] **Step 2: 如 `getSkuConfig` 已无外部引用，且 ShipConfigModal 仅用自己的逻辑，考虑内联或保留**

当前 `ShipConfigModal` 已在内部通过 `resolveConfig` 直接查 `config.skus[skuid]`，不依赖 `getSkuConfig`。但 `config.ts` 中的工具函数保留，因为其他地方可能用到（如 `MobileProductCard` 中的 `hasShipConfig`）。

- [ ] **Step 3: 类型检查 + Commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/components/items/config.ts
git commit -m "chore: verify config.ts exports after SkuConfigModal removal"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 运行 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```

预期：零错误。

- [ ] **Step 2: 手动验证清单**

| 场景 | 预期行为 |
|------|---------|
| 单规格商品 → 点击"付款后发货" | 打开 ShipConfigModal，无 SKU 列表，无销售规格切换，直接显示配置表单 |
| 多规格商品 → 点击"付款后发货" | 打开 ShipConfigModal，默认按SKU模式，左栏 SKU 列表 + 右栏表单 |
| PC 按SKU → 点击左栏 SKU 行 | 右栏表单切换为该 SKU，选中行高亮 |
| PC 按SKU → 点击"按商品整体" | 左栏收起，表单切换为商品级配置 |
| PC 按商品 → 点击"按SKU设置" | 左栏展开，加载上次选中 SKU |
| 移动端按SKU | Chip 行显示，滑动可选 SKU，选中 Chip 自动滚动到可视区 |
| 移动端按商品 | Chip 行隐藏，仅显示配置表单 |
| 编辑内容 → 未保存 → 切换 SKU | 弹出确认提示"放弃未保存的修改？" |
| 编辑内容 → 未保存 → 关闭弹窗 | 弹出确认提示 |
| 保存 → 成功 | 弹窗不关闭，isDirty 清除，可继续编辑 |
| 保存 → API 失败 | 错误提示，弹窗保持，表单状态保持 |

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "docs: add verification checklist for ship config UX merge"
```
