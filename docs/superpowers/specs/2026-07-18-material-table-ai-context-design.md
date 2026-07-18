# 素材表格增强：封面提示词 + AI 上下文行内绑定

**日期：** 2026-07-18
**状态：** 设计已确认，待实施计划
**范围：** `components/batch-publish/workbench/`、`lib/api/batch-publish.ts`、`hooks/batch-publish/`

---

## 1. 背景与动机

### 当前问题

1. **`coverprompt` 没有编辑入口** — `MaterialAIContext.coverprompt` 字段在后端已定义，但前端完全没有查看或编辑的 UI。

2. **AI 上下文绑定必须打开侧边栏** — 用户要修改注入的监控商品或切换模板类型，必须：打开 `MaterialEditSheet` → 滚动到 AI 上下文区域 → 勾选商品 → 点「保存 AI 上下文」按钮。步骤太多。

3. **`ReferencePanel` 与 AI 上下文绑定功能重叠** — 两者都在展示监控商品列表，但 ReferencePanel 只展示前 5 个卡片且信息量少，侧边栏绑定列表也简陋。两个各做一半，信息分散。

4. **侧边栏需要手动保存** — 「保存素材」「保存 AI 上下文」按钮是数据丢失的隐患，用户经常忘记点。

### 目标

- `coverprompt` 成为可编辑的一等字段
- AI 上下文绑定从侧边栏迁到素材表格行（弹窗编辑）
- 用弹窗内更丰富的信息展示替换 `ReferencePanel`
- 侧边栏全字段自动保存，去掉手动保存按钮

---

## 2. 当前架构

```
MaterialWorkspace
├── ReferencePanel            ← 横向滚动卡片（最多 5 个）
│   └── ReferenceCard × N     ← 标题、想要斜率、日均、转化率、价格、置信度
├── MaterialRow × N            ← 8 列 grid 表格
│   ├── 复选框
│   ├── 封面图
│   ├── 描述（截断）
│   ├── 价格（行内编辑）
│   ├── 账号（下拉）
│   ├── 类目（下拉）
│   ├── 进度+操作
│   └── 删除
│   └── 点击行 → MaterialEditSheet
└── MaterialEditSheet          ← Sheet 侧边栏
    ├── 图片管理
    ├── 描述 textarea
    ├── AI 上下文区域
    │   ├── 模板选择器
    │   ├── 监控商品勾选列表
    │   └── [保存 AI 上下文] 按钮
    ├── [保存素材] 按钮
    └── [关闭] 按钮
```

### 当前数据流

```
MonitoredItem[]                 ← useWorkbenchData 加载
  ├── ReferencePanel            ← 纯展示
  └── MaterialEditSheet         ← 绑定 UI

PublishMaterial.ai_context      ← 每个素材独立存储
  ├── template: TemplateType
  ├── items: string[]           ← gid 数组
  ├── coverprompt?: string      ← ⚠️ 后端已定义但前端无编辑入口
  └── images?: string[]
```

### 关键 API

| 接口 | 方法 | 用途 |
|------|------|------|
| `/material.edit` | POST | 编辑素材字段（描述、价格、类目、账号、图片） |
| `/material.context` | POST | 更新 AI 上下文（templateType + gids + coverprompt） |
| `/material.channel` | POST | 获取类目列表 |

### 关键类型

```ts
interface MaterialAIContext {
  template?: TemplateType       // 'only_opportunity' | 'with_item'
  images?: string[]
  items?: string[]              // gid 数组
  coverprompt?: string          // ⚠️ 前端从未使用
}

interface MaterialEditInput {
  id: number
  description?: string
  price?: number
  category?: string
  to_uid?: string
  images?: MaterialImage[]
  // coverprompt 不在此处，走 MaterialContextInput
}

interface MaterialContextInput {
  id: number
  templateType?: TemplateType
  gids?: string[]
  coverprompt?: string          // ← NEW
}
```

---

## 3. 目标架构

```
MaterialWorkspace
├── (ReferencePanel 已移除)
├── MaterialRow × N              ← 10 列（8 → +封面提示词 +AI上下文）
│   ├── 复选框
│   ├── 封面图
│   ├── 描述（截断）
│   ├── 封面提示词 (NEW)          ← 截断文本，点击行 → 侧边栏完整编辑
│   ├── 价格（行内编辑）
│   ├── 账号（下拉）
│   ├── 类目（下拉）
│   ├── AI上下文 (NEW)            ← 摘要pill按钮，点击 → AIContextModal
│   ├── 进度+操作
│   └── 删除
│   └── 点击行 → MaterialEditSheet
└── MaterialEditSheet            ← 简化后的侧边栏
    ├── 图片管理（自动保存）
    ├── 描述 textarea（自动保存）
    ├── 封面提示词 textarea（自动保存，NEW）
    ├── (AI 上下文区域 已移除)
    ├── (保存素材按钮 已移除)
    └── [关闭] 按钮

AIContextModal                   ← 新组件（Modal size="lg"）
├── 模板类型选择器               ← 下拉，改动即自动保存
├── 监控商品列表                  ← 勾选列表，展示丰富数据
│   └── 每项展示：
│       ├── 标题（line-clamp-1）
│       ├── 参考价、转化率、售价
│       └── 想要增长率（红/绿）、日均、采集次数/置信度
├── 注入内容摘要                  ← 黄色提示框
└── 无保存按钮                    ← 改动即存
```

---

## 4. 组件设计

### 4.1 MaterialRow — 新增两列

**列：封面提示词（`ai_context.coverprompt`）**

- 展示：截断文本（CSS `truncate` 约 30 字符），未设置时灰色显示「（未设置）」
- 交互：点击行 → 打开 `MaterialEditSheet`，在侧边栏中完整编辑
- 列宽：与描述列同比例（~1.5fr）

**列：AI 上下文（`ai_context.template` + `ai_context.items`）**

- 展示：小按钮/pill 显示摘要
  - `template === 'only_opportunity'` → 「仅商机」
  - `template === 'with_item'` + N 个 items → 「商机 + N 商品」
  - 无 template → 「未配置」（灰色）
- 交互：点击 pill → 打开 `AIContextModal`
- 样式：`bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full hover:bg-blue-100 cursor-pointer`
- 列宽：约 100px 固定

**Grid 列更新：** `constants.ts` 中 `MATERIAL_GRID_COLS` 从 8 列改为 10 列，`MATERIAL_HEADER_LABELS` 新增「封面提示词」和「AI上下文」。

### 4.2 AIContextModal（新组件）

**文件：** `components/batch-publish/workbench/AIContextModal.tsx`

**渲染位置：** 在 `WorkbenchTab` 层级渲染一次，与 `MaterialEditSheet` 并列。通过 `contextMaterialId` 状态控制（与 `editingMaterialId` → `MaterialEditSheet` 模式一致）。避免每个 `MaterialRow` 各自创建 Modal 实例。

**状态管理：** 在 `useWorkbenchFilters` 中新增：
```ts
const [contextMaterialId, setContextMaterialId] = useState<number | null>(null)
const openContextModal = useCallback((id: number) => setContextMaterialId(id), [])
const closeContextModal = useCallback(() => setContextMaterialId(null), [])
```

**Props：**
```ts
interface AIContextModalProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
  monitoredItems: MonitoredItem[]
  materials: PublishMaterial[]
}
```

组件从 `materials` 列表中读取当前素材的 `ai_context`，通过 `useEffect` 在 `materialId` 变化时初始化本地状态。

**内部状态：**
- `templateType` — 本地状态，从 `material.ai_context?.template` 初始化
- `selectedGids` — 本地状态，从 `material.ai_context?.items ?? []` 初始化
- `saving` — 保存中标识

**自动保存行为：**
- 模板类型切换：立即保存，调用 `updateMaterialContext({ id, templateType, gids: selectedGids })`
- 商品勾选/取消：立即保存，调用同一 API
- 使用 `useWorkbenchMutations` hook 处理 mutation + 缓存失效
- 静默保存，仅在出错时弹 toast（不在每次成功时弹，避免噪声）

**布局：**
```
┌─────────────────────────────────────────┐
│ 编辑 AI 上下文 — {material.description}   │ × │
├─────────────────────────────────────────┤
│ 注入模板                                  │
│ [仅商机信息 ▾]                            │
├─────────────────────────────────────────┤
│ 绑定监控商品                已选 3 个      │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ 商品标题            +12.5%        │ │
│ │   ¥89 · 转化3.2% · 售价¥129       │ │
│ │              日均230 · 采集18次      │ │
│ ├─────────────────────────────────────┤ │
│ │ ☐ 商品标题             +8.1%        │ │
│ │   ¥208 · 转化4.5% · 售价¥259      │ │
│ │              日均156 · 采集12次      │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 将注入：商机 + 3商品（商品A、B、C）   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**每项展示数据（比 ReferenceCard 多）：**

| 位置 | 字段 | 格式 |
|------|------|------|
| 左侧 — 标题 | `item.title \|\| item.gid` | `text-sm`，line-clamp-1 |
| 左侧 — 副行 | 参考价、转化率、售价 | `text-xs text-gray-500`，用 `·` 分隔 |
| 右侧 — 上 | wantSlope（增长率） | 红/绿 `text-xs font-medium`，`fmtGrowth()` |
| 右侧 — 中 | 日均想要量 | `text-[11px] text-gray-400`，`fmtNumber()` |
| 右侧 — 下 | 采集次数 + 置信度 | `text-[10px] text-gray-400` |

**置信度分级：** `≥12` =「高置信度」、`6-11` =「中等置信度」、`1-5` =「低置信度」（amber 色）、`0` =「无采集数据」（灰色）。

**勾选项视觉：** 选中行 `bg-blue-50` 背景，清晰标识。

**底部注入摘要：** 黄色提示框（`bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800`），明确展示将注入的内容。

### 4.3 MaterialCard（移动端）— 同步改动

与 `MaterialRow` 相同的两个新字段：
- 封面提示词：描述下方展示，同样截断
- AI 上下文：pill 按钮，点击打开 `AIContextModal`（Modal 组件在移动端自动占满，体验友好）

### 4.4 MaterialEditSheet — 简化 + 自动保存

**移除内容：**
- AI 上下文区域（模板选择器 + 监控商品列表 + 保存按钮）→ 全部迁至 `AIContextModal`
- 「保存素材」按钮 → 改为自动保存
- 「保存 AI 上下文」按钮 → 已随 AI 上下文区域移除

**新增内容：**
- 封面提示词编辑区（位于描述和关闭按钮之间）

**最终结构：**
```
┌──────────────────────────┐
│ 编辑素材 #123             │ × │
├──────────────────────────┤
│ 📷 商品图片               │
│ [上传/排序] 即改即存      │
├──────────────────────────┤
│ 📝 描述文案               │
│ [textarea，自动保存]      │
├──────────────────────────┤
│ 🎨 封面绘画提示词  (NEW)  │
│ [textarea，自动保存]      │
├──────────────────────────┤
│ ✓ 所有改动已自动保存       │
│ [关闭]                    │
└──────────────────────────┘
```

**自动保存机制：**

在 `MaterialEditSheet.tsx` 内部定义私有 hook `useAutoSave`（不单独提取文件）：

```ts
function useAutoSave<T>(
  saveFn: (value: T) => Promise<void>,
  getValue: () => T
) {
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const savingRef = useRef(false)
  const toast = useToast()

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined }
    if (!dirtyRef.current || savingRef.current) return
    savingRef.current = true
    try {
      await saveFn(getValue())
      dirtyRef.current = false
    } catch (err) {
      toast.addToast({
        title: `自动保存失败：${(err as Error)?.message || '请稍后重试'}`,
        variant: 'error'
      })
    } finally {
      savingRef.current = false
    }
  }, [saveFn, getValue, toast])

  const onChange = useCallback(() => {
    dirtyRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, 1000)  // 1 秒防抖
  }, [flush])

  const onBlur = useCallback(() => { flush() }, [flush])

  return { onChange, onBlur, flush, isDirty: dirtyRef }
}
```

```
┌──────────────────────────────────────────┐
│  onBlur → 立即保存（取消等待中的防抖）     │
│  onChange → 1 秒防抖保存                   │
│  关闭 Sheet → flush 等待中的保存再关闭      │
└──────────────────────────────────────────┘
```

应用于两个字段：
1. **描述**：`saveFn = (v) => editMaterial({ id, description: v })`
2. **封面提示词**：`saveFn = (v) => updateMaterialContext({ id, coverprompt: v })`

图片无防抖直接保存：上传/删除/排序 → 立即 `editMaterial({ id, images })`。

**Sheet 关闭流程：**
1. 调用两个字段的 `flush()`
2. 等待进行中的保存完成（最多等待 3 秒，超时则强制关闭并 toast 提示）
3. 调用 `onClose()` prop

### 4.5 ReferencePanel — 移除

- 删除 `ReferencePanel.tsx` 和 `ReferenceCard.tsx`
- 从 `MaterialWorkspace.tsx` 中移除 `<ReferencePanel>`
- `MaterialWorkspace` 的 `monitoredItems` 和 `monitoredLoading` props 也一并移除（不再需要）
- `MaterialWorkspace` 新增 prop：`onOpenContextModal: (id: number) => void`

---

## 5. 数据流

### 封面提示词

```
MaterialRow（截断展示）
  └── 点击行 → MaterialEditSheet
        └── textarea onChange → auto-save（onBlur 立即 / 1s 防抖）
              └── updateMaterialContext({ id, coverprompt: value })
                    └── invalidateQueries(['batch-publish', 'materials', selectedOid])
```

### AI 上下文绑定

```
MaterialRow（摘要 pill「商机 + 3 商品」）
  └── 点击 pill → WorkbenchTab 设置 contextMaterialId
        └── AIContextModal（open=true）
              ├── 模板下拉 onChange → updateMaterialContext({ id, templateType, gids })
              └── gid 勾选 toggle → updateMaterialContext({ id, templateType, gids })
                    └── invalidateQueries(['batch-publish', 'materials', selectedOid])
```

### WorkbenchTab 集成

```tsx
// WorkbenchTab — 新增状态
const [contextMaterialId, setContextMaterialId] = useState<number | null>(null)

// MaterialWorkspace 新 prop
<MaterialWorkspace
  // ... 现有 props（移除 monitoredItems 和 monitoredLoading）
  onOpenContextModal={setContextMaterialId}
/>

// 与 MaterialEditSheet 并列渲染
<AIContextModal
  materialId={contextMaterialId}
  selectedOid={page.selectedOid}
  open={contextMaterialId !== null}
  onClose={() => setContextMaterialId(null)}
  monitoredItems={page.monitoredItems}
  materials={page.materials}
/>
```

---

## 6. Props 变更汇总

### MaterialRow

```ts
// Before
interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenSheet: (id: number) => void
  selectedOid: number | undefined
  materialPage: number
}

// After — 新增一个 prop
interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenSheet: (id: number) => void
  onOpenContextModal: (id: number) => void  // ← NEW
  selectedOid: number | undefined
  materialPage: number
}
```

### MaterialWorkspace

```ts
// Before
interface MaterialWorkspaceProps {
  // ...
  monitoredItems: MonitoredItem[]
  monitoredLoading: boolean
  // ...
}

// After — 替换
interface MaterialWorkspaceProps {
  // ...（移除 monitoredItems、monitoredLoading）
  onOpenContextModal: (id: number) => void  // ← NEW
  // ...
}
```

---

## 7. API 变更

### 扩展 `MaterialContextInput` — 新增 `coverprompt`

```ts
// lib/api/batch-publish.ts
export interface MaterialContextInput {
  id: number
  templateType?: TemplateType
  gids?: string[]
  coverprompt?: string           // ← NEW
}
```

`coverprompt` 属于 `MaterialAIContext`，走 `/material.context` 接口，不走 `/material.edit`。

### `updateMaterialContext` 函数签名更新

```ts
export async function updateMaterialContext(input: MaterialContextInput): Promise<PublishMaterial> {
  const { id, templateType, gids, coverprompt } = input
  const sp = new URLSearchParams()
  sp.set('id', String(id))
  if (templateType) sp.set('templateType', templateType)
  if (coverprompt !== undefined) sp.set('coverprompt', coverprompt)
  return fetchApi<PublishMaterial>(`/material.context?${sp.toString()}`, {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(gids),
  })
}
```

### `MaterialEditInput` — 无需改动

`MaterialEditInput` 不新增 `coverprompt` 字段。

---

## 8. 常量更新

```ts
// constants.ts

// 之前 8 列 → 之后 10 列
export const MATERIAL_GRID_COLS =
  '32px 56px 2fr 1.5fr 80px 100px 100px 100px 96px 32px'

export const MATERIAL_HEADER_LABELS = [
  '',            // 复选框
  '封面',         // 封面图
  '描述',         // 描述
  '封面提示词',    // NEW
  '价格',         // 价格
  '账号',         // 账号
  '类目',         // 类目
  'AI上下文',     // NEW
  '进度/操作',    // 进度+操作
  '',            // 删除
]
```

---

## 9. 文件变更清单

| 文件 | 改动 |
|------|------|
| `MaterialRow.tsx` | 新增 2 列（coverprompt 展示 + AI 上下文 pill），新增 prop `onOpenContextModal` |
| `MaterialCard.tsx` | 卡片布局增加同样 2 个字段，新增 prop `onOpenContextModal` |
| `AIContextModal.tsx` | **新文件** — AI 上下文绑定弹窗 |
| `MaterialEditSheet.tsx` | 新增 coverprompt textarea、移除 AI 上下文区域、移除保存按钮、实现 `useAutoSave` |
| `MaterialWorkspace.tsx` | 移除 ReferencePanel、新增 `onOpenContextModal` prop、传递给 MaterialRow |
| `WorkbenchTab.tsx` | 新增 `contextMaterialId` 状态、渲染 `<AIContextModal>`、传递 `onOpenContextModal` |
| `ReferencePanel.tsx` | **删除** |
| `ReferenceCard.tsx` | **删除** |
| `constants.ts` | 更新 `MATERIAL_GRID_COLS`（8→10）和 `MATERIAL_HEADER_LABELS` |
| `batch-publish.ts` | `MaterialContextInput` 新增 `coverprompt`，`updateMaterialContext` 函数签名更新 |

---

## 10. 边界情况与状态处理

| 状态 | 处理方式 |
|------|----------|
| 素材无 `ai_context` | AI 上下文 pill 灰色显示「未配置」 |
| `template === 'with_item'` 但 `items` 为空 | Pill 显示「商机 + 0 商品」，Modal 内所有项未勾选 |
| `monitoredItems` 为空 | Modal 显示空状态：「该商机下暂无绑定商品」 |
| 自动保存失败 | Toast 报错，本地状态保持不变 |
| Modal 保存中用户点关闭 | 保存中禁用关闭按钮，显示 spinner |
| Sheet 关闭时有未 flush 的防抖 | 执行 flush，等待保存完成，再关闭 |
| 素材无 `coverprompt` | 表格列灰色显示「（未设置）」，侧边栏 textarea 为空 |
| coverprompt 很长 | 表格列 `truncate` 约 30 字符截断 |
| 移动端 Modal 体验 | `Modal` 组件在移动端自动占满视口，体验友好 |
| 移动端 SideSheet | `MaterialEditSheet` 已内置 `useIsMobile` 自动切换 `BottomSheet` |

---

## 11. 不做的事情

- 不修改 `/material.context` 后端 API 签名
- 不新增封面提示词生成 UI（那是独立功能）
- 不新增跨素材批量 AI 上下文绑定
- 不改变监控商品数据加载策略（仍从父组件传入）
- 不改变 `useAutoSave` 为公共 hook（仅 MaterialEditSheet 内使用）

---

## 12. 后端依赖

- **`coverprompt` 字段在 `/material.context`**：`updateMaterialContext` API 的 query string 新增 `coverprompt` 参数。后端需支持接收并持久化。如果后端暂不支持，需要先协调后端。
- `/material.edit` 无需变更。
