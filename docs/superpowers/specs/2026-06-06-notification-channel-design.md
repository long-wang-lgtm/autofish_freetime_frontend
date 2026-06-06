# 通知渠道设置页面设计

## 概述

在设置页面新增「通知渠道」Tab，用于配置用户的通知功能，目前仅支持飞书通知渠道。

## API 接口

| 方法 | 端点 | 参数 |
|------|------|------|
| GET | `/api/setting/notify/get` | - |
| GET | `/api/setting/notify/get/{id}` | id |
| POST | `/api/setting/notify/create` | webhook, provider(默认`lark`), is_active |
| PUT | `/api/setting/notify/update` | id, webhook, provider, is_active |
| DELETE | `/api/setting/notify/delete` | id |

## 页面结构

### 一级 Tab
- key: `notification`
- label: `通知渠道`
- icon: `🔔`

### 卡片内容
- 飞书通知渠道卡片
- 卡片内展示：渠道名称、webhook 地址、is_active 开关
- 卡片内按钮：「配置」「删除」
- 右上角：「添加渠道」按钮（目前只有飞书，可直接点击打开抽屉）

### 侧边抽屉
- 标题：飞书通知配置
- 表单内容：
  - webhook 输入框（文本框）
  - is_active 开关（启用/停用）
  - 保存按钮（主要样式，bg-blue-600）
  - 复制 JSON 消息按钮（次要样式，边框样式）
- JSON 消息内容（一键复制）：
```json
{
    "level": "",
    "title": "",
    "session": "",
    "order": "",
    "content": ""
}
```

## 实现要点

- 调用真实 API `/api/setting/notify/*`
- 前端需新增 `lib/api/notification.ts` 存放通知渠道相关 API 函数
- 参考现有 AI 配置 Tab 的代码结构和样式
- 抽屉从右侧滑入，宽度约 400px
- 复制 JSON 使用 `navigator.clipboard.writeText` 实现