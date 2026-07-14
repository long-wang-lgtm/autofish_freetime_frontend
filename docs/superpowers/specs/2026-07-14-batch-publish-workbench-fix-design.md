# 批量创作系统 — 创作台修复方案设计

> 2026-07-14 | 基于 2026-07-13 设计规格的修复方案
> 目标：修复 11 项设计缺陷，重构创作台信息架构，使批量操作真正成立

---

## 一、战略层：修复目标与原则

### 1.1 修复什么

当前创作台有 11 项设计缺陷（详见分析报告）。按严重程度分为三类：

| 级别 | 数量 | 核心问题 |
|------|------|----------|
| P0 结构性 | 3 | Tab 冗余、概览不可返回、批量字段入侧边栏 |
| P1 信息架构 | 2 | 三列冗余、缺封面图 |
| P2 交互细节 | 3 | ✏️ 按钮→行点击、下拉→文本框、缺图片管理 |
| P3 细节缺失 | 3 | +N 更多、BatchActionBar、列宽不足 |

### 1.2 修复原则

1. **批量感**：任何需要逐行打开 Sheet 才能完成的操作，都是反模式。账号选择、类目选择、价格调整——这些应该在行内完成。
2. **信息密度换信息价值**：不追求列少，追求每列都有独立判断价值。三列表达同一信息 → 合并。
3. **概览始终可达**：用户在任何状态下都能一步回到全局待办清单。
4. **旧页面已验证的模式不丢弃**：旧 PublishInstanceRow 的行内编辑模式经过了实战检验，新设计不应倒退。

### 1.3 不在本方案范围

- 商机管理 Tab 的卡片网格/表格视图（并入概览后功能不变）
- 监控 Tab 和发布记录 Tab（无改动）
- API 层（batch-publish.ts 无需修改）
- 后端任何改动

---

## 二、页面层：Tab 合并 + 路由变化

### 2.1 4 Tab → 3 Tab

```
旧：monitor | opportunity | workbench | materials
新：monitor | workbench     | materials
                ↑
          商机CRUD + 创作台 合并
```

**合并理由**：
- 商机管理和创作台共享同一数据源（opportunities + materials）
- 商机列表 → 选中商机 → 工作区，这是连续流程，不应跨 Tab
- 概览视图本质上就是"商机列表 + 待办素材"的聚合视图

### 2.2 新路由

```
/dashboard/batch-publish?tab=monitor|workbench|materials
```

- 默认 Tab：`monitor`（不变）
- 深度链接：`?tab=workbench&oid=123`（不变）
- `opportunity` Tab key **移除**（如有存量 URL 带 `?tab=opportunity`，重定向到 `?tab=workbench`）

### 2.3 page.tsx 变更

```tsx
type TabName = 'monitor' | 'workbench' | 'materials'

const BATCH_PUBLISH_TABS = [
  { key: 'monitor', label: '商品监控', icon: <Search /> },
  { key: 'workbench', label: '创作台', icon: <PenTool /> },
  { key: 'materials', label: '发布记录', icon: <FileText /> },
]
```

移除 `OpportunityTab` 的动态导入。所有商机 CRUD 功能移至 `WorkbenchTab` 内部。

---

## 三、创作台重构：共享左面板 + 右面板切换

### 3.1 核心架构：左侧面板持久化

设计洞察：概览视图和工作区视图都依赖商机列表。与其在两个视图间跳转，不如让**左侧商机列表始终存在**，右侧面板按选中状态切换内容。

```
┌───────────────────────┬────────────────────────────────────────────────────┐
│ 左侧：商机列表（持久）   │ 右侧：内容区（按选中状态切换）                         │
│ (默认 320px, 可拖拽)   │                                                    │
│                       │  ┌─ 未选商机：待发布素材概览（跨商机折叠分组 + 分页器）  │
│ [🔍 搜索商机...]       │  │                                                 │
│ [全部] [active]       │  ├─ 选中商机：素材工作区（头部+参考+表格+分页器）       │
│                       │  │                                                 │
│ ┌───────────────────┐ │  │ 顶部有 ← 返回概览 按钮清空选中态                   │
│ │ 日系简约风  ✓     │ │  │                                                 │
│ │ 5商品 · 3素材     │ │  └───────────────────────────────────────────────── │
│ │ ¥12 · active      │ │                                                    │
│ └───────────────────┘ │                                                    │
│ ┌───────────────────┐ │                                                    │
│ │ 北欧风摆件        │ │                                                    │
│ │ 3商品 · 1素材     │ │                                                    │
│ └───────────────────┘ │                                                    │
│                       │                                                    │
│ [分页器]              │                                                    │
└───────────────────────┴────────────────────────────────────────────────────┘
```

**两种状态的切换**：
- 左侧选中商机 → 右侧 = 素材工作区（MaterialWorkspace）
- 左侧未选中 / 点击"返回概览"→ 右侧 = 待发布素材概览（PendingOverviewPanel）
- "返回概览"按钮位于右侧面板顶部，点击后清空 `selectedOid`

### 3.2 概览视图（未选商机）

右侧面板为 **PendingOverviewPanel**，跨商机列出所有未完成的素材，作为全局待办清单：

```
右侧面板：待发布素材概览
┌──────────────────────────────────────────────────────────────────┐
│ ← 无需返回按钮（已是概览态）                                       │
│                                                                  │
│ 待发布素材（3 个商机，共 7 份素材未完成）                           │
│                                                                  │
│ ▸ 日系简约风手机壳（3 份待处理）                           [有失败🔴]│
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 素材 #12 │ 日系简约透明壳... │ genimage_done │ 2h前编辑  │ → │   │
│   │ 素材 #15 │ 清新文艺风...    │ pending       │ 昨天     │ → │   │
│   │ 素材 #18 │ 极简设计...      │ publish_failed│ 3h前    │ → │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ▸ 北欧风家居摆件（2 份待处理）                                    │
│   ...                                                            │
│                                                                  │
│ ▸ 韩系ins风（2 份待处理）                                         │
│   ...                                                            │
│                                                                  │
│                      [分页器 1/3]                                 │
└──────────────────────────────────────────────────────────────────┘
```

**排序**：有 publish_failed 的商机置顶 → 最近编辑的在前。
**分页**：所有商机组的素材合并分页，位于容器底部。
**点击行** → 左侧自动选中该商机 + 右侧切换到素材工作区。

### 3.3 工作区视图（选中商机）

右侧面板切换为 **MaterialWorkspace**：

```
右侧面板：素材工作区
┌──────────────────────────────────────────────────────────────────┐
│ ← 返回概览 | 日系简约风手机壳 | ¥12 | 5商品·3素材    [批量创建]    │
│                                                                  │
│ ▸ 参考信息（5个监控商品 · 可折叠）                                 │
│ [📱透明软壳+12%][📱磨砂+8%][📱硅胶-3%]... [+2更多→]              │
│                                                                  │
│ 素材表格                                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │☐│封面图  │描述   │价格▲ │账号  │类目  │进度+操作       │🗑   │ │
│ │☐│[📷×2] │日系..│¥12  │[账1▾]│[手机▾]│●○○○ ○○○○ [改写]│🗑   │ │
│ │☐│[📷×0] │清新..│¥15  │[账2▾]│[配件▾]│○○○○ ○○○○ [封面]│🗑   │ │
│ │☐│[📷×3] │极简..│¥10  │[账1▾]│[数码▾]│●●●○ ●●●○ [发布]│🗑   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [分页器]                                                          │
└──────────────────────────────────────────────────────────────────┘
```

**关键变化**：
1. **← 返回概览** 按钮清空 `selectedOid`，右侧切回 PendingOverviewPanel
2. 左侧面板始终可见——选中其他商机无需回概览
3. 素材表格列完全重新设计（详见 §4）

### 3.4 左侧面板：商机 CRUD 入口

左侧面板不仅是导航列表，也承载商机 CRUD：

```
左侧：商机列表（320px，可拖拽调整）
┌─────────────────────────┐
│ [🔍 搜索商机...]         │
│ [全部] [启用] [停用]     │
│                [+ 新建]  │
│                         │
│ ┌─────────────────────┐ │
│ │ 日系简约风    ✓     │ │  ← 选中态：border-l-blue-600 + bg-blue-50/50
│ │ 📦5商品 📝3素材    │ │
│ │ ¥12 · active       │ │
│ │            [✏️][🗑] │ │  ← 编辑/删除按钮
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 北欧风摆件          │ │
│ │ 📦3商品 📝1素材    │ │
│ │ ¥15 · active       │ │
│ │            [✏️][🗑] │ │
│ └─────────────────────┘ │
│                         │
│ [分页器 1/2]            │
└─────────────────────────┘
```

- **新建商机**：[+ 新建] 按钮 → Sheet
- **编辑商机**：✏️ 按钮 → Sheet（编辑模式）
- **删除商机**：🗑 按钮 → ConfirmDialog（danger，提示素材数）
- **选中商机**：点击卡片主体 → 右侧加载工作区
- **搜索/筛选**：实时过滤，debounce 300ms
- **分页**：底部分页器

### 3.5 移动端布局

移动端不能用左右分栏，改用全屏 Push/Pop 两层导航：

```
┌──────────────────────────────────────┐
│ 概览层（默认）                        │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 商机快捷切换（横向滚动胶囊条）     │ │  ← 紧凑模式：不占整屏
│ │ [全部商机] [日系] [北欧] [韩系]  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ▸ 日系简约风（3 份待处理）   [🔴]    │  ← 折叠分组列表
│   素材 #12 · 日系透明壳 · genimage_done│
│   素材 #15 · 清新文艺风 · pending      │
│                                      │
│ ▸ 北欧风（2 份待处理）               │
│   ...                                │
│                                      │
│ 点击素材行 → Push 进入工作区          │
├──────────────────────────────────────┤
│ 工作区层（Push）                      │
│                                      │
│ ← 返回 日系简约风手机壳  [批量创建]   │  ← 面包屑顶栏
│                                      │
│ ▸ 参考信息（5商品，可折叠）           │
│ [透明软壳+12%] [磨砂+8%] [+3更多→]  │
│                                      │
│ 素材卡片（表格降级为卡片）            │
│ ┌────────────────────────────────┐  │
│ │ [📷×2] 日系简约透明手机壳       │  │  ← 每张卡片 = 一行
│ │ ¥12.00 · [账1▾] · [手机配件▾] │  │
│ │ ●●○○ ○○○○ [封面]      [🗑]    │  │
│ └────────────────────────────────┘  │
│ ┌────────────────────────────────┐  │
│ │ [📷×0] 清新文艺风...           │  │
│ │ ¥15.00 · [账2▾] · [数码▾]    │  │
│ │ ○○○○ ○○○○ [改写]      [🗑]    │  │
│ └────────────────────────────────┘  │
│                                      │
│ 点击卡片 → BottomSheet 编辑器        │
├──────────────────────────────────────┤
│ BottomSheet（编辑器）                 │
│ 描述 textarea + 图片管理 + AI上下文   │
└──────────────────────────────────────┘
```

#### 移动端关键设计决策

**概览层**：
- 顶部：横向滚动的商机快捷切换胶囊条（代替 PC 端左侧面板），选中态 `bg-blue-50 text-blue-700`
- "全部商机" = 显示跨商机待办清单（默认）
- 选中具体商机 = 过滤只显示该商机的待办素材
- 点击待办素材行 → Push 进入工作区层（自动选中对应商机）
- 新建商机：概览层右上角 [+] → BottomSheet 表单

**工作区层**：
- 面包屑顶栏：← 返回 + 商机名称 + [批量创建]
- 素材表格降级为卡片：每张卡片包含封面图、描述、价格、账号下拉、类目下拉、进度+操作按钮、删除按钮
- 账号/类目在卡片内仍为行内下拉（移动端 select 原生控件，44px+ 触控目标）
- 参考信息面板可折叠，横向滚动

**素材编辑**：
- 点击卡片 → BottomSheet（`heightRatio=0.85`）：描述编辑 + 图片管理 + AI 上下文
- 价格在卡片内行内编辑（点击 → 数字键盘）
- 不单独开 Push 层——BottomSheet 即可

```typescript
type MobileView = 'overview' | 'workspace'
```

#### 移动端与 PC 端差异对照

| 维度 | PC 端 | 移动端 |
|------|-------|--------|
| 商机导航 | 左侧持久面板（320px） | 概览层顶部横向滚动胶囊条 |
| 待办素材 | 右侧 PendingOverviewPanel | 概览层折叠分组列表 |
| 素材展示 | DataTable（8 列） | 卡片列表（每卡含全部关键字段） |
| 素材新建 | 批量创建 Modal | 批量创建 BottomSheet |
| 商机 CRUD | 左侧面板 ✏️🗑 + Sheet | 长按商机胶囊 → 弹出菜单 |
| 素材编辑 | Sheet 侧边抽屉（500px） | BottomSheet（0.85 高度） |
| 行内编辑 | 价格/账号/类目 行内编辑 | 同（原生控件，≥44px） |
| 参考信息 | 横向滚动卡片 | 折叠 + 横向滚动 |
| 导航深度 | 0 层（全部同屏可见） | 2 层 Push（概览 → 工作区） |

#### 移动端触控目标

所有可交互元素 ≥ 44×44px：
- 商机胶囊：`h-11 min-w-[60px]`（44px + padding）
- 卡片行内 select：使用原生 `<select>`，移动端浏览器自动提供 ≥44px 选项
- 删除按钮：`w-11 h-11` 触控区
- 面包屑返回箭头：`w-11 h-11`
- 折叠展开箭头：`w-11 h-11`
- 进度条中的操作按钮：`h-11 min-w-[60px]`

---

## 四、素材表格列重设计（核心变更）

### 4.1 新旧对比

| 旧列 | 宽度 | 新列 | 宽度 | 变化 |
|------|------|------|------|------|
| ☐ 复选框 | 32px | ☐ 复选框 | 32px | 不变 |
| — | — | 🖼 **封面图** | 1fr | **新增** |
| 描述 | 2fr | 描述（可点击） | 2fr | 点击→Sheet |
| 价格（只读） | 0.7fr | 💰 价格（行内编辑） | 0.6fr | **变为行内 input** |
| — | — | 👤 **账号（下拉）** | 0.8fr | **新增** |
| — | — | 📂 **类目（下拉）** | 0.8fr | **新增** |
| 状态 Badge | 0.8fr | — | — | **删除（合并到进度列）** |
| AI 操作按钮 | 1.5fr | — | — | **删除（合并到进度列）** |
| 进度条 | 0.8fr | 📊 **进度+操作** | 1.8fr | **合并 3→1** |
| ✏️ 编辑 | 0.4fr | 🗑 删除 | 0.3fr | 替换 |

**新 GRID_COLS**：`32px 1fr 2fr 0.6fr 0.8fr 0.8fr 1.8fr 0.3fr`

### 4.2 列详解

#### 🖼 封面图列（1fr）

```
┌─────────────────────────┐
│ [图1] [图2] [+上传]      │  ← 横向排列，最多显示 3 张缩略图
│  48×48  48×48  48×48    │  ← 缩略图尺寸
└─────────────────────────┘
```

- 显示 `material.images` 的前 3 张缩略图（48×48px，`object-cover rounded-lg`）
- 末尾 + 号上传按钮（`< 8` 张时显示），点击触发文件选择
- 上传即时保存（调用 `editMaterial` 追加 images）
- 拖拽排序：拖拽缩略图调整 images 数组顺序
- 悬停显示删除按钮（×），删除即时保存
- 点击缩略图 → lightbox 大图预览
- images 为空时显示灰色占位框（虚线边框，48×48px）

**实现要点**：
- 复用旧 `PublishInstanceRow.tsx:102-176` 的图片管理逻辑，提取为独立组件 `MaterialImageCell.tsx`
- 上传调用 `uploadImage` API（从 `publish-items.ts` 导入或封装）
- MaterialImage 类型：`{ url: string; md5?: string }`，上传后返回 url

#### 📝 描述列（2fr）

- `line-clamp-2`，只读展示
- **点击整行**（除其他可交互列）→ 打开 MaterialEditSheet
- 无描述时显示灰色 `(无描述)`

#### 💰 价格列（0.6fr）— 行内编辑

```
┌──────────┐
│ ¥__12.00 │  ← input[number]，点击进入编辑态
└──────────┘
```

- 默认显示 `fmtPrice(value)`，只读外观
- 点击 → 变为 `<input type="number" step="0.01">`，自动聚焦
- **blur → 保存**：调用 `editMaterial({ id, price })`，恢复只读外观
- **Enter → 保存 + 保持聚焦**：保存后不 blur，继续编辑下一个价格
- **Escape → 取消编辑**，恢复原值
- 保存期间显示 spinner（替换 input）

#### 👤 账号列（0.8fr）— 行内下拉

```
┌──────────────┐
│ [账号1    ▾] │  ← select 下拉，仅显示正常状态账号
└──────────────┘
```

- `<select>` 下拉，选项来自 accounts 列表
- **过滤规则**：仅 `status === 1`（正常）的账号出现在下拉选项中。禁用（2）和异常（3）账号不显示
- **onChange → 即时保存**：`editMaterial({ id, to_uid: selectedUid })`
- **保存成功后 → 自动刷新类目**：调用 `queryClient.invalidateQueries({ queryKey: ['batch-publish', 'channel', materialId] })` 触发类目重新拉取
- 未选择时显示 `未选择`（text-gray-400）

**数据来源（唯一方案）**：

| 环节 | 实现 |
|------|------|
| **API** | `getAccountNames()` from `lib/api/accounts.ts`，返回 `AccountName[]`（仅 `uid` + `name`），比 `listAccounts()` 轻量 |
| **获取时机** | `useWorkbenchPage` 挂载时用 `useQuery` 预取，`staleTime: 10 * 60 * 1000`（账号名称极少变动） |
| **缓存 key** | `['accounts', 'names']`（全局共享） |
| **过滤** | 在 MaterialRow 读取缓存后过滤 `status === 1`。但 `getAccountNames()` 不返回 status——因此改用 `listAccounts()`，在 `select` 中过滤：`data.filter(a => a.status === 1).map(a => ({ uid: a.uid, name: a.name }))` |
| **缓存失效** | 永不主动 invalidate（账号变更后需手动刷新页面，或监听账号页面的 mutation 事件） |
| **MaterialRow 读取** | `queryClient.getQueryData<Account[]>(['accounts'])?.filter(a => a.status === 1)` |

#### 📂 类目列（0.8fr）— 行内下拉

```
┌──────────────┐
│ [手机配件 ▾] │  ← select 下拉，选项来自 getChannel(materialId)
└──────────────┘
```

- `<select>` 下拉，选项来自 `getChannel(materialId)` API
- **前置条件**：`material.to_uid` 已设置（账号已选择）。未设置时显示 `请先选账号`，`disabled`
- **onChange → 即时保存**：`editMaterial({ id, category: selectedCategory })`
- **数据获取**：MaterialRow 内部通过 `useQuery` 按 materialId 获取：
  ```typescript
  const { data: channels } = useQuery({
    queryKey: ['batch-publish', 'channel', materialId],
    queryFn: () => getChannel(materialId),
    enabled: !!material?.to_uid,
    staleTime: 10 * 60 * 1000,  // 类目列表低频变动
  })
  ```
- **刷新时机**：账号变更后自动 invalidate（见账号列）→ `getChannel(materialId)` 用新账号重新获取类目
- **缓存 key**：`['batch-publish', 'channel', materialId]`（按素材隔离）

#### 📊 进度+操作列（1.8fr）— 合并 3→1

```
┌──────────────────────────────────────────┐
│ ●改写 ─ ●封面 ─ ○生图 ─ ○发布   [下一步]  │
│   ↑ 4 节点紧凑进度条       ↑ 主操作按钮   │
└──────────────────────────────────────────┘
```

**进度条**（左，占 ~60% 宽度）：
- 紧凑版 StatusPipeline：圆点 + 阶段名（小字），无连接线标签
- 已完成 = 蓝底蓝字，当前 = 蓝边框，未开始 = 灰，失败 = 红
- 4 个节点：改写 / 封面 / 生图 / 发布

**主操作按钮**（右，占 ~40% 宽度）：
- 根据状态机显示**推荐下一步**（primary 按钮）：
  - pending → **[改写]**（蓝底白字）
  - writing_done → **[封面]**（蓝底白字）
  - genimageplan_done → **[生图]**（蓝底白字）
  - genimage_done → **[发布]**（蓝底白字）
  - published → ✓已发布（绿字，无按钮）
  - publish_failed → **[重试]**（红底白字）
- 点击主按钮 → 根据按钮类型调用对应 API：
  - **[改写]** / **[封面]** / **[生图]** → `triggerWork(materialId, stage)`，stage 取 `'write'` / `'genimageplan'` / `'genimage'`
  - **[发布]** → `publishMaterial(materialId)`
  - **[重试]** → `publishMaterial(materialId)`（与发布调用同一接口）
- 调用期间按钮显示 loading spinner + 禁用其余操作按钮

**更多操作**（"..." 下拉菜单，按钮右侧）：
- 点击 [...] → 弹出小菜单：重写 / 重做封面 / 重生图（根据当前状态显示可用操作）
- 这些是 secondary 操作，不占用主视觉空间

#### 🗑 删除列（0.3fr）

- 垃圾桶图标按钮，hover 变红
- 点击 → ConfirmDialog 确认 → `deleteMaterial`
- 不用 `window.confirm`

### 4.3 MaterialRow Props（≤5）

```typescript
interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenSheet: (id: number) => void
  selectedOid: number | undefined
}
```

行内通过 React Query 缓存自取数据：
- 素材数据：`['batch-publish', 'materials', selectedOid]`
- 账号列表：`['accounts']`（全局共享）
- 类目选项：`['batch-publish', 'channel', materialId]`（按 materialId 获取，调用 `getChannel(materialId)`，账号必须先设置）

行内通过 `useWorkbenchMutations(selectedOid)` 获取 mutation 函数。

### 4.4 行点击行为

| 点击位置 | 行为 |
|----------|------|
| 描述文字区域 | 打开 MaterialEditSheet |
| 封面图 | lightbox 大图预览 |
| 价格 input | 进入编辑态（不触发 Sheet） |
| 账号/类目 select | 展开下拉（不触发 Sheet） |
| 进度条/操作按钮 | 触发 AI 操作（不触发 Sheet） |
| 复选框 | 切换选中 |
| 删除按钮 | 确认删除 |
| 行内其余空白区域 | 打开 MaterialEditSheet |

---

## 五、MaterialEditSheet 瘦身

### 5.1 Sheet 职责收缩

| 内容 | 旧位置 | 新位置 | 理由 |
|------|--------|--------|------|
| 描述全文 | Sheet | Sheet（保留） | 多行文本，需要大的编辑空间 |
| 价格 | Sheet | **行内编辑** | 一个数字，行内改即可 |
| 账号 | Sheet | **行内下拉** | 高频操作，行内 2 秒完成 |
| 类目 | Sheet | **行内下拉** | 高频操作，行内 2 秒完成 |
| 图片管理 | ❌缺失 | **Sheet（新增）** | 大图预览+拖拽排序需要空间 |
| AI 上下文 | Sheet | Sheet（保留） | 低频配置，独立保存按钮 |
| 封面规划 prompt | ❌缺失 | **不在首版范围**（封面规划由 AI 自动生成，前端不提供手动编辑） | 见 §1.4 |

### 5.2 Sheet 新布局

```
┌─────────────────────────────────┐
│ 编辑素材 #12                    │  ← 标题
│ 日系简约透明壳...               │  ← 描述摘要
├─────────────────────────────────┤
│                                 │
│ 📸 商品图片                     │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │ 图1  │ │ 图2  │ │ +上传 │    │  ← 拖拽排序，最大 8 张
│ │      │ │      │ │      │    │
│ └──────┘ └──────┘ └──────┘    │
│                                 │
│ 📝 描述                         │
│ ┌───────────────────────────┐  │
│ │ 日系简约透明手机壳...      │  │  ← textarea, min-h-[200px]
│ │                           │  │
│ └───────────────────────────┘  │
│                                 │
│ ⚙️ AI 上下文配置                │
│ 注入模板：[仅商机信息 ▾]        │
│                                 │
│ □ 透明软壳 +12.5% 342/天       │  ← 仅 with_item 时显示
│ ☑ 磨砂硬壳 +8.2%  256/天       │
│ □ 硅胶防摔 -3.2%  128/天       │
│                                 │
│ 将注入：商机信息 + 1 个监控商品  │
│           （磨砂硬壳）          │
│                                 │
│ [保存 AI 上下文]                │  ← 独立保存（仅更新 ai_context）
│                                 │
│ [保存素材]        [关闭]        │  ← 保存描述+图片 / 取消
└─────────────────────────────────┘
```

### 5.3 Sheet 内图片管理功能

- **展示**：缩略图网格（~120×120px），wrap 布局
- **上传**：末尾 + 号卡片，点击触发文件选择。上传前校验：`image/*`、max 10MB
- **删除**：悬停显示 × 按钮
- **排序**：拖拽（HTML5 drag & drop 或使用简单的上移/下移按钮）
- **大图预览**：点击缩略图 → lightbox（复用现有 lightbox 或新建简单实现）
- **保存**：随"保存素材"按钮一起提交

### 5.4 Sheet Props

```typescript
interface MaterialEditSheetProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
}
```

内部自取数据 + 自调 mutation（与 MaterialRow 相同模式）。

### 5.5 图片管理 API 调用链

素材图片通过 `editMaterial` 的 `images` 字段持久化。上传链路：

```
选择文件 → uploadFileToFlare(file, uid) → MaterialImage
         → 追加到 material.images 数组
         → editMaterial({ id, images: newImages })
```

- **上传**：`uploadFileToFlare(file, uid)` from `lib/api/upload.ts` — 自动计算 MD5、秒传检测、R2 上传、返回 `MaterialImage`
- **删除**：`images.filter(img => img.md5 !== targetMd5)` → `editMaterial({ id, images })`
- **排序**：reorder array → `editMaterial({ id, images })`
- **uid 参数**：`uploadFileToFlare` 的 `uid` 取自 `material.to_uid`，用于后端上传到闲鱼 CDN

> **注意**：`MaterialImage` 类型来自 `lib/api/batch-publish.ts`，但 `uploadFileToFlare` 返回的 `MaterialImage` 来自 `lib/api/upload.ts`。两者结构一致（`md5`、`filepath`、`flare`、`url`），TypeScript 兼容。

---

## 六、组件变更清单

### 6.1 新增组件

| 组件 | 路径 | 说明 |
|------|------|------|
| `MaterialImageCell` | `components/batch-publish/workbench/MaterialImageCell.tsx` | 行内封面图单元格（缩略图+上传+排序+删除+lightbox） |
| `ProgressActionCell` | `components/batch-publish/workbench/ProgressActionCell.tsx` | 合并后的进度+操作单元格（紧凑进度条+主按钮+更多菜单） |
| `InlineEditCell` | `components/batch-publish/workbench/InlineEditCell.tsx` | 通用行内编辑单元格（点击→编辑→blur保存） |
| `PendingOverviewPanel` | `components/batch-publish/workbench/PendingOverviewPanel.tsx` | **重命名自 WorkbenchOverview**，作为右侧面板的概览态内容（跨商机待办清单） |
| `MaterialCard` | `components/batch-publish/workbench/MaterialCard.tsx` | 移动端素材卡片（表格降级，含封面+描述+价格+账号+类目+进度+操作+删除） |

### 6.2 修改组件

| 组件 | 变更 |
|------|------|
| `WorkbenchTab.tsx` | **重写**：共享左面板 + 右面板切换（PendingOverviewPanel ↔ MaterialWorkspace）；移动端 Push/Pop 两层 |
| `OpportunityListPanel.tsx` | **升级**：集成商机 CRUD（每个卡片 ✏️🗑 按钮 + 顶部 [+ 新建]）；选中高亮；分页 |
| `MaterialRow.tsx` | **重写**：新 8 列结构、行内编辑、行点击 |
| `MaterialWorkspace.tsx` | 更新 GRID_COLS + 表头 + 顶部返回概览按钮 |
| `MaterialEditSheet.tsx` | **重写**：移除价格/账号/类目，新增图片管理（上传/排序/删除） |
| `ReferencePanel.tsx` | +N 更多截断 |
| `StatusPipeline.tsx` | 新增 `compact` 变体（用于 ProgressActionCell 行内紧凑展示） |
| `page.tsx` | 4 Tab → 3 Tab，移除 OpportunityTab 动态导入 |
| `BatchActionBar.tsx` | 接入 MaterialWorkspace（批量选择后弹出） |

### 6.3 迁移/删除

| 组件 | 处理 |
|------|------|
| `OpportunityTab.tsx` | **删除** |
| `OpportunityCard.tsx` | 迁入 `workbench/`，但功能已合并到 OpportunityListPanel 的行项目中，**可删除** |
| `OpportunityForm.tsx` | 迁入 `workbench/`，供左侧面板的 Sheet 使用 |
| `WorkbenchOverview.tsx` | **重命名** → `PendingOverviewPanel.tsx`，职责收缩为纯待办清单（右侧面板内容） |

### 6.4 最终目录结构

```
components/batch-publish/
├── monitor/              ← 不变
├── opportunity/          ← 删除（仅 OpportunityForm 迁入 workbench/）
├── workbench/
│   ├── WorkbenchTab.tsx            # 重写：共享左面板+右面板切换容器
│   ├── OpportunityListPanel.tsx    # 升级：商机列表+CRUD（左面板持久内容）
│   ├── OpportunityForm.tsx         # 从 opportunity/ 迁入，Sheet 内表单
│   ├── PendingOverviewPanel.tsx    # 重命名自 WorkbenchOverview：右侧概览态
│   ├── MaterialWorkspace.tsx       # 修改：新表头+返回按钮（右侧工作态）
│   ├── MaterialRow.tsx             # 重写：新 8 列结构（PC 端表格行）
│   ├── MaterialCard.tsx            # 新增：移动端素材卡片
│   ├── MaterialImageCell.tsx       # 新增：封面图单元格
│   ├── ProgressActionCell.tsx      # 新增：进度+操作合并单元格
│   ├── InlineEditCell.tsx          # 新增：通用行内编辑
│   ├── MaterialEditSheet.tsx       # 重写：图片管理+描述+AI上下文
│   ├── ReferencePanel.tsx          # 修改：+N 更多
│   ├── ReferenceCard.tsx           # 不变
│   └── CreateMaterialModal.tsx     # 不变（PC）/ 移动端改用 BottomSheet
├── materials/            ← 不变
└── shared/
    ├── BatchActionBar.tsx          # 已有，接入 MaterialWorkspace
    ├── StatusPipeline.tsx          # 修改：新增 compact 变体
    └── constants.ts                # 修改：新增列配置、缓存 key、筛选选项
```

---

## 七、数据流变更

### 7.1 新增 React Query 缓存条目

| Key | 内容 | API | 获取时机 | staleTime | 消费者 | 备注 |
|-----|------|-----|----------|-----------|--------|------|
| `['accounts']` | `Account[]`（全量，含 status 字段） | `listAccounts()` from `lib/api/accounts.ts` | `useWorkbenchPage` 挂载时预取 | `10 * 60 * 1000` | MaterialRow 账号下拉 | MaterialRow 获取后过滤 `status === 1` |
| `['batch-publish', 'channel', materialId]` | `ChannelItemResponse[]` | `getChannel(materialId)` | MaterialRow 内部 `useQuery`，`enabled: !!material?.to_uid` | `10 * 60 * 1000` | MaterialRow 类目下拉 | 账号变更后 invalidate 触发重新获取 |

### 7.2 useWorkbenchPage 扩展

```typescript
import { listAccounts, type Account } from '@/lib/api/accounts'
import { useOpportunityMutations } from '@/hooks/batch-publish/useOpportunityMutations'

export function useWorkbenchPage() {
  // ... 现有逻辑（selectedOid / filters / 素材数据 / 概览数据 / 监控商品等）...

  // 全局账号列表：挂载时获取一次，长期缓存
  // 返回全量 Account[]，由消费者自行过滤 status
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // 商机 CRUD（从原 useOpportunityPage 迁入，替换 useWorkbenchPage 中缺失的商机变更能力）
  const opportunityMutations = useOpportunityMutations()

  return {
    // ... 现有返回值 ...
    accounts,
    createOpportunity: opportunityMutations.createMutation,
    updateOpportunity: opportunityMutations.updateMutation,
    deleteOpportunity: opportunityMutations.deleteMutation,
  }
}
```

### 7.3 MaterialRow 数据自取

MaterialRow 从缓存读取以下数据：

```typescript
export function MaterialRow({ materialId, isSelected, onToggleSelect, onOpenSheet, selectedOid }: MaterialRowProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  // 1. 素材数据
  const cached = queryClient.getQueryData<MaterialListResponse>(['batch-publish', 'materials', selectedOid])
  const material = cached?.items.find(m => m.id === materialId)

  // 2. 账号列表（过滤仅正常状态账号）
  const accounts = queryClient.getQueryData<Account[]>(['accounts'])
  const activeAccounts = (accounts ?? []).filter(a => a.status === 1)

  // 3. 类目选项（按 materialId 按需获取）
  const { data: channels = [] } = useQuery({
    queryKey: ['batch-publish', 'channel', materialId],
    queryFn: () => getChannel(materialId),
    enabled: !!material?.to_uid,
    staleTime: 10 * 60 * 1000,
  })

  if (!material) return null
  // ... 渲染 8 列 ...
}
```

**行内编辑静默保存**（价格/账号/类目/图片变更，无 toast）：

```typescript
const handleInlineSave = async (field: keyof MaterialEditInput, value: unknown) => {
  if (!material) return
  // 1. 乐观更新缓存
  queryClient.setQueryData<MaterialListResponse>(
    ['batch-publish', 'materials', selectedOid],
    (old) => old ? {
      ...old,
      items: old.items.map(m => m.id === materialId ? { ...m, [field]: value } : m)
    } : old
  )
  // 2. 静默调用 API
  try {
    await editMaterial({ id: materialId, [field]: value })
    // 3. 账号变更 → 刷新类目列表
    if (field === 'to_uid') {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'channel', materialId] })
    }
  } catch (err) {
    // 4. 失败回滚 + 仅此时弹 toast
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    toast.addToast({ title: `保存失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
  }
}
```

**注意**：MaterialRow 不调用 `useWorkbenchMutations` 的 `editMaterialMutation`（它会弹 toast）。静默编辑直接调 `editMaterial` API + 手动 `setQueryData`。MaterialEditSheet 的"保存素材"按钮仍使用 `editMaterialMutation`（需要 toast 反馈）。
```

---

## 八、实施计划

### Phase 1：Tab 合并 + 架构重构（基础）

1. `page.tsx`：4 Tab → 3 Tab，移除 OpportunityTab 导入
2. `OpportunityForm.tsx`：迁入 `workbench/` 目录
3. `OpportunityListPanel.tsx`：升级——集成商机 CRUD（卡片 ✏️🗑 + 顶部 [+ 新建] + 选中高亮）
4. `WorkbenchOverview.tsx` → `PendingOverviewPanel.tsx`：重命名，职责收缩为右侧面板概览态内容
5. `WorkbenchTab.tsx`：**重写**为共享左面板 + 右面板切换架构（PC 端左右分栏，移动端 Push/Pop）
6. 删除 `OpportunityTab.tsx`、`OpportunityCard.tsx`（功能已合并）

### Phase 2：素材表格列重构（核心变更）

7. `ProgressActionCell.tsx`：新建进度+操作合并单元格（紧凑进度条 + 主按钮 + "..."更多菜单）
8. `MaterialImageCell.tsx`：新建封面图单元格（缩略图+上传+排序+删除+lightbox）
9. `InlineEditCell.tsx`：新建通用行内编辑单元格（点击→编辑→blur 保存）
10. `StatusPipeline.tsx`：新增 `compact` 变体
11. `MaterialRow.tsx`：**重写**为新 8 列结构 + 行内编辑 + 行点击
12. `MaterialWorkspace.tsx`：新 GRID_COLS + 表头 + 返回概览按钮 + 接入 BatchActionBar

### Phase 3：Sheet 瘦身 + 移动端

13. `MaterialEditSheet.tsx`：**重写**（图片管理+描述+AI上下文，移除价格/账号/类目）
14. `MaterialCard.tsx`：新建移动端素材卡片（表格降级，含全部行内操作）
15. `ReferencePanel.tsx`：+N 更多截断
16. 移动端导航：概览层（胶囊条 + 待办分组）→ 工作区层（卡片 + BottomSheet 编辑）
17. 移动端触控：所有交互元素 ≥ 44px

### Phase 4：数据流 + 验证

18. `useWorkbenchPage`：新增 `accounts` 查询 + 商机 CRUD 集成
19. `shared/constants.ts`：新增列配置、缓存 key 常量
20. 删除 `opportunity/` 目录
21. 全局 TypeScript 检查
22. PC 端功能回归验证
23. 移动端功能回归验证

### 复杂度评估

| Phase | 复杂度 | 理由 |
|-------|--------|------|
| Phase 1 | **高** | Tab 合并 + 共享面板架构是结构性改动 |
| Phase 2 | **高** | 行内编辑、图片管理、状态机合并是核心交互改动 |
| Phase 3 | 中 | Sheet 重写 + 移动端卡片降级 |
| Phase 4 | 低 | 数据流整理 + 验证 |

**总估算**：~1500 行新增/修改代码，涉及 ~18 个文件（比初版多 3 个：MaterialCard + PendingOverviewPanel + 移动端逻辑）。

### 可并行工作

| 并行组 | 内容 | 理由 |
|--------|------|------|
| Group A | Phase 1 的 1-4（基础设施） | 不依赖其他 Phase |
| Group B | Phase 2 的 7-10（独立单元格组件） | 纯 UI 组件，可独立开发 + Storybook |
| Group C | Phase 3 的 13-14（Sheet + MaterialCard） | 依赖 Phase 2 的组件，但可并行于 Phase 1 的后半段 |

**建议执行顺序**：Phase 1 → Phase 2（依赖 Phase 1 的架构）→ Phase 3（依赖 Phase 2 的组件 + Phase 1 的移动端架构）→ Phase 4

---

## 附录 A：与旧 PublishInstanceRow 的对齐清单

| 旧功能 | 旧实现 | 新方案 |
|--------|--------|--------|
| 封面图展示 | 行内缩略图 56×56 | MaterialImageCell 48×48 |
| 图片上传 | 行内 + 号按钮，隐藏 file input | 同，提取为独立组件 |
| 图片拖拽排序 | HTML5 drag & drop | 同（行内）+ Sheet 内大图排序 |
| 图片删除 | 悬停 × 按钮 | 同 |
| 图片 lightbox | onClick → onLightbox | 同 |
| 价格行内编辑 | input[number] + onBlur 保存 | InlineEditCell 封装 |
| 账号下拉 | select + onChange 即时保存 | 同，从缓存读 accounts |
| 类目下拉 | select + onChange 即时保存 | 同，从缓存读 channels |
| 进度条 | CreationProgressBar（5阶段） | ProgressActionCell（4节点紧凑） |
| 删除按钮 | 🗑 + window.confirm | 🗑 + ConfirmDialog |
| 行选中 | 点击行 → 打开 Sheet 展开编辑 | 点击行 → 打开 Sheet（更轻量） |
| AI 操作 | onStageClick 回调 | 行内按钮，自调 mutation |

## 附录 B：设计决策记录

| 决策 | 结论 | 理由 |
|------|------|------|
| 4 Tab → 3 Tab | 合并 opportunity + workbench | 连续流程不应跨 Tab |
| 左侧面板持久化 | PC 端始终可见商机列表 | 概览→工作区→切换商机，全在右侧面板完成 |
| 右侧面板按选中状态切换 | PendingOverviewPanel ↔ MaterialWorkspace | 返回概览 = 清空 selectedOid，不跳转路由 |
| PC 概览用左右分栏 | 左商机列表 + 右待办清单 | 各司其职，商机 CRUD 不干扰待办浏览 |
| 移动端 Push/Pop 两层 | overview → workspace | 移动端无左右分栏，全屏切换是正确模式 |
| 移动端概览用胶囊条选商机 | 横向滚动胶囊条 | 节省纵向空间，快速切换上下文 |
| 移动端素材用卡片 | 表格降级为 MaterialCard | 8 列表格在 ≤428px 宽无法展示 |
| 账号/类目走行内 | 是（PC 和移动端均行内） | 高频操作，行内 2 秒 vs Sheet 10 秒 |
| 价格走行内 | 是 | 一个数字，input 比 Sheet 快 |
| 图片走行内缩略图+Sheet大图 | 是 | 行内空间有限，Sheet 做复杂管理 |
| AI上下文保留在 Sheet | 是 | 低频配置，不需要行内改 |
| 概览始终可达 | 是（清空 selectedOid） | 用户中途需要看全局 |
| 三列合并 | 是（进度+操作合并） | 100% 信息冗余，浪费横向空间 |
| 删除保留在行内 | 是 | 最常用的"负操作"，不要藏 |
| MaterialRow 自包含 | 保持（≤5 props） | 扩展数据来源（accounts/channels）通过缓存 |
| 行内编辑静默保存 | 直接调 API + setQueryData，无 toast | 每次 blur 弹 toast 太吵；Sheet 保存用 mutation（弹 toast） |
| 旧 PublishInstanceRow 模式 | 参考对齐 | 已验证的行内编辑模式不应丢弃 |
