# TextEditor 文本编辑组件 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 4 个抽屉文件的 textarea 中抽象出 `TextEditor` UI 组件，支持 PC / 移动横屏 / 移动竖屏响应式适配，允许用户拖拽调整大小。

**Architecture:** 新建 `components/ui/text-editor.tsx`，内部用 `useIsMobile()` + `matchMedia("orientation: portrait")` 自动检测设备形态，通过 `...rest` 透传所有原生 textarea 属性，同时兼容受控模式（value/onChange）和 react-hook-form 模式（register）。4 个调用方各替换 textarea 为 TextEditor。

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, react-hook-form

---

### Task 1: 创建 TextEditor 组件

**Files:**
- Create: `components/ui/text-editor.tsx`

- [ ] **Step 1: 写入 TextEditor 组件**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/useIsMobile"

type Device = "pc" | "mobile-landscape" | "mobile-portrait"

interface TextEditorProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  /** 覆盖响应式行数默认值，传数字则固定行数 */
  rows?: number | { pc?: number; landscape?: number; portrait?: number }
  /** 强制指定设备模式，不传则自动检测 */
  device?: Device
}

const DEFAULT_ROWS: Record<Device, number> = {
  pc: 6,
  "mobile-landscape": 4,
  "mobile-portrait": 3,
}

const DEVICE_PADDING: Record<Device, string> = {
  pc: "px-3 py-2.5",
  "mobile-landscape": "px-3 py-2",
  "mobile-portrait": "px-2.5 py-2",
}

function resolveRows(
  rows: TextEditorProps["rows"],
  device: Device
): number {
  if (typeof rows === "number") return rows
  const defaults = { ...DEFAULT_ROWS, ...rows }
  return defaults[device]
}

export function TextEditor({
  rows,
  device: deviceProp,
  className,
  ...rest
}: TextEditorProps) {
  const isMobile = useIsMobile()
  const [isPortrait, setIsPortrait] = useState(true)

  useEffect(() => {
    if (!isMobile) return
    const mql = window.matchMedia("(orientation: portrait)")
    setIsPortrait(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [isMobile])

  const device =
    deviceProp ??
    (isMobile ? (isPortrait ? "mobile-portrait" : "mobile-landscape") : "pc")

  const resolvedRows = resolveRows(rows, device)
  const padding = DEVICE_PADDING[device]

  return (
    <textarea
      rows={resolvedRows}
      className={`w-full text-sm border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${padding} ${className ?? ""}`}
      {...rest}
    />
  )
}
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 零错误（新组件无引用方，不会引入新错误）

- [ ] **Step 3: 提交**

```bash
git add components/ui/text-editor.tsx
git commit -m "feat: add TextEditor responsive component

- Auto-detects pc / mobile-landscape / mobile-portrait
- Supports both controlled (value/onChange) and react-hook-form (register) modes
- Native browser resize enabled
- Responsive rows and padding per device type

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: ConfigDrawer 替换 textarea

**Files:**
- Modify: `components/items/drawers/ConfigDrawer.tsx`

- [ ] **Step 1: 导入 TextEditor，替换 textarea**

找到第 58-66 行的 `<textarea>` 块，替换为 `<TextEditor>`。

**Before (lines 57-66):**
```tsx
      {/* 文本输入 */}
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onDrop={isMobile ? undefined : handleDrop}
        onDragOver={isMobile ? undefined : (e) => e.preventDefault()}
        rows={isMobile ? 5 : 6}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        placeholder="输入内容..."
      />
```

**After:**
```tsx
      {/* 文本输入 */}
      <TextEditor
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onDrop={isMobile ? undefined : handleDrop}
        onDragOver={isMobile ? undefined : (e) => e.preventDefault()}
        rows={{ pc: 6, landscape: 5, portrait: 5 }}
        placeholder="输入内容..."
      />
```

同时在文件顶部 import 区域添加：
```tsx
import { TextEditor } from "@/components/ui/text-editor"
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 零错误

- [ ] **Step 3: 提交**

```bash
git add components/items/drawers/ConfigDrawer.tsx
git commit -m "refactor: replace textarea with TextEditor in ConfigDrawer

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: ItemEditDrawer 替换 6 处 textarea

**Files:**
- Modify: `components/items/drawers/ItemEditDrawer.tsx`

- [ ] **Step 1: 导入 TextEditor**

在文件顶部 import 区域添加：
```tsx
import { TextEditor } from "@/components/ui/text-editor"
```

- [ ] **Step 2: 替换「商品描述」textarea（约第 144 行）**

**Before:**
```tsx
        <textarea
          {...register("description")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="商品描述"
        />
```

**After:**
```tsx
        <TextEditor
          {...register("description")}
          rows={3}
          placeholder="商品描述"
        />
```

- [ ] **Step 3: 替换「默认回复内容」textarea（约第 195 行）**

**Before:**
```tsx
        <textarea
          {...register("default_reply_content")}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="未匹配关键词时的默认回复"
        />
```

**After:**
```tsx
        <TextEditor
          {...register("default_reply_content")}
          rows={2}
          placeholder="未匹配关键词时的默认回复"
        />
```

- [ ] **Step 4: 替换「商品提示词」textarea（约第 224 行）**

**Before:**
```tsx
              <textarea
                {...register("ai_reply_item_prompt")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="AI回复的商品相关提示词"
              />
```

**After:**
```tsx
              <TextEditor
                {...register("ai_reply_item_prompt")}
                rows={2}
                placeholder="AI回复的商品相关提示词"
              />
```

- [ ] **Step 5: 替换「发货内容」textarea（约第 267 行）**

**Before:**
```tsx
              <textarea
                {...register("deliveryContent")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="例如: 亲，宝贝已发出哦~{分段符}请注意查收~"
              />
```

**After:**
```tsx
              <TextEditor
                {...register("deliveryContent")}
                rows={2}
                placeholder="例如: 亲，宝贝已发出哦~{分段符}请注意查收~"
              />
```

- [ ] **Step 6: 替换「收货后赠送内容」textarea（约第 276 行）**

**Before:**
```tsx
              <textarea
                {...register("receiptAfter")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="买家确认收货后自动发送"
              />
```

**After:**
```tsx
              <TextEditor
                {...register("receiptAfter")}
                rows={2}
                placeholder="买家确认收货后自动发送"
              />
```

- [ ] **Step 7: 替换「好评后赠送内容」textarea（约第 285 行）**

**Before:**
```tsx
              <textarea
                {...register("positiveReviewAfter")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="买家好评后自动发送"
              />
```

**After:**
```tsx
              <TextEditor
                {...register("positiveReviewAfter")}
                rows={2}
                placeholder="买家好评后自动发送"
              />
```

- [ ] **Step 8: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 零错误

- [ ] **Step 9: 提交**

```bash
git add components/items/drawers/ItemEditDrawer.tsx
git commit -m "refactor: replace 6 textareas with TextEditor in ItemEditDrawer

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: KeywordRuleForm 替换 textarea

**Files:**
- Modify: `components/items/parts/KeywordRuleForm.tsx`

- [ ] **Step 1: 导入 TextEditor**

在文件顶部 import 区域添加：
```tsx
import { TextEditor } from "@/components/ui/text-editor"
```

- [ ] **Step 2: 替换「回复内容」textarea（约第 248 行）**

**Before:**
```tsx
              <textarea
                {...register("reply_content")}
                rows={5}
                onDrop={handleReplyContentDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm"
                placeholder="当消息匹配时，自动发送此回复内容"
              />
```

**After:**
```tsx
              <TextEditor
                {...register("reply_content")}
                rows={5}
                onDrop={handleReplyContentDrop}
                onDragOver={(e) => e.preventDefault()}
                placeholder="当消息匹配时，自动发送此回复内容"
              />
```

- [ ] **Step 3: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```
Expected: 零错误

- [ ] **Step 4: 提交**

```bash
git add components/items/parts/KeywordRuleForm.tsx
git commit -m "refactor: replace textarea with TextEditor in KeywordRuleForm

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 全量 TypeScript 检查 + 验证

**Files:**
- Verify: `components/ui/text-editor.tsx`
- Verify: `components/items/drawers/ConfigDrawer.tsx`
- Verify: `components/items/drawers/ItemEditDrawer.tsx`
- Verify: `components/items/parts/KeywordRuleForm.tsx`

- [ ] **Step 1: 全量 TypeScript 编译**

```bash
npx tsc --noEmit --pretty
```
Expected: 零错误

- [ ] **Step 2: 确认无遗漏 — 搜索残留的 `<textarea`**

```bash
grep -rn "<textarea" components/items/
```
Expected: 无输出（全部已替换为 TextEditor）

- [ ] **Step 3: 提交（如有未提交内容）**

```bash
git status
```
如果 clean 则跳过提交。
