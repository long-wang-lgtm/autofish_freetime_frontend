# 表单处理规范

> 参考实现：`components/auth/LoginForm.tsx`（react-hook-form + zod 标准模式）、`components/items/parts/KeywordRuleForm.tsx`（复杂表单）、`components/settings/AIConfigTab.tsx`（BottomSheet 表单）

## 一、技术栈与标准模式

### 标准表单组合

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 1. 定义 Zod schema（放在组件文件顶部或 lib/utils/validation.ts）
const formSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50, '名称不能超过50字'),
  price: z.number().min(0, '价格不能为负'),
  enabled: z.boolean().default(true),
})

// 2. 推导 TypeScript 类型
type FormData = z.infer<typeof formSchema>

// 3. 使用 useForm
function MyForm({ onSubmit, defaultValues }: MyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const onFormSubmit = async (data: FormData) => {
    try {
      await onSubmit(data)
      reset()  // 成功后重置表单
    } catch {
      // 错误由 mutation 的 onError 处理
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {/* 字段 */}
    </form>
  )
}
```

### Schema 定义位置

| Schema 适用范围 | 定义位置 | 示例 |
|----------------|----------|------|
| 单个表单专用 | 该表单组件文件内 | `AIConfigForm.tsx` 内的 schema |
| 多组件共享 | `lib/utils/validation.ts` | `LoginData`、`RegisterData` |

**铁律**：同一表单的 schema 不拆散到多个文件。避免 "字段在 A 文件，验证在 B 文件"。

## 二、表单字段标准样式

### 单行文本输入

```tsx
<div className="space-y-1">
  <label htmlFor="name" className="text-sm font-medium text-gray-700">
    名称 <span className="text-red-500">*</span>
  </label>
  <input
    id="name"
    type="text"
    {...register('name')}
    className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               disabled:bg-gray-50 disabled:text-gray-400"
    placeholder="请输入名称"
  />
  {errors.name && (
    <p className="text-sm text-red-600">{errors.name.message}</p>
  )}
</div>
```

### 下拉选择

```tsx
<div className="space-y-1">
  <label htmlFor="type" className="text-sm font-medium text-gray-700">类型</label>
  <select
    id="type"
    {...register('type')}
    className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="text">文字模型</option>
    <option value="image">生图模型</option>
  </select>
</div>
```

### Switch 开关

```tsx
{/* react-hook-form 中的 Switch 用 Controller 包裹 */}
<Controller
  name="enabled"
  control={control}
  render={({ field }) => (
    <button
      type="button"
      role="switch"
      aria-checked={field.value}
      onClick={() => field.onChange(!field.value)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        field.value ? 'bg-blue-600' : 'bg-gray-200'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white transition-transform',
        field.value ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )}
/>
```

### 多行文本

```tsx
<textarea
  {...register('description')}
  rows={4}
  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
  placeholder="请输入描述"
/>
```

## 三、表单字段高度与间距统一

| 元素 | 高度 | className |
|------|------|-----------|
| 输入框 | `h-10`（40px） | `h-10 px-3 py-2 text-sm` |
| 选择框 | `h-10`（40px） | `h-10 px-3 py-2 text-sm` |
| 按钮（默认） | `h-10`（40px） | `h-10 px-4 py-2 text-sm` |
| 按钮（主操作） | `h-10`（40px） | `h-10 px-5 py-2 text-sm` |

**铁律**：同一表单行的输入框和按钮高度必须一致。不允许 `py-2.5` 按钮与 `py-2` 输入框并存。

### 标签与输入框间距

```tsx
// 标准间距：标签与输入框 4px（space-y-1）
<div className="space-y-1">
  <label>...</label>
  <input />
</div>

// 字段之间间距：16px（space-y-4）
<form className="space-y-4">
  <Field1 />
  <Field2 />
</form>
```

## 四、表单提交流程

### 提交按钮状态

```tsx
// ✅ 完整状态处理
<button
  type="submit"
  disabled={isSubmitting || !isValid}
  className="..."
>
  {isSubmitting ? (
    <>
      <LoadingSpinner size="sm" />
      保存中...
    </>
  ) : (
    '保存'
  )}
</button>

// ❌ 缺少 loading 状态
<button type="submit" onClick={handleSubmit}>保存</button>
```

### 防止重复提交

```tsx
// 方式 1：react-hook-form 的 isSubmitting
const { formState: { isSubmitting } } = useForm(...)
<button disabled={isSubmitting}>提交</button>

// 方式 2：React Query mutation 的 isPending
<button disabled={mutation.isPending}>
  {mutation.isPending ? '提交中...' : '提交'}
</button>
```

### 服务端校验错误映射

```tsx
// 当后端返回字段级错误时（如 422），映射到对应字段
const onFormSubmit = async (data: FormData) => {
  try {
    await mutation.mutateAsync(data)
  } catch (err: any) {
    if (err?.errors) {
      // 后端返回 { errors: { name: "名称已存在", price: "价格超出范围" } }
      Object.entries(err.errors).forEach(([field, message]) => {
        setError(field as keyof FormData, {
          type: 'server',
          message: message as string,
        })
      })
    }
  }
}
```

## 五、表单在 PC/移动端的差异处理

### 桌面端：表单在 Sheet 抽屉中

```tsx
<Sheet open={open} onClose={handleClose} width="500px">
  <form className="p-6 space-y-4">
    {/* 表单字段垂直排列 */}
  </form>
</Sheet>
```

### 移动端：表单在 BottomSheet 中

```tsx
// Sheet 组件已自动处理 useIsMobile 切换
<Sheet open={open} onClose={handleClose}>
  <form className="p-4 space-y-4">
    {/* 相同表单字段，自动适配移动端宽度 */}
  </form>
</Sheet>
```

**铁律**：同一表单不应为桌面端和移动端写两份代码。使用 `Sheet` 组件（已内置 `useIsMobile` 切换为 BottomSheet），表单字段根据容器宽度自适应。

## 六、安全表单字段

### 密码/密钥输入框

```tsx
// ✅ 必须使用 type="password"
<input
  type="password"
  {...register('apiKey')}
  placeholder="请输入 API Key"
/>

// ✅ 可选：添加显示/隐藏切换
function PasswordInput({ register, name }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} {...register(name)} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2">
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
```

**铁律**：API Key、密码、代理密钥等敏感字段必须使用 `type="password"`，禁止 `type="text"` 明文显示。

### 文件上传

```tsx
// ✅ 上传前客户端校验
function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return

  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    toast.error(`文件大小不能超过 10MB`)
    return
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('仅支持 JPG、PNG、WebP 格式')
    return
  }

  uploadMutation.mutate(file)
}
```

## 七、AIConfigTab 表单重复问题

`components/settings/AIConfigTab.tsx`（554 行）的桌面端和移动端渲染了完全相同的表单字段。应提取：

```
components/ai-config/form-fields.tsx  ← 新建，表单字段组件
components/settings/AIConfigTab.tsx   ← 桌面端/移动端共用 form-fields
```

```tsx
// form-fields.tsx（提取后的共享表单字段）
export function AIConfigFormFields({ register, errors, control }: UseFormReturn<AIConfigData>) {
  return (
    <>
      <Field name="name" label="名称" ... />
      <Field name="provider" label="服务商" ... />
      <Field name="type" label="用途" ... />
      <Field name="baseUrl" label="Base URL" ... />
      <Field name="apiKey" label="API Key" type="password" ... />
      <Field name="model" label="模型名称" ... />
    </>
  )
}

// AIConfigTab.tsx 中：
{isMobile ? (
  <BottomSheet><AIConfigFormFields {...form} /></BottomSheet>
) : (
  <Sheet width="500px"><AIConfigFormFields {...form} /></Sheet>
)}
```

## 反模式

- 表单字段的 `py-2.5` 按钮与 `py-2` 输入框高度不一致
- 提交按钮无 loading 状态（容易重复提交）
- 服务端校验错误用 `toast.error` 而非映射到字段级 `setError`
- 密码/密钥输入框使用 `type="text"`
- 为桌面端和移动端各写一份表单代码（应共享字段组件）
- 文件上传缺乏前端类型/大小校验
- Schema 定义在组件很远的地方或跨文件拆散
