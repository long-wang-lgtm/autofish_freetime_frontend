# 表单项目特定模式

本文档记录项目特有的表单实现模式——这些做法无法从 react-hook-form / zod 官方文档直接推导。

---

## 1. Switch 开关：Controller + role + aria-checked 组合

react-hook-form 的 Switch 开关需要 `Controller` 包裹才能正确与表单状态同步，同时为无障碍添加 `role="switch"` + `aria-checked`：

```tsx
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

**关键点**：`Controller` + `role="switch"` + `aria-checked` 三者缺一不可。

---

## 2. 服务端 422 校验错误映射到字段级 setError

后端返回 422 时，错误信息需要映射到具体表单字段，而非仅 toast：

```tsx
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

---

## 3. 文件上传客户端校验值

上传前必须做客户端校验，以下是项目采用的具体阈值：

| 约束 | 值 |
|------|-----|
| 最大文件大小 | 10 MB |
| 允许的文件类型 | `image/jpeg`, `image/png`, `image/webp` |

校验必须在调用上传 API 之前完成，校验失败用 toast.error 提示。
