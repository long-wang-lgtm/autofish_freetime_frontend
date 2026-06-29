# 无障碍最低要求

> 基于项目前端无障碍审计发现制定，当前全项目仅 1 处 `role` 属性、1 处 `aria-*` 属性、零 `tabIndex` 使用

## 当前状态

| 指标 | 当前值 | 目标 |
|------|--------|------|
| `role` 属性 | 1 处（`KeywordRuleForm.tsx:139` — `role="switch"`） | 所有交互控件覆盖 |
| `aria-*` 属性 | 1 处（`aria-checked`） | 覆盖所有图标按钮和表单 |
| `tabIndex` | 0 处 | 非标准交互元素补充 |
| 键盘导航 | 无支持 | Tab 键可完成核心操作 |
| 屏幕阅读器 | 无支持 | 核心流程可读 |

## 积极发现

| 项目 | 状态 |
|------|------|
| 可点击元素使用 `<button>` 而非 `div onClick` | 全项目遵循 |
| 图片有 `alt` 属性 | 基本覆盖 |

## 最低要求

### 1. 所有交互元素必须可键盘访问

所有可交互元素（按钮、链接、输入框、选择器、开关）必须通过 Tab 键导航到，通过 Enter/Space 激活。

```tsx
// ❌ 禁止 — div 无法键盘聚焦
<div onClick={handleClick}>点击我</div>

// ✅ 使用 button 原生元素
<button onClick={handleClick}>点击我</button>

// ✅ 非标准交互元素使用 tabIndex
<div role="button" tabIndex={0} onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') handleClick()
}}>自定义交互</div>
```

聚焦样式不得被移除（`outline-none` 必须配合可见的替代焦点样式）：

```tsx
// ❌ 禁止 — 无替代焦点指示器
<button className="outline-none">按钮</button>

// ✅ 提供替代焦点样式
<button className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
  按钮
</button>
```

### 2. 所有图标按钮必须有 aria-label

无文本的图标按钮对屏幕阅读器不可见。

```tsx
// ❌ 禁止 — 屏幕阅读器读不出含义
<button><TrashIcon className="w-4 h-4" /></button>

// ✅ 图标按钮必须加 aria-label
<button aria-label="删除此项"><TrashIcon className="w-4 h-4" /></button>
```

### 3. 所有表单输入必须有 label 或 aria-label

```tsx
// ❌ 禁止 — 仅靠 placeholder 传达含义
<input type="text" placeholder="搜索商品" />

// ✅ 显式 label
<label htmlFor="search">搜索商品</label>
<input id="search" type="text" />

// ✅ 或 aria-label（输入框无可见 label 时）
<input type="text" aria-label="搜索商品" placeholder="搜索商品" />
```

### 4. 状态变化必须用 aria-live 通知屏幕阅读器

异步操作完成后，屏幕阅读器用户需要感知结果。

```tsx
// ✅ 操作结果区域使用 aria-live
<div aria-live="polite" aria-atomic="true">
  {message && <p>{message}</p>}
</div>

// ✅ 加载中的搜索区域
<div role="status" aria-live="polite">
  {isLoading ? "正在搜索..." : `找到 ${count} 个结果`}
</div>
```

常用 `aria-live` 值：
- `polite`：等当前朗读完成后播报（适用于大多数场景）
- `assertive`：立即播报（仅用于紧急通知）

### 5. 颜色不能作为唯一的信息传达方式

色盲用户无法仅靠颜色区分状态。

```tsx
// ❌ 禁止 — 仅靠颜色区分
<span className="text-green-600">已通过</span>
<span className="text-red-600">已拒绝</span>

// ✅ 颜色 + 文本/图标双重传达
<span className="text-green-600">✓ 已通过</span>
<span className="text-red-600">✗ 已拒绝</span>

// ✅ 图表中颜色 + 图例/纹理
```

对于图表（ECharts），确保色板在色盲模拟下仍可区分，或提供图案填充/纹理作为第二通道。

### 6. 焦点顺序必须合理

DOM 顺序应与视觉顺序一致。避免使用 CSS `order`/`flex-direction: row-reverse` 等影响视觉顺序的属性导致 Tab 焦点跳跃。

### 7. 模态框/抽屉打开时焦点必须移入，关闭时焦点必须回到触发元素

```tsx
// ✅ 模态框焦点管理
function Modal({ open, onClose }: ModalProps) {
  const triggerRef = useRef<HTMLElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      // 保存触发元素引用
      triggerRef.current = document.activeElement as HTMLElement
      // 焦点移入模态框
      modalRef.current?.focus()
    } else {
      // 焦点回到触发元素
      triggerRef.current?.focus()
    }
  }, [open])

  return open ? (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true">
      ...
    </div>
  ) : null
}
```

`Sheet` 和 `BottomSheet` 组件（`components/ui/Sheet.tsx`）应实现此焦点管理。

### 8. 触摸目标最小 44x44px

WCAG 2.5.5 (Level AAA) 要求触摸目标至少 44x44 CSS 像素。移动端交互元素必须满足此要求。

```tsx
// ❌ 禁止 — 太小的点击目标
<button className="w-5 h-5">×</button>

// ✅ 最小 44x44px（可通过 padding 扩展点击区域）
<button className="min-w-[44px] min-h-[44px] p-2">×</button>
```

### 9. 对比度至少达到 WCAG AA 标准

| 元素 | 最低对比度 | 项目当前使用的灰色 |
|------|-----------|---------------------|
| 正文（< 18px） | 4.5:1 | `text-gray-500` (#6b7280) 在白底上 ≈ 4.6:1 — 边界达标 |
| 大字（>= 18px 粗体） | 3:1 | 确保 `text-gray-400` 仅用于大字或装饰用途 |
| 非文本 UI 组件 | 3:1 | 输入框边框、图标等 |

需注意的常见问题：
- `text-gray-400` (#9ca3af) 在白底上 ≈ 2.8:1 — **不达标**，仅可用于装饰/占位/text-sm 大字
- 浅色背景上的表单边框应使用 `border-gray-300` 或更深的颜色

## 编码检查清单

每次提交前确认：

- [ ] 新增图标按钮有 `aria-label`
- [ ] 新增表单输入有 `label` 或 `aria-label`
- [ ] 无 `div onClick` 替代 button
- [ ] 无 `outline-none` 裸用（需配合 `focus-visible:ring-*`）
- [ ] 状态信息通过文本+颜色双重传达（非仅颜色）
- [ ] 模态框/抽屉有焦点管理
- [ ] 移动端触摸目标 >= 44x44px
- [ ] 文本对比度满足 AA 标准（灰色字不浅于 `text-gray-500`）
