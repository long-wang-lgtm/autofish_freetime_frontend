# frontend/CLAUDE.md

前端项目，Next.js + React + Tailwind CSS v3。**禁止访问 backend 目录及其父目录**。

## 核心约束

- 严禁使用动态路由
- 所有 API 请求指向 `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`，基础地址在 `.env.local` 的 `NEXT_PUBLIC_API_BASE_URL` 变量中配置

## 按需加载

| 模块 | 用途 |
|------|------|
| `@frontend/.claude/rules/frontend-tabs.md` | Tab 页面视觉设计规范 |