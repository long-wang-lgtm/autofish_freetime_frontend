# TextEditor maxHeight 约束 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 TextEditor 增加 `maxHeight` prop，调用方传入最大可用空间，防止 textarea 拖拽撑破外层 Sheet/BottomSheet 容器。

**Architecture:** TextEditor 新增 `maxHeight?: string` prop，应用到 `<textarea style={{ maxHeight }}>`。各调用方根据自身布局传入 `vh` 单位值（ConfigDrawer: `40vh`，ItemEditDrawer: `30vh`，KeywordRuleForm: `35vh`）。

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3

---

### Task 1: TextEditor 新增 maxHeight prop

**Files:**
- Modify: `components/ui/text-editor.tsx`

- [ ] **Step 1: 在 TextEditorProps 中新增 maxHeight，应用到 textarea**

找到 interface TextEditorProps（约第 8 行），新增 `maxHeight` 字段：

```tsx
interface TextEditorProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  rows?: number | { pc?: number; landscape?: number; portrait?: number }
  device?: Device
  /** 最大高度（CSS 值），防止 textarea 拖拽撑破外层容器。如 "40vh"、"300px" */
  maxHeight?: string
}
```

找到函数签名解构（约第 37 行），加入 `maxHeight`：

```tsx
export function TextEditor({
  rows,
  device: deviceProp,
  className,
  maxHeight,
  ...rest
}: TextEditorProps) {
```

找到 `<textarea>` 的 return（约第 67 行），给 `<textarea>` 加 `style`：

```tsx
  return (
    <textarea
      rows={resolvedRows}
      style={maxHeight ? { maxHeight } : undefined}
      className={`w-full text-sm border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${padding} ${className ?? ""}`}
      {...rest}
    />
  )
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: 零错误

- [ ] **Step 3: 提交**

```bash
git add components/ui/text-editor.tsx
git commit -m "feat: add maxHeight prop to TextEditor

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: ConfigDrawer 传入 maxHeight

**Files:**
- Modify: `components/items/drawers/ConfigDrawer.tsx`

- [ ] **Step 1: 给 TextEditor 加 maxHeight="40vh"**

找到 TextEditor 使用处（约第 59 行），加入 `maxHeight`：

```tsx
      <TextEditor
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onDrop={isMobile ? undefined : handleDrop}
        onDragOver={isMobile ? undefined : (e) => e.preventDefault()}
        rows={{ pc: 6, landscape: 5, portrait: 5 }}
        maxHeight="40vh"
        placeholder="输入内容..."
      />
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: 零错误

- [ ] **Step 3: 提交**

```bash
git add components/items/drawers/ConfigDrawer.tsx
git commit -m "feat: pass maxHeight to TextEditor in ConfigDrawer

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: ItemEditDrawer 6 处 TextEditor 传入 maxHeight

**Files:**
- Modify: `components/items/drawers/ItemEditDrawer.tsx`

- [ ] **Step 1: 6 处 TextEditor 各加 maxHeight="30vh"**

**第 1 处 — 商品描述（约第 145 行）：**
```tsx
        <TextEditor
          {...register("description")}
          rows={3}
          maxHeight="30vh"
          placeholder="商品描述"
        />
```

**第 2 处 — 默认回复内容（约第 195 行）：**
```tsx
        <TextEditor
          {...register("default_reply_content")}
          rows={2}
          maxHeight="30vh"
          placeholder="未匹配关键词时的默认回复"
        />
```

**第 3 处 — 商品提示词（约第 223 行）：**
```tsx
              <TextEditor
                {...register("ai_reply_item_prompt")}
                rows={2}
                maxHeight="30vh"
                placeholder="AI回复的商品相关提示词"
              />
```

**第 4 处 — 发货内容（约第 265 行）：**
```tsx
              <TextEditor
                {...register("deliveryContent")}
                rows={2}
                maxHeight="30vh"
                placeholder="例如: 亲，宝贝已发出哦~{分段符}请注意查收~"
              />
```

**第 5 处 — 收货后赠送内容（约第 273 行）：**
```tsx
              <TextEditor
                {...register("receiptAfter")}
                rows={2}
                maxHeight="30vh"
                placeholder="买家确认收货后自动发送"
              />
```

**第 6 处 — 好评后赠送内容（约第 281 行）：**
```tsx
              <TextEditor
                {...register("positiveReviewAfter")}
                rows={2}
                maxHeight="30vh"
                placeholder="买家好评后自动发送"
              />
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: 零错误

- [ ] **Step 3: 提交**

```bash
git add components/items/drawers/ItemEditDrawer.tsx
git commit -m "feat: pass maxHeight to TextEditor in ItemEditDrawer

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: KeywordRuleForm 传入 maxHeight

**Files:**
- Modify: `components/items/parts/KeywordRuleForm.tsx`

- [ ] **Step 1: 给 TextEditor 加 maxHeight="35vh"**

找到 TextEditor 使用处（约第 249 行），加入 `maxHeight`：

```tsx
              <TextEditor
                {...register("reply_content")}
                rows={5}
                maxHeight="35vh"
                onDrop={handleReplyContentDrop}
                onDragOver={(e) => e.preventDefault()}
                placeholder="当消息匹配时，自动发送此回复内容"
              />
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```
Expected: 零错误

- [ ] **Step 3: 提交**

```bash
git add components/items/parts/KeywordRuleForm.tsx
git commit -m "feat: pass maxHeight to TextEditor in KeywordRuleForm

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 全量 TypeScript 检查

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

- [ ] **Step 2: 提交（如有未提交内容）**

```bash
git status
```
如果 clean 则跳过。
