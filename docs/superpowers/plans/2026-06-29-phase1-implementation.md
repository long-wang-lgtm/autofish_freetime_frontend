# Phase 1: 删死代码 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 3 处死代码：selection.store.ts（零引用）、TabBar inset 变体（全项目使用 overline）、axios 依赖（零 import）

**Architecture:** 纯删除操作，无新代码。每项删除后更新相关文档引用（KNOWN_ISSUES.md、CLAUDE.md、COMPONENTS.md）。

**Tech Stack:** Next.js 14, TypeScript, npm

---

### Task 1: 删除 stores/selection.store.ts

**Files:**
- Delete: `stores/selection.store.ts`
- Modify: `.claude/docs/KNOWN_ISSUES.md` (标记 #25 已修复)
- Modify: `.claude/docs/COMPONENTS.md` (移除 useSelectionStore 条目)
- Modify: `CLAUDE.md` (标记 Phase 1 该项完成)

- [ ] **Step 1: 确认零引用**

验证全项目无代码文件引用此 store（docs 目录下的文档引用除外）：
```bash
rg "selection\.store|from.*stores/selection" --type ts --type tsx frontend/
```
预期：仅在 `.claude/` 和 `docs/` 目录下有匹配（文档引用），无 `.ts`/`.tsx` 源码引用。

- [ ] **Step 2: 删除 selection.store.ts**

```bash
git rm stores/selection.store.ts
```

- [ ] **Step 3: 更新 COMPONENTS.md — 删除 useSelectionStore 条目**

文件：`.claude/docs/COMPONENTS.md`

删除 Stores 表格中的第 183 行：
```markdown
| `useSelectionStore` | `stores/selection.store.ts` | 选品状态 | ⚠️ 零引用，标记删除 |
```

修改后 Stores 表格应只保留 `useAuth` 一行。

- [ ] **Step 4: 更新 KNOWN_ISSUES.md — 标记 #25 已修复**

文件：`.claude/docs/KNOWN_ISSUES.md`

将 #25 标题从：
```markdown
### #25 stores/selection.store.ts 零引用
```
改为：
```markdown
### #25 stores/selection.store.ts 零引用 ✅ 已修复 (Phase 1, 2026-06-29)
```

并在表格中添加修复信息：
```markdown
| **修复** | 已删除该文件 |
```

同时更新底部统计：低严重度数量从 6 减为 5，已修复从 1 增为 2，合计更新。

- [ ] **Step 5: 更新 CLAUDE.md — 标记此项完成**

文件：`CLAUDE.md`

在 Phase 1 完成标准中将：
```markdown
**完成标准**：selection.store.ts 已删除、inset 变体已删除、axios 已从 dependencies 移除
```

改为：
```markdown
**完成标准**：selection.store.ts ✅ 已删除、inset 变体已删除、axios 已从 dependencies 移除
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: 删除 stores/selection.store.ts（零引用死代码）

- 删除 stores/selection.store.ts（全项目无 import 引用）
- 更新 COMPONENTS.md 移除 useSelectionStore 条目
- 更新 KNOWN_ISSUES.md #25 标记为已修复
- 更新 CLAUDE.md Phase 1 进度

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 删除 TabBar inset 变体

**Files:**
- Modify: `components/ui/Tab/index.tsx` (删除 inset 变体代码)
- Modify: `.claude/docs/KNOWN_ISSUES.md` (标记 #24 已修复)
- Modify: `.claude/docs/COMPONENTS.md` (更新 TabBar Props 描述)
- Modify: `CLAUDE.md` (标记此项完成)

- [ ] **Step 1: 确认零使用**

验证全项目无 `variant="inset"` 使用：
```bash
rg "variant.*=.*['\"]inset['\"]" --type ts --type tsx frontend/
```
预期：仅在 `components/ui/Tab/index.tsx` 内部有匹配（定义处），无外部调用方。

- [ ] **Step 2: 删除 TabVariant 类型中的 'inset'**

文件：`components/ui/Tab/index.tsx`，第 8 行

```diff
-/** Tab 样式变体 */
-export type TabVariant = 'inset' | 'overline'
+/** Tab 样式变体（仅 overline） */
+export type TabVariant = 'overline'
```

注意：`TabVariant` 类型在 #12（统一 API 调用）完成前仍保留供可能的类型引用。若 Phase 2 发现无外部引用，可在当时进一步简化为内联字面量。

- [ ] **Step 3: 删除 variant prop 的 inset 注释**

文件：`components/ui/Tab/index.tsx`，第 20 行

```diff
-  /** inset = 栏在容器内，overline = 栏在容器外 */
+  /** Tab 栏样式（栏在容器外，底部边框指示器） */
   variant?: TabVariant
```

- [ ] **Step 4: 将默认值从 'inset' 改为 'overline'**

文件：`components/ui/Tab/index.tsx`，第 49 行

```diff
-export function TabBar({ tabs, activeTab, onTabChange, variant = 'inset' }: TabBarProps) {
+export function TabBar({ tabs, activeTab, onTabChange, variant = 'overline' }: TabBarProps) {
```

- [ ] **Step 5: 删除 inset 变体的整个 return 块（第 77-99 行）**

文件：`components/ui/Tab/index.tsx`

删除从第 77 行到第 99 行的 inset 分支（包括注释和 return 语句）：
```tsx
// 删除以下全部内容：
  // inset — 栏在容器内，tab 栏本身带卡片背景
  return (
    <div className={`bg-white rounded-xl ${isMobile ? 'px-3' : 'px-5'}`}>
      <div className={`flex ${size === 'pc' ? 'gap-6' : 'gap-1 overflow-x-auto hide-scrollbar tab-mask'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 font-medium border-b-2 transition-all ${
              isMobile ? `whitespace-nowrap ${sizeStyles.button}` : 'py-4 text-sm'
            } ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
```

删除后，函数体末尾只剩 `}` 闭合函数。

- [ ] **Step 6: 简化 variant === 'overline' 条件判断**

由于现在只剩一种变体，可以删除 `if (variant === 'overline')` 条件判断和对应的闭合括号。

文件：`components/ui/Tab/index.tsx`，第 54 行

```diff
-  if (variant === 'overline') {
-    return (
-      <div className="border-b border-gray-200">
-        ...
-      </div>
-    )
-  }
+  return (
+    <div className="border-b border-gray-200">
+      ...
+    </div>
+  )
```

即：删除 `if (variant === 'overline') {` 和对应的 `}`，直接将 overline 分支作为函数体的唯一返回。

- [ ] **Step 7: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```
预期：与 TabBar 相关的类型错误为零（可能有既存的 `.next/types` 错误，忽略）。

- [ ] **Step 8: 更新 COMPONENTS.md — 更新 TabBar 描述**

文件：`.claude/docs/COMPONENTS.md`，第 17 行

```diff
-| `TabBar` | `ui/Tab/index.tsx` | 核心 Tab 组件，支持 overline/inset 变体，响应式三档 | `tabs`, `activeTab`, `onTabChange`, `variant?` |
+| `TabBar` | `ui/Tab/index.tsx` | 核心 Tab 组件，overline 样式，响应式三档 | `tabs`, `activeTab`, `onTabChange` |
```

- [ ] **Step 9: 更新 KNOWN_ISSUES.md — 标记 #24 已修复**

文件：`.claude/docs/KNOWN_ISSUES.md`

将 #24 标题改为：
```markdown
### #24 TabBar inset 变体未被使用 ✅ 已修复 (Phase 1, 2026-06-29)
```

更新底部统计：低严重度数量从 5 减为 4，已修复从 2 增为 3。

- [ ] **Step 10: 更新 CLAUDE.md — 标记此项完成**

文件：`CLAUDE.md`

```diff
-**完成标准**：selection.store.ts ✅ 已删除、inset 变体已删除、axios 已从 dependencies 移除
+**完成标准**：selection.store.ts ✅ 已删除、inset 变体 ✅ 已删除、axios 已从 dependencies 移除
```

- [ ] **Step 11: 提交**

```bash
git add -A
git commit -m "refactor: 删除 TabBar inset 变体（全项目仅使用 overline）

- 从 TabVariant 类型中移除 'inset'
- 默认 variant 从 'inset' 改为 'overline'
- 删除 inset 变体的完整渲染分支（23 行）
- 简化 overline 分支为函数唯一返回
- 更新 COMPONENTS.md 移除 inset 变体引用
- 更新 KNOWN_ISSUES.md #24 标记为已修复
- 更新 CLAUDE.md Phase 1 进度

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 移除 axios 依赖

**Files:**
- Modify: `package.json` (删除 axios 行)
- Modify: `package-lock.json` (由 npm uninstall 自动更新)
- Modify: `.claude/docs/KNOWN_ISSUES.md` (标记 #21 已修复)
- Modify: `CLAUDE.md` (标记 Phase 1 全部完成)

- [ ] **Step 1: 确认零 import**

```bash
rg "import.*axios|require.*axios|from\s+['\"]axios['\"]" --type ts --type tsx --type js frontend/
```
预期：零匹配。

- [ ] **Step 2: 卸载 axios**

```bash
npm uninstall axios
```

这会自动从 `package.json` 的 `dependencies` 中移除 axios，并更新 `package-lock.json`。

- [ ] **Step 3: 验证构建**

```bash
npm run build 2>&1 | tail -20
```
预期：`✓ Compiled successfully`，`✓ Generating static pages`。

- [ ] **Step 4: 更新 KNOWN_ISSUES.md — 标记 #21 已修复**

文件：`.claude/docs/KNOWN_ISSUES.md`

将 #21 标题改为：
```markdown
### #21 axios 在 package.json 中但未被使用 ✅ 已修复 (Phase 1, 2026-06-29)
```

更新底部统计：低严重度数量从 4 减为 3，已修复从 3 增为 4。

- [ ] **Step 5: 更新 CLAUDE.md — 标记 Phase 1 全部完成**

文件：`CLAUDE.md`

```diff
-### Phase 1: 删死代码
-**完成标准**：selection.store.ts ✅ 已删除、inset 变体 ✅ 已删除、axios 已从 dependencies 移除
+### Phase 1: 删死代码 ✅ 已完成 (2026-06-29)
+**完成标准**：selection.store.ts ✅ 已删除、inset 变体 ✅ 已删除、axios ✅ 已从 dependencies 移除
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: 移除 axios 依赖（全项目零 import）

- npm uninstall axios（全项目使用原生 fetch）
- 更新 KNOWN_ISSUES.md #21 标记为已修复
- 更新 CLAUDE.md Phase 1 标记为已完成

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 最终验证

全部 3 个 Task 完成后：

- [ ] **验证 1：确认 selection.store.ts 已删除**

```bash
test -f stores/selection.store.ts && echo "EXISTS" || echo "DELETED"
```
预期：`DELETED`

- [ ] **验证 2：确认 TabBar 无 inset 残留**

```bash
rg "inset" components/ui/Tab/index.tsx
```
预期：零匹配。

- [ ] **验证 3：确认 axios 已移除**

```bash
node -e "const pkg = require('./package.json'); console.log('axios' in (pkg.dependencies || {}))"
```
预期：`false`

- [ ] **验证 4：构建通过**

```bash
npm run build 2>&1 | tail -5
```
预期：无新增错误。

---

## 风险与依赖

| 风险 | 缓解 |
|------|------|
| `TabVariant` 外部引用 | 已通过 grep 确认零外部引用，`TabVariant` 仅在本文件内使用 |
| `selection.store.ts` 被懒加载引用 | 已通过 grep 确认零 import（包括 `import()` 动态导入） |
| `axios` 被间接依赖引用 | axios 非其他包的 peerDep，卸载安全 |
| npm uninstall 产生大量 lockfile diff | lockfile 变更是预期行为，仅记录在 commit 中 |
