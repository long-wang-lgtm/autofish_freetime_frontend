# 通知渠道设置页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置页面新增「通知渠道」Tab，支持配置飞书 webhook 通知

**Architecture:** 新增 `lib/api/notification.ts` API 客户端 + 在 `settings/page.tsx` 中新增 notification Tab 和侧边抽屉组件

**Tech Stack:** Next.js + React + Tailwind CSS + @tanstack/react-query

---

## 文件结构

- Create: `lib/api/notification.ts` — 通知渠道 API 客户端
- Modify: `app/dashboard/settings/page.tsx` — 新增 notification Tab 及抽屉组件

---

## 实现任务

### Task 1: 创建 API 客户端 `lib/api/notification.ts`

- [ ] **Step 1: 创建文件**

Create: `lib/api/notification.ts`

```typescript
/**
 * 通知渠道 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface NotificationConfig {
  id: number
  provider: 'lark'
  webhook: string
  is_active: boolean
  created_at: string | null
}

export interface NotificationConfigCreate {
  webhook: string
  provider?: 'lark'
  is_active?: boolean
}

export interface NotificationConfigUpdate {
  id: number
  webhook?: string
  provider?: 'lark'
  is_active?: boolean
}

export interface NotificationConfigListResponse {
  total: number
  configs: NotificationConfig[]
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeader()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "请求失败" }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function listNotificationConfigs(): Promise<NotificationConfigListResponse> {
  return fetchApi<NotificationConfigListResponse>("/api/setting/notify/get")
}

export async function getNotificationConfig(id: number): Promise<NotificationConfig> {
  return fetchApi<NotificationConfig>(`/api/setting/notify/get/${id}`)
}

export async function createNotificationConfig(data: NotificationConfigCreate): Promise<NotificationConfig> {
  return fetchApi<NotificationConfig>("/api/setting/notify/create", {
    method: "POST",
    body: JSON.stringify({ ...data, provider: data.provider || 'lark' }),
  })
}

export async function updateNotificationConfig(data: NotificationConfigUpdate): Promise<NotificationConfig> {
  return fetchApi<NotificationConfig>("/api/setting/notify/update", {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteNotificationConfig(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>("/api/setting/notify/delete", {
    method: "DELETE",
  })
}
```

- [ ] **Step 2: 验证文件创建成功**

```bash
ls -la lib/api/notification.ts
```

---

### Task 2: 修改 `app/dashboard/settings/page.tsx` — 添加 MainTab 和抽屉组件

- [ ] **Step 1: 修改 MainTabs 数组**

在 `MAIN_TABS` 数组中新增:

```typescript
{ key: 'notification', label: '通知渠道', icon: '🔔' },
```

将 `tab-2` 和 `tab-3` 从数组中移除（因为它们是占位符）。

- [ ] **Step 2: 添加类型定义**

在文件顶部添加:

```typescript
import {
  listNotificationConfigs,
  createNotificationConfig,
  updateNotificationConfig,
  deleteNotificationConfig,
  NotificationConfig,
} from '@/lib/api/notification'
```

- [ ] **Step 3: 添加状态变量**

在 `SettingsPage` 组件内添加:

```typescript
const [drawerOpen, setDrawerOpen] = useState(false)
const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null)
const [webhookInput, setWebhookInput] = useState('')
const [isActiveInput, setIsActiveInput] = useState(true)
const [deletingId, setDeletingId] = useState<number | null>(null)
```

- [ ] **Step 4: 添加 NotificationConfig 的 TanStack Query**

在现有 `useQuery` 后添加:

```typescript
const { data: notificationData, isLoading: notificationLoading } = useQuery({
  queryKey: ['notification-configs'],
  queryFn: listNotificationConfigs,
})
```

- [ ] **Step 5: 添加 useMutation**

在现有 mutations 后添加:

```typescript
const notificationMutation = useMutation({
  mutationFn: (data: { type: 'create' | 'update' | 'delete', payload?: any }) => {
    if (data.type === 'create') return createNotificationConfig(data.payload)
    if (data.type === 'update') return updateNotificationConfig(data.payload)
    return deleteNotificationConfig(data.payload.id)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['notification-configs'] })
    setDrawerOpen(false)
    setEditingConfig(null)
    setWebhookInput('')
    setIsActiveInput(true)
  },
})
```

- [ ] **Step 6: 添加抽屉组件函数**

在组件内添加:

```typescript
const openDrawer = (config?: NotificationConfig) => {
  if (config) {
    setEditingConfig(config)
    setWebhookInput(config.webhook)
    setIsActiveInput(config.is_active)
  } else {
    setEditingConfig(null)
    setWebhookInput('')
    setIsActiveInput(true)
  }
  setDrawerOpen(true)
}

const closeDrawer = () => {
  setDrawerOpen(false)
  setEditingConfig(null)
  setWebhookInput('')
  setIsActiveInput(true)
}

const handleSave = () => {
  if (editingConfig) {
    notificationMutation.mutate({
      type: 'update',
      payload: { id: editingConfig.id, webhook: webhookInput, provider: 'lark', is_active: isActiveInput },
    })
  } else {
    notificationMutation.mutate({
      type: 'create',
      payload: { webhook: webhookInput, provider: 'lark', is_active: isActiveInput },
    })
  }
}

const handleDelete = (id: number) => {
  notificationMutation.mutate({ type: 'delete', payload: { id } })
}

const copyJsonMessage = () => {
  const json = {
    level: "",
    title: "",
    session: "",
    order: "",
    content: ""
  }
  navigator.clipboard.writeText(JSON.stringify(json, null, 2))
}
```

- [ ] **Step 7: 在 return JSX 中添加 Notification Tab 内容**

在 `{/* 占位 Tab 内容 */}` 注释位置之后、`)` 结束之前添加:

```typescript
{/* 通知渠道 Tab 内容 */}
{activeMainTab === 'notification' && (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    {/* 工具栏 - 添加按钮在左上角 */}
    <div className="flex items-center px-6 pt-4 pb-3 border-b border-gray-100">
      <button
        onClick={() => openDrawer()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        添加渠道
      </button>
    </div>

    {/* 数据区 */}
    {notificationLoading ? (
      <div className="p-8 text-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    ) : notificationData?.configs.length === 0 ? (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">🔔</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无通知渠道</h3>
        <p className="text-sm text-gray-500 mb-4">点击上方按钮添加您的第一个通知渠道</p>
        <button
          onClick={() => openDrawer()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          添加渠道
        </button>
      </div>
    ) : (
      <div className="p-6">
        {notificationData?.configs.map((config) => (
          <div key={config.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3 last:mb-0">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🔔</div>
              <div>
                <div className="font-medium text-gray-900">飞书通知</div>
                <div className="text-sm text-gray-500 truncate max-w-md">{config.webhook}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* is_active 开关 */}
              <button
                onClick={() => notificationMutation.mutate({
                  type: 'update',
                  payload: { id: config.id, webhook: config.webhook, provider: 'lark', is_active: !config.is_active },
                })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  config.is_active ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    config.is_active ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
              <button
                onClick={() => openDrawer(config)}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                配置
              </button>
              {deletingId === config.id ? (
                <div className="inline-flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={notificationMutation.isPending}
                  >
                    {notificationMutation.isPending ? '删除中...' : '确认'}
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeletingId(config.id)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-600 transition-colors"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 8: 添加侧边抽屉组件**

在 `</div>` 结束标签之前添加:

```typescript
{/* 侧边抽屉 - 宽度 500px */}
{drawerOpen && (
  <>
    {/* 遮罩 */}
    <div
      className="fixed inset-0 bg-black/30 z-40"
      onClick={closeDrawer}
    />
    {/* 抽屉 */}
    <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">飞书通知配置</h3>
        <button
          onClick={closeDrawer}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* webhook 输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            飞书 Webhook 地址
          </label>
          <input
            type="text"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            placeholder="请输入飞书机器人 Webhook 地址"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
          />
        </div>
        {/* is_active 开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">启用通知</div>
            <div className="text-xs text-gray-500">关闭后将不会发送通知</div>
          </div>
          <button
            onClick={() => setIsActiveInput(!isActiveInput)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isActiveInput ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isActiveInput ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
        {/* 复制 JSON 按钮 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            消息 JSON 模板
          </label>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 overflow-x-auto mb-3">
{`{
    "level": "",
    "title": "",
    "session": "",
    "order": "",
    "content": ""
}`}</pre>
          <button
            onClick={copyJsonMessage}
            className="w-full px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            复制 JSON 消息
          </button>
        </div>
      </div>
      {/* 底部保存按钮 */}
      <div className="px-6 py-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={notificationMutation.isPending || !webhookInput.trim()}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {notificationMutation.isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  </>
)}
```

- [ ] **Step 9: 验证代码**

运行 TypeScript 检查:

```bash
cd frontend && npx tsc --noEmit
```

---

## 自检清单

- [ ] API 端点与设计文档一致 (`/api/setting/notify/*`)
- [ ] `provider` 默认值为 `lark`
- [ ] `is_active` 参数已添加
- [ ] 抽屉从右侧滑入，宽度 **500px**（修正）
- [ ] 复制 JSON 使用 `navigator.clipboard.writeText`
- [ ] 删除操作有两步确认
- [ ] webhook 输入框有 placeholder 提示
- [ ] 保存按钮在 webhook 为空时禁用
- [ ] 添加按钮在卡片工具栏**左上角**（修正）
- [ ] 卡片列表显示 is_active **开关**（修正）

---

## 代码完成后统一提交

所有任务完成后，执行以下命令提交：

```bash
git add lib/api/notification.ts app/dashboard/settings/page.tsx
git commit -m "feat: add notification channel tab in settings page

- Add notification config API client
- Add notification tab with drawer component
- Support lark webhook configuration
- Add is_active toggle in card list

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```