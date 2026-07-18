# 素材表格增强：封面提示词 + AI 上下文行内绑定 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 素材表格新增 coverprompt 和 AI 上下文两列；AI 上下文绑定从侧边栏移至表格 Modal；ReferencePanel 移除；侧边栏实现自动保存。

**Architecture:** 自底向上——先改 API 层和常量，再建新组件 AIContextModal，然后改 MaterialRow/MaterialCard 新列，接着改 MaterialEditSheet 自动保存+coverprompt，再改 MaterialWorkspace/WorkbenchTab 连线，最后删除 ReferencePanel。

**Tech Stack:** Next.js + React + TypeScript + Tailwind CSS v3 + TanStack React Query

---

### Task 1: API 层 — 扩展 MaterialContextInput + updateMaterialContext

**Files:**
- Modify: `lib/api/batch-publish.ts:130-134` (MaterialContextInput)
- Modify: `lib/api/batch-publish.ts:356-367` (updateMaterialContext)

- [ ] **Step 1: 扩展 MaterialContextInput 类型**

```ts
// lib/api/batch-publish.ts，替换第 130-134 行
/** AI 上下文更新入参 */
export interface MaterialContextInput {
  id: number
  templateType?: TemplateType
  gids?: string[]
  coverprompt?: string
}
```

- [ ] **Step 2: 更新 updateMaterialContext 函数**

```ts
// lib/api/batch-publish.ts，替换第 356-367 行
/** 更新 AI 上下文 — POST /api/selection/material.context */
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

- [ ] **Step 3: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 4: Commit**

```bash
git add lib/api/batch-publish.ts
git commit -m "feat: add coverprompt to MaterialContextInput and updateMaterialContext

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 常量 — 更新表格列定义

**Files:**
- Modify: `components/batch-publish/shared/constants.ts`

- [ ] **Step 1: 更新 MATERIAL_GRID_COLS 和 MATERIAL_HEADER_LABELS**

```ts
// components/batch-publish/shared/constants.ts
// 替换 MATERIAL_GRID_COLS（8 列 → 10 列）
export const MATERIAL_GRID_COLS =
  '32px 56px 2fr 1.5fr 80px 100px 100px 100px 96px 32px'

// 替换 MATERIAL_HEADER_LABELS
export const MATERIAL_HEADER_LABELS = [
  '',            // 复选框
  '封面',         // 封面图
  '描述',         // 描述
  '封面提示词',    // NEW: coverprompt
  '价格',         // 价格
  '账号',         // 账号
  '类目',         // 类目
  'AI上下文',     // NEW: AI 上下文
  '进度/操作',    // 进度+操作
  '',            // 删除
]
```

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/shared/constants.ts
git commit -m "feat: update grid columns — add coverprompt and AI context columns

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: AIContextModal — 新组件

**Files:**
- Create: `components/batch-publish/workbench/AIContextModal.tsx`

- [ ] **Step 1: 创建 AIContextModal 组件**

```tsx
// components/batch-publish/workbench/AIContextModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/overlay/Modal'
import { fmtGrowth, fmtNumber } from '@/lib/utils/format'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import type { MonitoredItem, TemplateType, PublishMaterial } from '@/lib/api/batch-publish'

interface AIContextModalProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
  monitoredItems: MonitoredItem[]
  materials: PublishMaterial[]
}

function getConfidence(fetchCount: number): { label: string; color: string } {
  if (fetchCount >= 12) return { label: '高置信度', color: 'text-gray-400' }
  if (fetchCount >= 6) return { label: '中等置信度', color: 'text-gray-400' }
  if (fetchCount >= 1) return { label: '低置信度', color: 'text-amber-500' }
  return { label: '无采集数据', color: 'text-gray-400' }
}

export function AIContextModal({
  materialId, selectedOid, open, onClose, monitoredItems, materials,
}: AIContextModalProps) {
  const { updateContextMutation } = useWorkbenchMutations(selectedOid)
  const material = materialId ? materials.find(m => m.id === materialId) : null

  const [templateType, setTemplateType] = useState<TemplateType>('only_opportunity')
  const [selectedGids, setSelectedGids] = useState<string[]>([])

  // 初始化本地状态
  useEffect(() => {
    if (material) {
      setTemplateType((material.ai_context?.template as TemplateType) ?? 'only_opportunity')
      setSelectedGids(material.ai_context?.items ?? [])
    }
  }, [material])

  if (!material) return null

  const saveContext = async (tt: TemplateType, gids: string[]) => {
    updateContextMutation.mutate({ id: material.id, templateType: tt, gids })
  }

  const handleTemplateChange = (tt: TemplateType) => {
    setTemplateType(tt)
    saveContext(tt, selectedGids)
  }

  const toggleGid = (gid: string) => {
    const next = selectedGids.includes(gid)
      ? selectedGids.filter(g => g !== gid)
      : [...selectedGids, gid]
    setSelectedGids(next)
    saveContext(templateType, next)
  }

  const isSaving = updateContextMutation.isPending

  return (
    <Modal
      open={open}
      onClose={isSaving ? () => {} : onClose}
      title={`编辑 AI 上下文 — ${material.description?.slice(0, 20) ?? `#${material.id}`}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* 注入模板 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">注入模板</label>
          <select
            value={templateType}
            onChange={(e) => handleTemplateChange(e.target.value as TemplateType)}
            disabled={isSaving}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="only_opportunity">仅商机信息</option>
            <option value="with_item">商机 + 指定监控商品</option>
          </select>
        </div>

        {/* 监控商品列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">绑定监控商品</span>
            <span className="text-xs text-gray-500">
              已选 <span className="text-blue-600 font-semibold">{selectedGids.length}</span> 个
            </span>
          </div>

          {monitoredItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center border border-gray-200 rounded-lg">
              该商机下暂无绑定商品
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {monitoredItems.map((item) => {
                const checked = selectedGids.includes(item.gid)
                const trendData = item.trendData as { fetchCount?: number } | null | undefined
                const fetchCount = trendData?.fetchCount ?? 0
                const conf = getConfidence(fetchCount)

                return (
                  <label
                    key={item.gid}
                    className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGid(item.gid)}
                      disabled={isSaving}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 leading-snug line-clamp-1">
                        {item.title || item.gid}
                      </div>
                      <div className="flex gap-2 mt-0.5 text-xs text-gray-500">
                        {item.price != null && <span>¥{item.price}</span>}
                        {item.convertRate != null && (
                          <span>
                            转化 <span className="text-gray-700">{item.convertRate}%</span>
                          </span>
                        )}
                        {/* 售价：用 wantAvg * price 近似或直接取 price */}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      {item.wantSlope != null && (
                        <span className={`text-xs font-medium tabular-nums ${
                          item.wantSlope >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {fmtGrowth(item.wantSlope)}
                        </span>
                      )}
                      {item.wantAvg != null && (
                        <span className="text-[11px] text-gray-400 tabular-nums">
                          日均 {fmtNumber(item.wantAvg)}
                        </span>
                      )}
                      <span className={`text-[10px] ${conf.color}`}>
                        采集 {fetchCount} 次 · {conf.label}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* 注入摘要 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 leading-relaxed">
          {templateType === 'only_opportunity' ? (
            '将注入：仅商机信息'
          ) : selectedGids.length === 0 ? (
            '将注入：商机信息（未选择监控商品）'
          ) : (
            <>将注入：<strong>商机信息</strong> + <strong>{selectedGids.length} 个监控商品</strong>（{
              selectedGids.map(g => {
                const found = monitoredItems.find(m => m.gid === g)
                return found?.title ?? g
              }).join('、')
            }）</>
          )}
        </div>

        {/* 保存状态提示 */}
        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            保存中...
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/workbench/AIContextModal.tsx
git commit -m "feat: add AIContextModal for inline AI context binding

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: MaterialRow — 新增两列 + onOpenContextModal prop

**Files:**
- Modify: `components/batch-publish/workbench/MaterialRow.tsx`

- [ ] **Step 1: 更新 Props 接口**

```tsx
// MaterialRow.tsx，替换 MaterialRowProps 接口（第 16-23 行）
interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenSheet: (id: number) => void
  onOpenContextModal: (id: number) => void
  selectedOid: number | undefined
  materialPage: number
}
```

- [ ] **Step 2: 解构新 prop**

```tsx
// MaterialRow.tsx，替换第 26 行
export function MaterialRow({
  materialId, isSelected, onToggleSelect, onOpenSheet, onOpenContextModal,
  selectedOid, materialPage,
}: MaterialRowProps) {
```

- [ ] **Step 3: 在描述列之后插入「封面提示词」列**

```tsx
{/* 在「描述」span 之后、「价格」InlineEditCell 之前插入 */}

{/* 🎨 封面提示词 */}
<span className="text-xs text-gray-700 leading-snug truncate">
  {material.ai_context?.coverprompt || <span className="text-gray-400">（未设置）</span>}
</span>
```

- [ ] **Step 4: 在类目列之后、进度列之前插入「AI 上下文」列**

```tsx
{/* 在「类目」select 的 </div> 之后、「进度+操作」<ProgressActionCell 之前插入 */}

{/* 🤖 AI 上下文 */}
<div onClick={(e) => e.stopPropagation()} className="flex justify-center">
  <button
    onClick={() => onOpenContextModal(materialId)}
    className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
  >
    {material.ai_context?.template === 'with_item'
      ? `商机 + ${(material.ai_context?.items?.length ?? 0)} 商品`
      : material.ai_context?.template === 'only_opportunity'
        ? '仅商机'
        : '未配置'}
  </button>
</div>
```

- [ ] **Step 5: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 6: Commit**

```bash
git add components/batch-publish/workbench/MaterialRow.tsx
git commit -m "feat: add coverprompt and AI context columns to MaterialRow

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: MaterialCard — 新增两个字段

**Files:**
- Modify: `components/batch-publish/workbench/MaterialCard.tsx`

- [ ] **Step 1: 更新 Props**

```tsx
// MaterialCard.tsx，替换 MaterialCardProps
interface MaterialCardProps {
  materialId: number
  selectedOid: number | undefined
  onOpenSheet: (id: number) => void
  onOpenContextModal: (id: number) => void
}
```

```tsx
// 解构新 prop
export function MaterialCard({ materialId, selectedOid, onOpenSheet, onOpenContextModal }: MaterialCardProps) {
```

- [ ] **Step 2: 在描述之后、价格行之前插入 coverprompt 展示**

```tsx
{/* 在描述 <p> 之后、价格行 <div className="flex items-center gap-2 flex-wrap"> 之前插入 */}

{/* 🎨 封面提示词 */}
<p className="text-xs text-gray-500 truncate">
  {material.ai_context?.coverprompt || '（未设置封面提示词）'}
</p>
```

- [ ] **Step 3: 在账号和类目 select 之后插入 AI 上下文 pill**

```tsx
{/* 在类目 select 的 </select> 之后，</div> 之前插入 */}

<button
  onClick={(e) => { e.stopPropagation(); onOpenContextModal(materialId) }}
  className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
>
  {material.ai_context?.template === 'with_item'
    ? `商机 + ${(material.ai_context?.items?.length ?? 0)} 商品`
    : material.ai_context?.template === 'only_opportunity'
      ? '仅商机'
      : '未配置'}
</button>
```

- [ ] **Step 4: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add components/batch-publish/workbench/MaterialCard.tsx
git commit -m "feat: add coverprompt and AI context fields to MaterialCard

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: MaterialEditSheet — 自动保存 + coverprompt + 移除 AI 上下文区域

**Files:**
- Modify: `components/batch-publish/workbench/MaterialEditSheet.tsx`

- [ ] **Step 1: 更新 import 声明**

```tsx
// MaterialEditSheet.tsx，修改现有 import

// React import — 确保包含 useRef, useCallback
import { useState, useEffect, useRef, useCallback } from 'react'

// 新增 API 函数导入
import { editMaterial, updateMaterialContext } from '@/lib/api/batch-publish'

// 新增 React Query
import { useQueryClient } from '@tanstack/react-query'

// 移除不再需要的导入：
// - useWorkbenchMutations（AI 上下文移到 Modal，自动保存用 raw API）
// - TEMPLATE_TYPE_LABELS（只在 AI 上下文区域用到）
// - TemplateType（只在 AI 上下文区域用到）
// - fmtGrowth, fmtNumber（只在 AI 上下文区域用到）
// - MonitoredItem（只在 AI 上下文区域用到）

// 最终 import 应为：
import { useState, useEffect, useRef, useCallback } from 'react'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { uploadFileToFlare, imageDisplayUrl } from '@/lib/api/upload'
import { editMaterial, updateMaterialContext } from '@/lib/api/batch-publish'
import { useQueryClient } from '@tanstack/react-query'
import type { MaterialImage, PublishMaterial } from '@/lib/api/batch-publish'
import type { MaterialImage as UploadMaterialImage } from '@/lib/api/upload'
```

同时更新 Props — 移除 `monitoredItems`：
```tsx
interface MaterialEditSheetProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
  materials: PublishMaterial[]
}
```

- [ ] **Step 2: 新增状态变量（在现有 useState 之后）**

```tsx
// MaterialEditSheet.tsx，在现有 useState 声明之后添加
// 自动保存相关 — 使用 ref 避免重渲染
const descDirtyRef = useRef(false)
const descTimerRef = useRef<ReturnType<typeof setTimeout>>()
const descSavingRef = useRef(false)

const coverDirtyRef = useRef(false)
const coverTimerRef = useRef<ReturnType<typeof setTimeout>>()
const coverSavingRef = useRef(false)

// coverprompt 状态
const [coverprompt, setCoverprompt] = useState('')
```

- [ ] **Step 3: 更新初始化 useEffect**

```tsx
// 替换现有 useEffect（约第 38-45 行）
useEffect(() => {
  if (material) {
    setDescription(material.description ?? '')
    setImages(material.images ?? [])
    setCoverprompt(material.ai_context?.coverprompt ?? '')
  }
}, [material])
```

移除 `setTemplateType` 和 `setSelectedGids` — 它们随 AI 上下文 section 一起移除。

- [ ] **Step 4: 新增自动保存函数（使用 raw API，不用 mutation）**

```tsx
// 在 handleImageMoveDown 之后、handleSaveMaterial 之前添加
// 注意：使用 editMaterial 和 updateMaterialContext 原始 API，
// 不用 editMaterialMutation（mutation 有 toast + full invalidation，太重）

const autoSaveDesc = useCallback(async (value: string) => {
  if (descSavingRef.current) return
  descSavingRef.current = true
  try {
    await editMaterial({ id: material.id, description: value || undefined })
    descDirtyRef.current = false
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
  } catch {
    // 静默处理 — 下次 flush 或 onBlur 会重试
  } finally {
    descSavingRef.current = false
  }
}, [material.id, selectedOid, queryClient])

const autoSaveCover = useCallback(async (value: string) => {
  if (coverSavingRef.current) return
  coverSavingRef.current = true
  try {
    await updateMaterialContext({ id: material.id, coverprompt: value || undefined })
    coverDirtyRef.current = false
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
  } catch {
    // 静默处理
  } finally {
    coverSavingRef.current = false
  }
}, [material.id, selectedOid, queryClient])

const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const v = e.target.value
  setDescription(v)
  descDirtyRef.current = true
  if (descTimerRef.current) clearTimeout(descTimerRef.current)
  descTimerRef.current = setTimeout(() => autoSaveDesc(v), 1000)
}

const handleDescBlur = () => {
  if (descTimerRef.current) { clearTimeout(descTimerRef.current); descTimerRef.current = undefined }
  if (descDirtyRef.current) autoSaveDesc(description)
}

const handleCoverChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const v = e.target.value
  setCoverprompt(v)
  coverDirtyRef.current = true
  if (coverTimerRef.current) clearTimeout(coverTimerRef.current)
  coverTimerRef.current = setTimeout(() => autoSaveCover(v), 1000)
}

const handleCoverBlur = () => {
  if (coverTimerRef.current) { clearTimeout(coverTimerRef.current); coverTimerRef.current = undefined }
  if (coverDirtyRef.current) autoSaveCover(coverprompt)
}

// Sheet 关闭时 flush 所有待保存内容（最多等 3 秒）
const handleCloseWithFlush = useCallback(async () => {
  if (descTimerRef.current) { clearTimeout(descTimerRef.current); descTimerRef.current = undefined }
  if (coverTimerRef.current) { clearTimeout(coverTimerRef.current); coverTimerRef.current = undefined }
  const promises: Promise<void>[] = []
  if (descDirtyRef.current) promises.push(autoSaveDesc(description))
  if (coverDirtyRef.current) promises.push(autoSaveCover(coverprompt))
  await Promise.race([Promise.all(promises), new Promise<void>(r => setTimeout(r, 3000))])
  onClose()
}, [description, coverprompt, autoSaveDesc, autoSaveCover, onClose])
```

同时需要新增 import：
```tsx
import { editMaterial, updateMaterialContext } from '@/lib/api/batch-publish'
import { useQueryClient } from '@tanstack/react-query'
```

并在组件内获取 `queryClient`：
```tsx
const queryClient = useQueryClient()
```

- [ ] **Step 5: 替换描述 textarea 为自动保存版本**

```tsx
{/* 替换现有的描述 textarea（约第 177-184 行） */}
<textarea
  value={description}
  onChange={handleDescChange}
  onBlur={handleDescBlur}
  rows={8}
  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
  style={{ minHeight: 200 }}
  placeholder="商品描述文案"
/>
```

- [ ] **Step 6: 在描述 section 之后新增封面提示词 section，且图片操作改为自动保存**

```tsx
{/* 图片操作改为自动保存 */}
{/* 修改 handleImageUpload — 上传成功后自动保存 */}
const handleImageUpload = async (file: File) => {
  setUploadingIndex(images.length)
  try {
    const uploaded = await uploadFileToFlare(file, material.to_uid ?? undefined)
    const nextImages = [...images, uploaded as MaterialImage]
    setImages(nextImages)
    // 自动保存图片变更（无防抖）
    await editMaterial({ id: material.id, images: nextImages })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
  } catch {
    // silent
  } finally {
    setUploadingIndex(null)
  }
}

{/* 修改 handleImageDelete — 删除后自动保存 */}
const handleImageDelete = async (index: number) => {
  const nextImages = images.filter((_, i) => i !== index)
  setImages(nextImages)
  try {
    await editMaterial({ id: material.id, images: nextImages.length > 0 ? nextImages : undefined })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
  } catch { /* silent */ }
}

{/* handleImageMoveUp / handleImageMoveDown 同理 — 移动后自动保存 */}
const handleImageMoveUp = async (index: number) => {
  if (index <= 0) return
  const nextImages = [...images]
  const temp = nextImages[index - 1]
  nextImages[index - 1] = nextImages[index]
  nextImages[index] = temp
  setImages(nextImages)
  try {
    await editMaterial({ id: material.id, images: nextImages })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
  } catch { /* silent */ }
}

{/* handleImageMoveDown 同理 */}

{/* 在描述 </section> 之后插入封面提示词 section */}
<section className="space-y-4">
  <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">封面绘画提示词</h4>
  <textarea
    value={coverprompt}
    onChange={handleCoverChange}
    onBlur={handleCoverBlur}
    rows={4}
    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
    placeholder="例如：白色背景，柔和自然光，产品居中构图..."
  />
</section>
```

- [ ] **Step 7: 移除 AI 上下文配置 section + 清理关联代码**

删除整个 AI 上下文 section（约第 188-260 行，即 `<section className="space-y-4">` 中含 `<h4>AI 上下文配置</h4>` 的整个区块）。

删除以下状态变量和函数（已不再使用）：
- `templateType` 状态
- `selectedGids` 状态
- `toggleGid` 函数
- `handleSaveContext` 函数
- `handleSaveMaterial` 函数（改用自动保存）

删除 `isSaving` 变量（改用 `descSavingRef` + `coverSavingRef`）。

- [ ] **Step 8: 替换底部按钮区**

```tsx
{/* 替换现有底部按钮区，去掉手动保存按钮 */}
<div className="flex gap-2 pt-3 border-t border-gray-100">
  <p className="flex-1 flex items-center gap-1.5 text-xs text-green-600">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    所有改动已自动保存
  </p>
  <button
    onClick={handleCloseWithFlush}
    disabled={descSavingRef.current || coverSavingRef.current}
    className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
  >
    {descSavingRef.current || coverSavingRef.current ? '保存中...' : '关闭'}
  </button>
</div>
```

- [ ] **Step 9: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 10: Commit**

```bash
git add components/batch-publish/workbench/MaterialEditSheet.tsx
git commit -m "feat: add auto-save, coverprompt editing, remove AI context section from sidebar

- Auto-save: onBlur immediate + 1s debounce during typing
- New coverprompt textarea with same auto-save behavior
- Removed AI context configuration section (moved to AIContextModal)
- Replaced manual save buttons with auto-save indicator + close

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: MaterialWorkspace — 移除 ReferencePanel + 新增 prop

**Files:**
- Modify: `components/batch-publish/workbench/MaterialWorkspace.tsx`

- [ ] **Step 1: 更新 Props 接口**

```tsx
// MaterialWorkspace.tsx，替换 MaterialWorkspaceProps
interface MaterialWorkspaceProps {
  opportunity: OpportunityItem | null
  materials: PublishMaterial[]
  materialLoading: boolean
  materialError: unknown
  materialRefetch: () => void
  selectedMaterialIds: Set<number>
  onToggleSelect: (id: number) => void
  onClearSelection: () => void
  onOpenEditor: (id: number) => void
  onOpenContextModal: (id: number) => void   // ← NEW
  onCreateClick: () => void
  selectedOid: number | undefined
  page: number
  total: number
  onPageChange: (p: number) => void
  onBackToOverview: () => void
  materialPage: number
}
```

移除 `monitoredItems: MonitoredItem[]` 和 `monitoredLoading: boolean`。

- [ ] **Step 2: 更新组件解构**

```tsx
export function MaterialWorkspace({
  opportunity, materials, materialLoading, materialError, materialRefetch,
  selectedMaterialIds, onToggleSelect, onClearSelection, onOpenEditor,
  onOpenContextModal, onCreateClick, selectedOid,
  page, total, onPageChange,
  onBackToOverview, materialPage,
}: MaterialWorkspaceProps) {
```

移除 `monitoredItems`, `monitoredLoading`。

- [ ] **Step 3: 移除 ReferencePanel**

删除 `<ReferencePanel ... />` 整段（约第 99-103 行）。

- [ ] **Step 4: MaterialRow 传递新 prop**

```tsx
{/* 在 MaterialRow 调用处添加 onOpenContextModal */}
{materials.map((m) => (
  <MaterialRow
    key={m.id}
    materialId={m.id}
    isSelected={selectedMaterialIds.has(m.id)}
    onToggleSelect={onToggleSelect}
    onOpenSheet={onOpenEditor}
    onOpenContextModal={onOpenContextModal}
    selectedOid={selectedOid}
    materialPage={materialPage}
  />
))}
```

- [ ] **Step 5: 移除未使用的 import**

删除 `ReferencePanel` import。

删除 `MonitoredItem` import（如果只有这里用到）。

- [ ] **Step 6: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 7: Commit**

```bash
git add components/batch-publish/workbench/MaterialWorkspace.tsx
git commit -m "feat: remove ReferencePanel, add onOpenContextModal prop to MaterialWorkspace

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: WorkbenchTab — 连线 AIContextModal + 移除 monitoredItems 传递

**Files:**
- Modify: `components/batch-publish/workbench/WorkbenchTab.tsx`

- [ ] **Step 1: 新增 import**

```tsx
// WorkbenchTab.tsx，在现有 import 中添加
import { AIContextModal } from './AIContextModal'
```

- [ ] **Step 2: 新增状态**

```tsx
// WorkbenchTab.tsx，在现有 useState 声明区添加
const [contextMaterialId, setContextMaterialId] = useState<number | null>(null)
```

- [ ] **Step 3: MaterialWorkspace 更新 props（PC 和 Mobile 两处）**

两处 `<MaterialWorkspace>` 中：
- 移除 `monitoredItems={page.monitoredItems}`
- 移除 `monitoredLoading={page.monitoredLoading}`
- 添加 `onOpenContextModal={setContextMaterialId}`

- [ ] **Step 4: 在 MaterialEditSheet 旁渲染 AIContextModal（PC 和 Mobile 两处）**

在 `<MaterialEditSheet ... />` 之后添加：

```tsx
<AIContextModal
  materialId={contextMaterialId}
  selectedOid={page.selectedOid}
  open={contextMaterialId !== null}
  onClose={() => setContextMaterialId(null)}
  monitoredItems={page.monitoredItems}
  materials={page.materials}
/>
```

- [ ] **Step 5: TypeScript 类型检查**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 6: Commit**

```bash
git add components/batch-publish/workbench/WorkbenchTab.tsx
git commit -m "feat: wire AIContextModal into WorkbenchTab, remove monitoredItems from MaterialWorkspace

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: 清理 — 删除 ReferencePanel 和 ReferenceCard

**Files:**
- Delete: `components/batch-publish/workbench/ReferencePanel.tsx`
- Delete: `components/batch-publish/workbench/ReferenceCard.tsx`

- [ ] **Step 1: 删除文件**

```bash
rm components/batch-publish/workbench/ReferencePanel.tsx
rm components/batch-publish/workbench/ReferenceCard.tsx
```

- [ ] **Step 2: 检查是否有其他文件引用这两个组件**

Run: `npx tsc --noEmit --pretty`

If errors: fix any remaining import references to these deleted files.

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/workbench/ReferencePanel.tsx components/batch-publish/workbench/ReferenceCard.tsx
git commit -m "refactor: remove ReferencePanel and ReferenceCard (replaced by AIContextModal)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: 最终验证

- [ ] **Step 1: TypeScript 全量检查**

```bash
npx tsc --noEmit --pretty
```

Expected: 零错误。

- [ ] **Step 2: 检查未使用的 import**

搜索可能残留的 import：

```bash
# 检查 ReferencePanel / ReferenceCard 引用是否已全部清理
npx tsc --noEmit --pretty 2>&1 | grep -i "reference"
```

Expected: 无输出。

- [ ] **Step 3: 验证 MonitoredItem type import**

确认 `MonitoredItem` type 在 `MaterialWorkspace.tsx` 中已不再 import（已移到 WorkbenchTab 层级）。Run type check to confirm.

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification after material table enhancement

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 实施顺序依赖

```
Task 1 (API) ─────────────────────────────────────────────────────────────┐
Task 2 (Constants) ───────────────────────────────────────────────────────┤
Task 3 (AIContextModal) ← depends on Task 1 ──────────────────────────────┤
Task 4 (MaterialRow) ← depends on Task 2 ─────────────────────────────────┤
Task 5 (MaterialCard) ← depends on Task 2 ────────────────────────────────┤
Task 6 (MaterialEditSheet) ← depends on Task 1 ───────────────────────────┤
Task 7 (MaterialWorkspace) ← depends on Task 4 ───────────────────────────┤
Task 8 (WorkbenchTab) ← depends on Task 3, Task 7 ────────────────────────┤
Task 9 (Cleanup) ← depends on Task 7 ─────────────────────────────────────┤
Task 10 (Verification) ← depends on ALL ──────────────────────────────────┘
```

**并行执行建议：**
- Task 1 + Task 2 可并行
- Task 3 + Task 4 + Task 5 + Task 6 可并行（前提是 Task 1, 2 完成）
- Task 7 依赖 Task 4（MaterialRow 的 props 已更新）
- Task 8 依赖 Task 3 + Task 7
- Task 9 依赖 Task 7
