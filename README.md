

# AutoFish FreeTime 前端

AutoFish FreeTime 是一个基于闲鱼平台的自动化管理与运营工具，提供商品管理、账号管理、批量发布、数据监控等功能，帮助用户更高效地管理闲鱼店铺。

## 功能特性

### 📦 商品管理
- 商品列表管理与筛选
- 商品上下架操作
- 关键词自动回复规则配置
- 发货/收货赠送/评价赠送设置
- 商品信息批量编辑

### 👥 账号管理
- 多账号绑定与管理
- 账号状态监控
- 代理服务器配置
- 链接登录管理

### 🚀 批量创作发布系统
- 商品监控与趋势分析
- 商机发现与绑定
- AI 辅助素材创作
- 发布进度追踪

### 📊 数据监控
- 商品性能指标分析
- 历史趋势图表
- 异常预警系统
- 稳定性诊断

### 💰 会员与计费
- 会员等级管理
- 风铃石充值
- 订单历史查询
- 功能定价配置

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript 5+
- **样式**: Tailwind CSS
- **状态管理**: Zustand + React Query
- **数据可视化**: Apache ECharts
- **UI 组件**: 自建组件库
- **表单处理**: React Hook Form + Zod
- **HTTP 客户端**: 原生 fetch

## 项目结构

```
├── app/                    # Next.js App Router 页面
│   ├── (auth)/            # 认证模块（登录/注册）
│   ├── admin/             # 管理后台
│   │   ├── accounts/      # 账号管理
│   │   ├── billing/       # 计费管理
│   │   ├── proxy/         # 代理管理
│   │   └── users/         # 用户管理
│   ├── dashboard/         # 用户功能区
│   │   ├── accounts/      # 账号管理
│   │   ├── batch-publish/ # 批量发布
│   │   ├── items/         # 商品管理
│   │   └── settings/      # 个人设置
│   └── login/             # 登录相关
├── components/            # React 组件
│   ├── accounts/          # 账号相关组件
│   ├── ai-config/         # AI 配置组件
│   ├── auth/              # 认证组件
│   ├── batch-publish/     # 批量发布组件
│   │   ├── materials/     # 素材管理
│   │   ├── monitor/       # 监控模块
│   │   ├── workbench/     # 创作台
│   │   └── shared/        # 共享组件
│   ├── items/             # 商品管理组件
│   │   ├── drawers/       # 抽屉组件
│   │   ├── parts/         # 子组件
│   │   └── views/         # 视图组件
│   ├── layout/            # 布局组件
│   ├── settings/          # 设置组件
│   └── ui/                # 通用 UI 组件
│       ├── chart/         # 图表组件
│       ├── data/          # 数据展示组件
│       ├── feedback/      # 反馈组件
│       ├── navigation/    # 导航组件
│       └── overlay/       # 浮层组件
├── hooks/                 # 自定义 Hooks
├── lib/                   # 工具库
│   ├── api/               # API 客户端
│   ├── constants/         # 常量定义
│   └── utils/             # 工具函数
├── stores/                # Zustand 状态管理
├── types/                 # TypeScript 类型定义
└── styles/                # 全局样式
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+ / npm 9+ / yarn 1.22+

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

复制 `.env.example` 文件并重命名为 `.env`，根据实际情况配置以下变量：

```env
# API 地址
NEXT_PUBLIC_API_URL=https://your-api-server.com

# 其他配置...
```

### 开发模式

```bash
pnpm dev
```

启动后访问 `http://localhost:3000`

### 生产构建

```bash
pnpm build
pnpm start
```

## 开发规范

### 代码风格

- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 严格模式
- 组件采用 PascalCase 命名（如 `ProductCard.tsx`）
- 钩子采用 camelCase 命名（如 `useItemsData.ts`）

### 组件设计原则

1. **单一职责**: 每个组件只做一件事
2. **props 控制**: 超过 2 个 props 时考虑拆分
3. **代码行数**: 超过 300 行时考虑拆分
4. **禁止内嵌**: 组件内部禁止定义其他组件

### 状态管理

- **React Query**: 服务器状态管理（API 数据）
- **Zustand**: 客户端全局状态（如用户信息、UI 状态）
- **useState/useReducer**: 组件本地状态

### 图表规范

- 必须使用 `useChart` Hook
- ECharts 按需导入
- 图表配色遵循设计 Token
- tooltip 颜色与 series 颜色同步

### 错误处理

- 全局 ErrorBoundary 捕获未预期错误
- API 错误分类处理
- 用户友好错误提示
- 生产环境禁止 console 输出

## 浏览器支持

- Chrome (最新版本)
- Safari (最新版本)
- Firefox (最新版本)
- Edge (最新版本)

## 许可证

本项目仅供学习和研究使用。

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request