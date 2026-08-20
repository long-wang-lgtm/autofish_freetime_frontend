// showcase 展示页静态数据（全部脱敏 + 数值模糊化：无真实账号名/商品ID/域名/token/精确数量，不接真实系统）

// ---- 模拟对话问答库（关键词规则匹配，答案结构来自真实报告 + 岗位规则，数值为示意值）----

export interface ChatQA {
  keywords: string[]
  answer: string
}

export const chatQAs: ChatQA[] = [
  {
    keywords: ['重点', '运营', '今天', '今日', '重心'],
    answer:
      '今日运营重心如下：\n- **账号C**（普通）：动销率双位数偏低，在售已满 → 重点运营，先淘汰滞销腾名额再上新\n- **账号D**（鱼小铺）：动销率偏低，在售未满 → 重点运营，高频测品\n- **账号E**（普通）：动销率极低，总销量个位数 → 重点运营，需高频测品\n- 领头羊 **账号B**（总销量领先）与 **账号A**（紧随其后）出单稳定 → 稳定监测，减少干预',
  },
  {
    keywords: ['爆单', '爆款', '突增'],
    answer:
      '今日无爆单信号。\n爆单判定规则：近 3 天销量突增且转化率高企，以前 4 天日均作为基准对比。\n当前各账号均处于常规节奏，无账号触发爆单条件。',
  },
  {
    keywords: ['下架', '滞销', '淘汰', '策略'],
    answer:
      '商品策略按 曝光 + 转化 + 出单 综合判定：\n- **强制下架**：上架超 60 天仍无出单\n- **建议下架**：曝光 <200 且低转化且订单少\n- **建议优化**：曝光 ≥200 但无订单，优化封面/描述/价格，观察半个月\n今日候选已按本周剩余配额截断（普通账号 10 个/周，低销量账号 20 个/周），超出部分标注"下周处理"。',
  },
  {
    keywords: ['数据', '来源', '接口', 'api'],
    answer:
      '数据来自自有系统的正式 API（账号清单、账号聚合指标、商品明细、官方采集经营数据、订单数据），请求带 Bearer 鉴权。\n每次取数后落本地快照库（账号级 + 商品级时间序列），环比 / 衰退 / 轮动判断都基于快照，不重复拉全量历史。',
  },
  {
    keywords: ['改价', '调价', '自动', '上架'],
    answer:
      '不会自动执行写操作。\n红线：未经批准不修改价格、不自动上架/下架、不删除任何数据。\n流程：分析 → 候选清单 → 人工确认 → dry-run 预览 → 小批量 → 全量，全程配额拦截（每账号每日调价 ≤15、同品 2 天拦截期、观察期 3 天）并落库留痕。',
  },
  {
    keywords: ['几点', '定时', '凌晨', '每天', '触发'],
    answer:
      '设计目标为每日凌晨 5 点自动触发（取数 → 快照 → 规则分析 → 报告 → 飞书推送）。\n当前以手动 / 对话触发为主：在飞书群说一声，或执行一条命令 `uv run python main.py run --prod`，几分钟内出完整日报。',
  },
  {
    keywords: ['发布', '新商品', '创作'],
    answer:
      '不能。\n- 素材侧：`material` 命令只创建草稿 + AI 加工验证，不做真实发布（封面需人工审核后走创作流程）\n- 商品侧：全新商品上架接口未授权，只能 restock 已发布未删除的商品\n这是刻意保留的安全边界。',
  },
  {
    keywords: ['衰退', '下滑', '连续'],
    answer:
      '对"稳定监测"账号提取近 3 天销量与转化率：\n- 连续 3 天销量下滑且转化率降低 → 标记"出现衰退迹象"\n- 判断时考虑工作日 / 周末自然流量波动\n- 历史数据不足 3 天时用已有数据估算，并在报告中标注"趋势为估算"。',
  },
  {
    keywords: ['轮动', '1.5', '倍数'],
    answer:
      '当非领头羊账号的销售额 / 销量超过领头羊的 1.5 倍时触发轮动：\n降低该账号运营频率，把重心放回原领头羊账号。\n触发时报告会高亮提示人工复核重心调整是否合理。',
  },
  {
    keywords: ['飞书', '推送', '报告', '日报'],
    answer:
      '每日报告以 Markdown 存档（report/Fire-数据分析-日期.md），同时推送摘要 + 完整报告到飞书群。\n报告结构：数据概览 → 今日重点 → 各账号分析 → 商品策略 → 动作清单 → 异常汇总，每个结论都有数据支撑。',
  },
]

export const chatSuggestions = [
  '今天重点运营哪个账号？',
  '有哪些商品建议下架？',
  '你会自动改价吗？',
  '你的数据从哪来？',
]

export const fallbackAnswer =
  '这个话题不在演示范围内。\n可以试试问：\n- 今天重点运营哪个账号？\n- 有哪些商品建议下架？\n- 你会自动改价吗？\n- 你的数据从哪来？'

// ---- 能力 6 卡 ----

export interface Capability {
  title: string
  description: string
  icon: string
}

export const capabilities: Capability[] = [
  {
    title: '每日运营分析',
    description:
      '自动拉取全部账号经营数据，生成带数据支撑的 Markdown 日报：数据概览、今日重点、各账号分析、异常汇总，一条命令几分钟跑完。',
    icon: 'chart',
  },
  {
    title: '运营重心分配',
    description:
      '按销售额/销量/动销率为每个账号打标签：重点运营（高频测品）、稳定监测（减少干预）、暂停上新（爆单保护），并支持 1.5 倍轮动判断。',
    icon: 'target',
  },
  {
    title: '商品策略建议',
    description:
      '扫描全量在售商品，按 曝光/转化/出单/上架时长 分档：强制下架、建议下架、建议优化，动作清单按配额截断，不一次性甩一长串。',
    icon: 'tag',
  },
  {
    title: '衰退与爆单监测',
    description:
      '连续 3 天下滑且转化率降低 → 衰退迹象；近 3 天销量突增且转化率高企 → 爆单信号；考虑工作日/周末自然流量波动。',
    icon: 'alert',
  },
  {
    title: '专项决策工具',
    description:
      '选品分析（销量+销售额权重）、刷单计划（a/b/c 分类+轮换）、市场价区间（p25~p75 定价辅助）、账号人群画像，全部 JSON 存档可回溯。',
    icon: 'tool',
  },
  {
    title: '飞书日报推送',
    description:
      '日报本地存档 + 摘要推送飞书群，异常完整记录（API 异常/数据缺失/字段异常），出问题时降级为可用结论并标注，不报错完事。',
    icon: 'send',
  },
]

// ---- CLI 工作流时间线（数值已模糊化）----

export const workflowLabels = ['取数', '快照落库', '配额计算', '规则分析', '观察回填', '报告推送']

export const workflowLines = [
  '# 演示环境：账号数量与数值均已模糊化',
  '账号清单: N 个（鱼小铺 + 普通 混合）',
  '账号聚合 + 商品明细 + 官方采集（滞后1天，异常降级不中断）',
  '账号级 + 商品级 时间序列 upsert（analyze.sqlite3, WAL）',
  '调价今日已用/上限 · 下架7天已用/上限',
  '阶段 / 爆单 / 衰退 / 轮动 / 商品分级 / 调价候选',
  'report/Fire-数据分析-2026-08-19.md → 推送飞书',
]

// ---- 日报样例（结构对齐真实报告；账号名占位，全部数值为示意值，非真实数据）----

export interface AccountOverview {
  name: string
  type: '鱼小铺' | '普通'
  totalSales: number
  sellThrough: string
  onShelf: string
  phase: string
  focus: '稳定监测' | '重点运营'
}

export const overviewRows: AccountOverview[] = [
  { name: '账号A', type: '鱼小铺', totalSales: 560, sellThrough: '44.2%', onShelf: '76/300', phase: '平稳期', focus: '稳定监测' },
  { name: '账号B', type: '鱼小铺', totalSales: 610, sellThrough: '42.8%', onShelf: '95/300', phase: '上升期', focus: '稳定监测' },
  { name: '账号C', type: '普通', totalSales: 22, sellThrough: '13.6%', onShelf: '50/50', phase: '平稳期', focus: '重点运营' },
  { name: '账号D', type: '鱼小铺', totalSales: 132, sellThrough: '28.4%', onShelf: '64/300', phase: '平稳期', focus: '重点运营' },
  { name: '账号E', type: '普通', totalSales: 4, sellThrough: '5.2%', onShelf: '47/50', phase: '数据不足', focus: '重点运营' },
]

export interface TopItem {
  title: string
  sales: number
  days: number
  daily: number
}

export interface AccountDetail {
  name: string
  type: '鱼小铺' | '普通'
  phase: string
  phaseReason: string
  burst: string
  decline: string
  focus: '稳定监测' | '重点运营'
  focusReason: string
  topItems: TopItem[]
  candidates: string[]
}

export const accountDetails: AccountDetail[] = [
  {
    name: '账号A',
    type: '鱼小铺',
    phase: '平稳期',
    phaseReason: '近3天日均 74.0 / 前4天日均 75.6 = 0.979（0.8~1.2）',
    burst: '无（前4天日均 75.6，近3天无突增）',
    decline: '无（最后3天 76→65→81，未连续下滑）',
    focus: '稳定监测',
    focusReason: '动销率 44.2%、总销量 560，出单稳定，减少干预，持续监测衰退迹象',
    topItems: [
      { title: 'AI 办公效率课程合集', sales: 208, days: 8, daily: 26.0 },
      { title: '设计排版模板精选', sales: 84, days: 8, daily: 10.5 },
      { title: '考证蓝皮书资料包', sales: 44, days: 8, daily: 5.5 },
    ],
    candidates: [
      '<商品ID>（曝光 5，转化 无转化数据，支付 0单，上架 36天）',
      '<商品ID>（曝光 10，转化 0.00%，支付 0单，上架 47天）',
      '<商品ID>（曝光 6，转化 0.00%，支付 0单，上架 38天）',
    ],
  },
  {
    name: '账号B',
    type: '鱼小铺',
    phase: '上升期',
    phaseReason: '近3天日均 84.0 / 前4天日均 70.0 = 1.200（≥1.2 贴线判定）',
    burst: '无（前4天日均 70.0，近3天无突增）',
    decline: '无（最后3天 86→96→71，未连续下滑）',
    focus: '稳定监测',
    focusReason: '动销率 42.8%、总销量 610，当前领头羊账号，保持节奏',
    topItems: [
      { title: '自媒体运营实战手册', sales: 190, days: 8, daily: 23.75 },
      { title: '短视频剪辑教程合集', sales: 88, days: 8, daily: 11.0 },
      { title: '网盘资源导航站', sales: 49, days: 7, daily: 7.0 },
    ],
    candidates: [
      '<商品ID>（曝光 8，转化 0.00%，支付 0单，上架 52天）',
      '<商品ID>（曝光 5，转化 无转化数据，支付 0单，上架 31天）',
    ],
  },
  {
    name: '账号C',
    type: '普通',
    phase: '平稳期',
    phaseReason: '近3天日均 2.8 / 前4天日均 3.2 = 0.875（0.8~1.2）',
    burst: '无（前4天日均 3.2，近3天无突增）',
    decline: '无（最后3天 2→4→1，未连续下滑）',
    focus: '重点运营',
    focusReason: '动销率 13.6% 低、总销量 22 少（在售已满，先淘汰滞销腾名额再上新）',
    topItems: [
      { title: 'Excel 函数速查手册', sales: 11, days: 5, daily: 2.2 },
      { title: '简历模板合集', sales: 7, days: 5, daily: 1.4 },
    ],
    candidates: [
      '<商品ID>（曝光 3，转化 0.00%，支付 0单，上架 60天）强制',
      '<商品ID>（曝光 7，转化 0.00%，支付 0单，上架 55天）',
      '<商品ID>（曝光 3，转化 无转化数据，支付 0单，上架 43天）',
    ],
  },
  {
    name: '账号D',
    type: '鱼小铺',
    phase: '平稳期',
    phaseReason: '近3天日均 19.0 / 前4天日均 17.2 = 1.105（0.8~1.2）',
    burst: '无（前4天日均 17.2，近3天无突增）',
    decline: '无（最后3天 16→19→21，未连续下滑）',
    focus: '重点运营',
    focusReason: '动销率 28.4% 低、总销量 132 少（在售 64/300 未满），需高频测品提升出单',
    topItems: [
      { title: 'Python 入门到实战', sales: 32, days: 7, daily: 4.57 },
      { title: '副业项目拆解合集', sales: 20, days: 6, daily: 3.33 },
    ],
    candidates: [
      '<商品ID>（曝光 5，转化 0.00%，支付 0单，上架 44天）',
      '<商品ID>（曝光 9，转化 0.00%，支付 0单，上架 34天）',
    ],
  },
  {
    name: '账号E',
    type: '普通',
    phase: '数据不足',
    phaseReason: '前4天日均仅 0.6 单（<2），极小样本下阶段判断无意义，趋势为估算',
    burst: '无（前4天日均 0.6，近3天无突增）',
    decline: '无（最后3天 0→0→0，未连续下滑）',
    focus: '重点运营',
    focusReason: '动销率 5.2% 低、总销量 4 少（在售 47/50 未满），需高频测品提升出单',
    topItems: [{ title: '考研资料包', sales: 1, days: 1, daily: 1.0 }],
    candidates: [
      '<商品ID>（曝光 2，转化 无转化数据，支付 0单，上架 26天）新品观察期',
    ],
  },
]

// ---- 规范与边界 ----

export interface Quota {
  item: string
  value: string
  note: string
}

export const quotas: Quota[] = [
  { item: '批量调价', value: '每账号每日 ≤15 个', note: '同商品 2 天拦截期，观察期 3 天' },
  { item: '批量下架', value: '普通账号 10 个/周', note: '低销量账号放宽至 20 个/周' },
  { item: '批量上架', value: '无配额限制', note: '仅 restock 已发布未删除商品' },
  { item: '商品黑名单', value: '指定商品全链路拦截', note: '分析 + 执行层均不触碰' },
]

export const redLines = [
  '未经批准，不修改任何商品价格',
  '未经批准，不自动上架 / 下架商品',
  '不删除任何数据（分析过程只读）',
  '不编造数据：所有结论必须来自 API 返回或明确计算',
  '不写入工作目录以外的任何路径',
]

export const limitations = [
  '不做真实发布：素材命令只创建草稿 + AI 加工验证，发布需人工审核封面后走创作流程',
  '全新商品上架接口未授权，只能 restock 已发布未删除的商品',
  '普通账号（非鱼小铺）无官方经营数据，销售额/客单价等维度缺失，相关规则自动降级',
  '订单接口暂无金额字段，销售额/客单价维度待后端支持后补充',
  '官方采集类数据滞后 1 天，报告内已标注',
]

export const manualInterventions = [
  '写操作一律分步授权：方案 → 模拟展示 → 小批量 → 全量，每步人工确认',
  '全部账号数据异常 → 中止执行，保留数据交人工',
  '账号清单突增/突减超过 50% → 暂停并人工核对',
  '轮动触发（非领头羊超过领头羊 1.5 倍）→ 报告高亮，人工复核重心',
  '云端接口未部署新功能时对应命令 404（如提炼质量抽检需后端先部署）',
]

// ---- 动作清单样例 ----

export interface ActionRow {
  account: string
  action: string
  target: string
  note: string
}

export const actionRows: ActionRow[] = [
  { account: '账号C', action: '下架', target: '<商品ID> 等 N 个', note: '上架>60天无出单（强制）+ 低转化（若干）' },
  { account: '账号A', action: '下架', target: '<商品ID> 等 N 个', note: '曝光<200 且 0 单，本周配额内' },
  { account: '账号C', action: '调价', target: '<商品ID> 等 N 个', note: '7天销量≤1、价格≥0.2，建议降 8%' },
  { account: '账号E', action: '上新', target: '优先补「考研资料」类', note: '在售未满，基于账号画像选品' },
]

export const anomalies = [
  '账号E：官方采集经营数据缺失（普通账号无官方采集），销售额/客单价维度已降级',
  '商品级 API 对账号C 单次返回异常，已重试成功，无数据缺失',
]

/** 样例数据模糊化声明（特殊标记：让阅读者知道数值已被修改） */
export const dataNotice =
  '数据说明：本样例结构与真实报告一致，但账号名、销量、价格、曝光、上架时长等数值已全部模糊化为示意值（非真实数据），仅用于展示报告结构与判定逻辑。'

export const disclaimer =
  '本页面为公开演示环境：全部数据为脱敏样例，模拟对话为预置脚本，页面不连接任何真实系统，无法调用、读取或操作真实数据。数据运营 Agent 与「闲逸通自动发货系统」为两个独立项目——本页 Agent 不开放注册，页面中的注册/登录入口指向自动发货系统。'
