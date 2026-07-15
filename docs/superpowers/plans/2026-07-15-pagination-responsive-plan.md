# Pagination 响应式自适应 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagination 组件根据容器宽度自动切换四档布局（@xs/@sm/@md/@lg+），窄容器中不再溢出。

**Architecture:** 安装 `@tailwindcss/container-queries` 插件，Pagination 外层标记 `@container`，内部四个 `<div>` 各自绑定不同容器断点 visibility class（`hidden @xs:flex` 等），CSS 根据容器宽度自动显示/隐藏对应布局。

**Tech Stack:** React + TypeScript + Tailwind CSS v3 + @tailwindcss/container-queries

---

### Task 1: 安装 @tailwindcss/container-queries 插件

**Files:**
- Modify: `package.json`
- Modify: `tailwind.config.js`

- [ ] **Step 1: 安装 npm 依赖**

```bash
cd frontend && npm install -D @tailwindcss/container-queries
```

- [ ] **Step 2: 注册 Tailwind 插件**

编辑 `tailwind.config.js`，在 `plugins` 数组中添加：

```js
plugins: [require("tailwindcss-animate"), require("@tailwindcss/container-queries")],
```

- [ ] **Step 3: 验证插件加载**

```bash
cd frontend && npx tailwindcss --help 2>&1 | head -5
```

Expected: 正常输出帮助信息，无报错。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tailwind.config.js
git commit -m "chore: add @tailwindcss/container-queries plugin"
```

---

### Task 2: 重写 Pagination 组件 — 四档容器查询自适应

**Files:**
- Modify: `components/ui/data/Pagination.tsx`

- [ ] **Step 1: 提取页码生成逻辑为纯函数**

将当前组件内的页码生成逻辑提取到组件外部，四档渲染共用：

```tsx
'use client'

function buildPages(page: number, totalPages: number): (number | '...')[] {
  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages
}
```

- [ ] **Step 2: 实现完整组件**

替换整个 `Pagination` 函数：

```tsx
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const pages = buildPages(page, totalPages)

  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  // ---- 共享按钮样式 ----
  const btnBase =
    'rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
  const activeBtn = 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'

  return (
    <div className="@container border-t border-gray-100">

      {/* ====== @xs: < 256px — 纯箭头 + 页码 ====== */}
      <div className="hidden @xs:flex items-center justify-center gap-1.5 px-2 py-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-2 py-1 text-xs ${btnBase}`}
          aria-label="上一页"
        >
          ←
        </button>
        <span className="text-xs text-gray-600 tabular-nums whitespace-nowrap">
          第 {page}/{totalPages} 页
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-2 py-1 text-xs ${btnBase}`}
          aria-label="下一页"
        >
          →
        </button>
      </div>

      {/* ====== @sm: 256–384px — 文字按钮 + 页码 ====== */}
      <div className="hidden @sm:flex @md:hidden items-center justify-center gap-1.5 px-3 py-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          上一页
        </button>
        <span className="text-sm text-gray-600 tabular-nums whitespace-nowrap">
          第 {page}/{totalPages} 页
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          下一页
        </button>
      </div>

      {/* ====== @md: 384–512px — 简化页码按钮 ====== */}
      <div className="hidden @md:flex @lg:hidden items-center justify-end gap-1 px-4 py-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-2.5 py-1 text-sm ${btnBase}`}
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`md-dot-${i}`} className="px-1.5 text-gray-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`px-2 py-1 text-sm rounded-lg border ${
                p === page ? activeBtn : btnBase
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-2.5 py-1 text-sm ${btnBase}`}
        >
          下一页
        </button>
        <span className="ml-2 text-xs text-gray-500 tabular-nums whitespace-nowrap">{total}条</span>
      </div>

      {/* ====== @lg+: ≥ 512px — 完整分页（当前行为，不变） ====== */}
      <div className="hidden @lg:flex items-center justify-end gap-1 px-4 py-3">
        <button
          onClick={() => onChange(page - 1)}
          disabled={prevDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`lg-dot-${i}`} className="px-3 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`px-3 py-1 text-sm rounded-lg border ${
                p === page ? activeBtn : btnBase
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={nextDisabled}
          className={`px-3 py-1 text-sm ${btnBase}`}
        >
          下一页
        </button>
        <span className="ml-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
          共 {total} 条
        </span>
      </div>

    </div>
  )
}
```

- [ ] **Step 3: TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 4: Commit**

```bash
git add components/ui/data/Pagination.tsx
git commit -m "feat: Pagination responsive via @container queries — 4 breakpoints"
```

---

### Task 3: 生产构建 + 验证

- [ ] **Step 1: 生产构建**

```bash
cd frontend && npm run build
```

Expected: 零错误，所有页面预渲染成功。

- [ ] **Step 2: 手动验证清单**

以下场景在浏览器中逐项确认：

| 页面 | 容器估计宽度 | 预期断点 | 预期布局 |
|------|-------------|---------|---------|
| 批量发布 > 创作台 — 商机列表面板 | ~280px | `@sm` | 文字按钮 + 第 X/Y 页 |
| 批量发布 > 商品监控 | ~700px+ | `@lg+` | 完整分页 |
| 批量发布 > 发布记录 | ~700px+ | `@lg+` | 完整分页 |
| 商品管理 | ~800px+ | `@lg+` | 完整分页 |
| 选品监控 > 各 Tab | ~800px+ | `@lg+` | 完整分页 |
| 管理端 > 各页面 | ~800px+ | `@lg+` | 完整分页 |

| 边界场景 | 预期行为 |
|---------|---------|
| 只有 1 页数据 | 分页器不渲染（`return null`） |
| 拖拽调整工作台分栏宽度 | 分页器实时切换布局 |
| 商机面板拉宽到 >384px | 从 `@sm` 切换到 `@md` |

- [ ] **Step 3: Commit（如有验证中发现的微调）**

```bash
git add -A && git commit -m "chore: post-verification tweaks for Pagination responsive"
```
