# 状态管理项目特定模式

---

## 1. 乐观更新三步模式

开关类操作的乐观更新遵循固定的三步模式：

```tsx
const toggleMutation = useMutation({
  mutationFn: (itemId: string) => updateItem(itemId, { auto_delivery: newValue }),
  onMutate: async (itemId) => {
    // Step 1: 取消进行中的查询，防止覆盖乐观更新
    await queryClient.cancelQueries({ queryKey: ['items'] })
    const previous = queryClient.getQueryData(['items'])
    // Step 2: 立即修改缓存
    queryClient.setQueryData(['items'], (old: Item[]) =>
      old?.map(i => i.gid === itemId ? { ...i, auto_delivery: newValue } : i)
    )
    return { previous }  // 保存旧值供回滚
  },
  onError: (_err, _itemId, context) => {
    // Step 3: 失败时回滚到旧值
    queryClient.setQueryData(['items'], context?.previous)
  },
})
```

**三步**：`cancelQueries` → `setQueryData`（乐观更新）→ `onError` 用 context 回滚。

---

## 2. SSE 单例模式架构

IM 状态实时推送使用 SSE，采用模块级单例 + React 18 `useSyncExternalStore` + 延迟断开：

| 层级 | 机制 |
|------|------|
| 连接管理 | 模块级单例 EventSource，全局共享一个连接 |
| 状态订阅 | `useSyncExternalStore` — React 18 并发模式安全 |
| 生命周期 | 最后一个订阅者离开后延迟 5 秒断开，避免页面切换时重复连接 |
| 数据缓冲 | 保留固定数量的历史数据点（滚动缓冲区） |

> 参考实现：`hooks/useImStatusSnapshots.ts`

---

## 3. 虚拟滚动参数

列表超 100 项时使用 `@tanstack/react-virtual`，每项预估高度 64px：

```tsx
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64,
})
```
