# frontend/CLAUDE.md

前端项目，Next.js + React + Tailwind CSS v3。

## 核心约束

- 严禁使用动态路由
- 所有 API 请求的基础地址统一从环境变量读取，后接 `/api` 路径前缀

## 按需加载

| 模块 | 用途 |
|------|------|
| `@.claude/rules/frontend-tabs.md` | Tab 页面视觉设计规范 |
| `@.claude/rules/frontend-mobile-layout.md` | 移动端布局设计规范 |
| `@.claude/rules/frontend-api.md` | API 接口设计规范 |
| `@components/ui/` | UI 组件库 |
