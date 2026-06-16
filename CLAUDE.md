# frontend/CLAUDE.md

前端项目，Next.js + React + Tailwind CSS v3。**禁止访问 backend 目录及其父目录**。

## 核心约束

- 严禁使用动态路由
- 所有 API 请求指向 `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`，基础地址在 `.env.local` 的 `NEXT_PUBLIC_API_BASE_URL` 变量中配置

## 按需加载

| 模块 | 用途 |
|------|------|
| `@frontend/.claude/rules/frontend-tabs.md` | Tab 页面视觉设计规范 |

## API 规范

### 设计原则

**就近定义** — 数据结构应当与使用它的 API 模块同文件声明，不应为复用而单独抽离。只有当同一数据结构被三个及以上不同业务模块共享时，才考虑提取为公共类型。

**类型即文档** — 接口类型名称应清晰表达业务语义，避免无前缀的通用命名（如 `Item`、`Response`）。建议使用 `业务实体 + 语义后缀` 的命名模式，如 `Account`、`AccountUpdate`、`OpportunityDetail`。

**拒绝冗余** — 已有的类型不可在同文件中重复定义，功能相近的结构应通过可选字段或联合类型合并，而非创建多个近似类型。

### 目录组织

建议按业务领域将 `lib/api/` 下的文件组织为以下模块：

| 模块 | 职责范围 |
|------|----------|
| `lib/api/auth.ts` | 认证相关：登录、注册、Token 管理 |
| `lib/api/accounts.ts` | 账号管理：账号 CRUD、评价模板、扫码登录 |
| `lib/api/items.ts` | 商品管理：商品列表、上下架、分组 |
| `lib/api/selection.ts` | 选品监控：关键词、监控商品/商家、选品统计 |
| `lib/api/publish/` | 发布相关：商机、素材、图片上传 |
| `lib/api/settings/` | 设置相关：AI 配置、通知渠道等 |
| `lib/api/shared.ts` | 公共类型：`OperationResponse` 等跨模块共享类型 |

现有文件结构已大致对应上述分区，新建 API 时应归入已有模块或创建新模块，而非在现有文件中追加不相关的接口。

### 类型定义规范

**命名层级分明** — 类型命名应反映其用途：`XxxEntity` 表示完整实体，`XxxUpdate` 表示更新入参，`XxxCreate` 表示创建入参，`XxxSummary` 表示列表页用的精简版本，`XxxDetail` 表示详情展开结构。

**DTO 与前端类型区分** — 后端直传的数据结构建议标注后缀（如 `XxxDTO`），前端自行计算或转换的衍生类型建议使用独立名称（如 `XxxView`），避免两者混用。

**OperationResponse 的使用** — `OperationResponse` 用于操作结果反馈（成功/失败+消息），不应在其中嵌入业务数据字段。如需返回业务数据，应定义独立的响应类型。

### 避免的模式

- 在多个文件中定义语义相同的重复类型
- 使用 `Record<string, unknown>` 作为业务数据字段的类型
- 在 API 文件中混入与接口无关的工具函数（如 MD5 计算、图片处理）
- 导出仅供内部使用的中间类型

### 现有共享类型

以下类型已在多个模块中复用，定义时应引用而非重复：

- `OperationResponse` — 操作结果反馈，已在 `accounts.ts`、`notification.ts`、`selection.ts`、`ai-config.ts`、`link-login.ts` 中使用
- `MaterialImage` — 素材图片，已在 `publish-items.ts`、`upload.ts` 中使用
- `fetchApi` 工具函数 — 已在 `accounts.ts`、`opportunities.ts`、`publish-items.ts`、`upload.ts` 中复用