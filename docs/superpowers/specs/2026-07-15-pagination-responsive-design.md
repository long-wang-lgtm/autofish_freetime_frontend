# Pagination 响应式自适应设计

**日期**: 2026-07-15 | **状态**: 设计完成 | **方案**: Tailwind CSS Container Queries

## 问题

`Pagination` 组件目前是单布局：`[上一页] [1] [2] [...] [N] [下一页] 共 X 条`，需要约 450px+ 宽度。在窄容器中（如商机列表面板 ~280px）按钮换行、布局破碎。

## 目标

根据**容器宽度**（非视口）自适应切换布局，同一组件在宽表格和窄面板中都能正常展示。

## 方案

安装 `@tailwindcss/container-queries` 插件，在 Pagination 外层标记 `@container`，内部用四组 DOM 在不同容器断点间切换。

### 容器断点与布局

| 断点 | 容器宽度 | 布局 | "共 X 条" |
|------|---------|------|-----------|
| `@xs` | < 256px | `← 第3/8页 →` | 隐藏 |
| `@sm` | 256–384px | `上一页 第3/8页 下一页` | 隐藏 |
| `@md` | 384–512px | `上一页 1 2 … 8 下一页` | 缩写 `156条` |
| `@lg+` | ≥ 512px | 完整（当前行为不变） | 完整 `共 156 条` |

### 消费者宽度预估

| 消费者 | 估计宽度 | 命中断点 |
|--------|---------|---------|
| `OpportunityListPanel`（商机列表侧栏） | ~280px | `@sm` |
| `PendingOverviewPanel` | ~280px | `@sm` |
| `MaterialWorkspace`（素材工作区） | ~400px | `@md` |
| `MonitorTable` / `MaterialTable` | ~600–800px+ | `@lg+` |
| admin 管理端页面 | ~800px+ | `@lg+` |
| `ItemsTab`（商品管理） | ~800px+ | `@lg+` |

### Props（不变）

```ts
interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}
```

无需新增 prop，容器查询使组件自动适应。

### 实现要点

1. **安装依赖**：`npm install -D @tailwindcss/container-queries`
2. **Tailwind 配置**：`plugins` 数组中添加 `require('@tailwindcss/container-queries')`
3. **组件结构**：
   ```tsx
   <div className="@container border-t border-gray-100">
     {/* @xs: 纯箭头 + 页码 */}
     <div className="hidden @xs:flex items-center justify-center gap-1.5 px-3 py-2">
       <button>←</button>
       <span>第 {page}/{totalPages} 页</span>
       <button>→</button>
     </div>

     {/* @sm: 文字按钮 + 页码 */}
     <div className="hidden @sm:flex @md:hidden items-center justify-center gap-1.5 px-3 py-2">
       <button>上一页</button>
       <span>第 {page}/{totalPages} 页</span>
       <button>下一页</button>
     </div>

     {/* @md: 简化页码 */}
     <div className="hidden @md:flex @lg:hidden items-center justify-end gap-1 px-4 py-2">
       {/* 上一页 1 2 … N 下一页 */}
       <span className="ml-2 text-xs text-gray-500">{total}条</span>
     </div>

     {/* @lg+: 完整分页（当前行为） */}
     <div className="hidden @lg:flex items-center justify-end gap-1 px-4 py-3">
       {/* 上一页 1 2 … N 下一页 */}
       <span className="ml-3 text-xs text-gray-500 tabular-nums">共 {total} 条</span>
     </div>
   </div>
   ```

4. **四组 DOM 共享事件处理器**，按钮 disabled 状态、页码生成逻辑提取为共享变量
5. **`totalPages <= 1` 时返回 null**的逻辑保留

### 消费者影响

**零改动**。所有 12 处 `<Pagination>` 使用点不需要任何修改。Container Queries 根据各处的实际容器宽度自动匹配对应断点。

## 不涉及

- Pagination props 接口不变
- 移动端适配（Pagination 本身不做 viewport-based 响应）
- 不再同步的表单/手风琴等其他组件的响应式

## 验证

1. `npm run build` 通过
2. 浏览器手动测试：
   - 打开商机列表页面 → 分页器在 ~280px 侧栏中显示为「上一页 第 X/Y 页 下一页」
   - 打开商品监控页面 → 分页器在宽表格中显示完整形态
   - 调整工作台左右分栏宽度 → 分页器随面板宽度实时切换布局
3. 确认 `totalPages <= 1` 时所有断点下都正确隐藏
