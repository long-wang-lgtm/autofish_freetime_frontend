/**
 * 商品管理 API 客户端
 *
 * 对齐后端 ShopItem 新模型（旧 ItemList 模型已弃用）。
 * 所有查询参数统一走 fetchApi 的 params 选项。
 */
import { fetchApi, OperationResponse } from "@/lib/utils/api"

// ═══════════════════════════════════════════════════════════════
// 排序字段
// ═══════════════════════════════════════════════════════════════

export const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "reservePrice", label: "价格" },
  { key: "publishTime",  label: "发布时间" },
  { key: "created_at",   label: "创建时间" },
  { key: "updated_at",   label: "更新时间" },
] as const

// ═══════════════════════════════════════════════════════════════
// 筛选参数
// ═══════════════════════════════════════════════════════════════

export interface ItemFilters {
  uid?: string
  status?: number
  gid?: string
  title?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}

// ═══════════════════════════════════════════════════════════════
// 核心数据模型（对齐后端 ShopItemSchema）
// ═══════════════════════════════════════════════════════════════

/** 账号精简信息（AccountNameSchema） */
export interface AccountName {
  uid: string
  name: string
  status: number
  isPro: boolean
}

/** SKU 规格项 */
export interface ItemSKU {
  skuid: number
  price: number                        // 单位：分
  quantity: number
  values: { name: string; value: string }[]
}

/** 发货方式（DIRECT=直发 VOUCHER=卡密） */
export interface ShipByVoucher {
  kind: 'DIRECT' | 'VOUCHER'
  skuid: number | null
  voucherkindid: number | null         // 卡种 ID
  useinstructions: string | null       // 使用说明
}

/** 发货/收货后赠送/评价后赠送 — 三家共用 */
export interface ShipConfig {
  byEntirety: boolean | null           // true=按商品 false=按 SKU
  entirety: ShipByVoucher | null
  skus: Record<number, ShipByVoucher>
}

/** 商品配置（一对一关联 ItemConfig 表） */
export interface ShopItemConfig {
  gid: number
  sendCode: string | null
  reply_default_content: string | null
  ai_prompt: string | null
  shipment: ShipConfig                 // 发货配置
  shipconfirm: ShipConfig              // 收货后赠送
  evaluation: ShipConfig               // 评价后赠送
}

/** 粉丝价单档（闲鱼返回的分组，price 单位：元） */
export interface ItemFans {
  title: string
  price: number
}

/**
 * fans 字段的形态 —— 后端 ItemFansPrice 是普通 BaseModel（不是 ItemSKUList 那样的
 * RootModel），序列化出来是 { root: [...] }；但写入路径 core/im/account.py:788 传的是
 * 裸列表，所以两种形态都可能出现，读取统一走 config.ts 的 getFansGroups。
 */
export type ItemFansPrice = { root: ItemFans[] } | ItemFans[]

/** 商品主模型（ShopItemSchema） */
export interface ShopItem {
  gid: number
  title: string
  picurl: string
  status: number
  reservePrice: string                 // 价格字符串（多 SKU 时为 "min~max"）
  quantity: number | null              // 库存；仅鱼小铺（Pro）账号会同步真实值
  publishTime: string | null           // ISO 8601 datetime
  auto_ship: boolean
  auto_reply: boolean
  auto_ai_reply: boolean
  auto_restock: boolean
  skus: ItemSKU[] | null
  fans: ItemFansPrice | null           // 粉丝价；仅鱼小铺（Pro）账号有
  created_at: string                   // ISO 8601 datetime
  updated_at: string                   // ISO 8601 datetime
  account: AccountName
  config: ShopItemConfig | null
  rulesCount: number | null
}

/** 商品列表分页响应 */
export interface ShopItemListResponse {
  total: number
  page: number
  size: number
  items: ShopItem[]
}

// ═══════════════════════════════════════════════════════════════
// 商品编辑物料（ItemMaterial）
// ═══════════════════════════════════════════════════════════════
//
// POST /api/items/edit.detail 的响应，与保存接口的请求体同构：
// 后端拿到的是发布器原始报文（camelCase），校验成 ItemDetailEditpublish 后
// 取 .mat 返回 ItemMaterial；Pydantic 的字段名即报文里的键名，所以这里保持
// camelCase，不做风格统一 —— 与 ShopItem（snake_case）不同源，别混用。
//
// 价格、库存的单位都由后端模型固定：价格一律「分」（ItemPrice.priceInCent），
// 库存一律整数（多规格在 itemSkuList 上，单规格在 quantity 上）。

/** 商品描述块。注意：后端读回时 title 被校验器覆盖为 desc 全文，没有独立短标题 */
export interface ItemEditDesc {
  title: string
  desc: string
  titleDescSeparate: boolean
}

/** 商品图片。major 标记封面 */
export interface ItemEditImage {
  url: string
  widthSize: number | string
  heightSize: number | string
  major: boolean
  labels: string[]
  isQrCode: boolean
  type: number
  status: string
  extraInfo: Record<string, boolean>
}

/** 商品分类 */
export interface ItemEditCat {
  catId: number | string
  catName: string
  channelCatId: number | string
}

/** 商品类目（带 text / properties 两个发布器需要的派生字段） */
export interface ItemEditLabel {
  channelCateId: number | string
  channelCateName: string | null
  valueId: string | number | null
  valueName: string | null
  tbCatId: string | number | null
  subPropertyId: string | number | null
  subValueId: string | number | null
  labelType: string
  labelId: string | number | null
  propertyName: string
  isUserClick: number
  isUserCancel: string | null
  propertyId: string | number
  labelFrom: string
  text: string
  properties: string
}

/**
 * 单规格价格。
 *
 * 多规格商品下后端把这两个字段置为空 dict（价格改由 itemSkuList 承载），
 * 所以字段本身可选 —— 用 `{}` 表达「这里没有价格」比造一个联合类型更省事。
 */
export interface ItemEditPrice {
  priceInCent?: number | string
  origPriceInCent?: number | string
}

/**
 * 规格值。propertyValueImg 是闲鱼侧「规格值配图」的预留字段，当前一律 null
 * （与 supportImage: false 配套）。
 */
export interface ItemEditPropertyValue {
  propertyValue: string
  propertyValueImg: string | null
}

/**
 * 规格维度声明 —— 有哪些规格名、每个下面有哪些规格值。
 *
 * 与 itemSkuList 是同一件事的两个视角：这里说「有哪些规格」，itemSkuList 说
 * 「每个组合卖多少钱、还剩几件」。改规格必须两个一起改，只改一个，请求体里就会
 * 同时带着新的组合表与旧的规格声明。
 */
export interface ItemEditProperty {
  propertyName: string
  supportImage: boolean
  propertyValues: ItemEditPropertyValue[]
}

/** 多规格 SKU */
export interface ItemEditSkuProperty {
  propertyText: string
  valueText: string
}

export interface ItemEditSku {
  priceInCent: number | string
  quantity: number | string
  propertyList: ItemEditSkuProperty[]
}

/** 商品服务标签（enable 控制是否勾选） */
export interface ItemEditProtocol {
  enable: boolean
  serviceCode: string
}

/** 运费 */
export interface ItemEditPostFee {
  canFreeShipping: boolean
  supportFreight: boolean
  onlyTakeSelf: boolean
  postPriceInCent: number | string
  templateId: number | string
  idleTemplateId: number | string
}

/** 发布地址 */
export interface ItemEditAddr {
  area: string
  city: string
  divisionId: number
  gps: string
  prov: string
  poiId: string | null
  poiName: string | null
}

/**
 * 商品编辑物料 —— edit.detail 的响应，也是保存/重发接口的请求体。
 *
 * titleDescSeparate / uniqueCode / sourceId 等发布器元字段不在其中：
 * 后端 .mat 只暴露 ItemMaterial 的字段。
 */
export interface ItemEditMaterial {
  itemTextDTO: ItemEditDesc
  imageInfoDOList: ItemEditImage[]
  itemCatDTO: ItemEditCat
  itemPostFeeDTO: ItemEditPostFee
  itemLabelExtList: ItemEditLabel[]
  userRightsProtocols: ItemEditProtocol[]
  itemAddrDTO: ItemEditAddr
  quantity: number | string
  itemId?: number | string | null
  /**
   * 规格维度声明。多规格商品必须与 itemSkuList 一致（两者是同一件事的两个视角），
   * 所以它不单独改写 —— 统一走 mutators.setSkuList。单规格时为 []。
   *
   * 报文字段，没有 root 包装：itemSkuList 是 []，它就是 [{propertyName, ...}]。
   */
  itemProperties?: ItemEditProperty[] | null
  itemSkuList?: ItemEditSku[] | null
  itemPriceDTO: ItemEditPrice
}

// ═══════════════════════════════════════════════════════════════
// 更新专用类型
// ═══════════════════════════════════════════════════════════════

/** PUT /update.item body — 排除 config / account */
export type ShopItemUpdate = Partial<Omit<ShopItem, 'config' | 'account'>>

/** PUT /update.item.config body — 排除 shipment / shipconfirm / evaluation */
export type ShopItemConfigUpdate = Partial<Omit<ShopItemConfig, 'shipment' | 'shipconfirm' | 'evaluation'>>

/** PUT /update.item.ship.config body */
export interface ShipConfigUpdate {
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  byEntirety: boolean
  voucher: ShipByVoucher
}

// ═══════════════════════════════════════════════════════════════
// 卡种
// ═══════════════════════════════════════════════════════════════

/** 卡种（VoucherKindSchema） */
export interface VoucherKind {
  id: number
  name: string
  desc: string | null
  prefix_credit: string | null
  prefix_secret: string | null
  secretsCount: number | null
}

// ═══════════════════════════════════════════════════════════════
// 订单
// ═══════════════════════════════════════════════════════════════

/**
 * 订单（ItemOrder 模型，orderStatus 覆盖待付款/待发货/已发货/交易成功/退款中/交易关闭，
 * 字段 snake_case 对齐后端）。
 *
 * 三个时间字段按订单流转依次落值：created_at 一定有值，payment_at / shipped_at /
 * finishd_at 各自在到达对应节点后才有值（老数据可能缺，渲染时按 `-` 兜底）。
 */
export interface PendingOrder {
  orderId: string
  orderStatus: string
  buyerId: string
  buyername: string | null
  buyNum: number
  totalPrice: number
  sku: ItemSKU[] | null
  created_at: string             // 下单时间
  payment_at: string | null      // 付款时间
  shipped_at: string | null      // 发货时间
  finishd_at: string | null      // 成交时间（后端字段名带拼写错误，照抄）
  account: AccountName
  item: ShopItem                 // 完整商品对象，直接喂 ShipConfigModal
}

/** 订单分页响应 */
export interface PendingOrdersResponse {
  total: number
  page: number
  size: number
  items: PendingOrder[]
}

// ═══════════════════════════════════════════════════════════════
// API 函数
// ═══════════════════════════════════════════════════════════════

/** 商品列表 — GET /api/items/list */
export async function listItems(filters?: ItemFilters): Promise<ShopItemListResponse> {
  return fetchApi<ShopItemListResponse>("/api/items/list", { params: filters as Record<string, string | number> })
}

/** 上架商品 — POST /api/items/shelves?gid=&uid= */
export async function shelvesItem(gid: number, uid: string): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/shelves", {
    method: "POST",
    params: { gid, uid },
  })
}

/** 下架商品 — POST /api/items/offline?gid=&uid= */
export async function offlineItem(gid: number, uid: string): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/offline", {
    method: "POST",
    params: { gid, uid },
  })
}

/** 删除商品 — POST /api/items/delete?gid=&uid= */
export async function deleteItem(gid: number, uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>("/api/items/delete", {
    method: "POST",
    params: { gid, uid },
  })
}

/**
 * 重新发布商品 — POST /api/items/item.republish?gid=&uid=
 *
 * 请求体是编辑弹窗里那份物料（与保存接口同一个形态）：重发不是「原样再发一遍」，
 * 用户在弹窗里改过的字段要跟着新商品一起生效。
 *
 * 后端语义为「先发布一条新商品，再删除原商品」，新商品的 gid 与原商品不同。
 * 返回的是已经入库的新商品本身，调用方拿它替换列表里原商品那一行 ——
 * 不需要再重新拉列表。
 */
export async function republishItem(
  gid: number,
  uid: string,
  material: ItemEditMaterial
): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/item.republish", {
    method: "POST",
    params: { gid, uid },
    body: JSON.stringify(material),
  })
}

/** 改价（普通账号）— POST /api/items/edit.price.by.idle?gid=&uid=&price= */
export async function editPriceByIdle(gid: number, uid: string, price: number): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/edit.price.by.idle", {
    method: "POST",
    params: { gid, uid, price },
  })
}

/**
 * 后端 /edit.price.by.pro 的 quantity 默认值。
 * 该接口一次提交「价格 + 库存」，不传 quantity 后端就按这个值写入，
 * 所以前端必须显式带上，避免"只想改价却顺手把库存重置了"。
 */
export const PRO_DEFAULT_QUANTITY = 9999

/** 改价（鱼小铺 Pro 账号，同时改库存）— POST /api/items/edit.price.by.pro?gid=&uid=&price=&quantity= */
export async function editPriceByPro(
  gid: number, uid: string, price: number, quantity: number,
): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/edit.price.by.pro", {
    method: "POST",
    params: { gid, uid, price, quantity },
  })
}

/**
 * 粉丝价提交载荷 —— 三档自 2026-09-11 起都是可选的，只提交用户实际填了的档。
 */
export interface FansPriceUpdate {
  all?: number
  old?: number
  buy?: number
}

/**
 * 设置粉丝价（仅鱼小铺 Pro 账号）— POST /api/items/edit.set.fans.price?uid=&gid=
 *
 * 注意这个接口的参数位置与其它不同：uid/gid 在 query，价格在 Body。
 * Body 只需带上要改的档位，未带的档后端不会下发到闲鱼（fishapi 侧 `if v is not None` 过滤）。
 */
export async function setFansPrice(
  gid: number,
  uid: string,
  prices: FansPriceUpdate,
): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/edit.set.fans.price", {
    method: "POST",
    params: { uid, gid },
    body: JSON.stringify(prices),
  })
}

/**
 * 拉取商品编辑物料 — POST /api/items/item.edit.detail?gid=&uid=
 *
 * 响应即保存/重发接口的请求体，编辑弹窗全程以它为数据源。后端读和写用的是同一个
 * schema（ItemDetailEditpublish），所以弹窗能把响应原样回传，不需要映射层。
 */
export async function getItemEditDetail(
  gid: number,
  uid: string,
): Promise<ItemEditMaterial> {
  return fetchApi<ItemEditMaterial>("/api/items/item.edit.detail", {
    method: "POST",
    params: { gid, uid },
  })
}

/**
 * 获取渠道类目候选 — POST /api/items/item.edit.channel?uid=（gid / desc 在 Body）
 *
 * desc 是商品描述：闲鱼按描述推荐类目（mtop.taobao.idle.kgraph.property.recommend），
 * 后端还会把该账号历史常用的类目一并附在后面，所以返回的列表会有重复项，去重交给调用方。
 *
 * 参数位置与多数接口不同：uid 在 query，gid 与 desc 在 Body。后端这两个形参都声明成
 * str，而 pydantic 不收 JSON 里的数字，所以 gid 必须转成字符串再下发，直传数字是 422。
 *
 * 返回项与物料里的 itemLabelExtList 同构（同一个 ItemLabel schema，RootModel 序列化
 * 出来是裸数组），选中项的两个字段可以直接喂给 setChannelCate。
 */
export async function getItemEditChannels(
  gid: number,
  uid: string,
  desc: string,
): Promise<ItemEditLabel[]> {
  return fetchApi<ItemEditLabel[]>("/api/items/item.edit.channel", {
    method: "POST",
    params: { uid },
    body: JSON.stringify({ gid: String(gid), desc }),
  })
}

/**
 * 编辑商品属性 — POST /api/items/item.edit?gid=&uid=
 *
 * 请求体就是 edit.detail 的响应原样回传：后端读和写用的是同一个 schema
 * （ItemDetailEditpublish），多带的 itemTypeStr / uniqueCode / sourceId 等发布器
 * 元字段会在解析时按默认值或重新生成，不需要前端拼。
 *
 * 返回的 ShopItem 是库里那条记录，与列表行同构 —— 调用方拿它替换列表里对应的那一条
 * （见 useItemMutations 的 editItemMutation），所以这里的字段要能直接喂给列表渲染。
 */
export async function editItem(
  gid: number,
  uid: string,
  material: ItemEditMaterial,
): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/item.edit", {
    method: "POST",
    params: { gid, uid },
    body: JSON.stringify(material),
  })
}

/** 更新商品基础字段 — PUT /api/items/update.item?gid= */
export async function updateItem(gid: number, data: ShopItemUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 更新商品配置 — PUT /api/items/update.item.config?gid= */
export async function updateItemConfig(gid: number, data: ShopItemConfigUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item.config", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 更新发货/收货/评价配置 — PUT /api/items/update.item.ship.config?gid= */
export async function updateItemShipConfig(gid: number, data: ShipConfigUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item.ship.config", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 刷新账号商品 — POST /api/items/refresh?uid= */
export async function refreshItems(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>("/api/items/refresh", {
    method: "POST",
    params: { uid },
  })
}

/** 获取卡种列表 — GET /api/items/voucher.list */
export async function getVoucherKinds(): Promise<VoucherKind[]> {
  return fetchApi<VoucherKind[]>("/api/items/voucher.list")
}

/**
 * 订单待办计数 — GET /api/orders.waiting.count
 *
 * 返回 `{ 状态名: 数量 }`（如 `{'待付款': 6, '待发货': 15, '退款中': 2}`）。
 * 后端是 group_by 出来的结果，**只包含确实有单的状态**，所以读取时一律 `?? 0` 兜底
 * （某个状态清零时 key 会直接消失）。
 *
 * 原 `/orders.pending.count`（只给待发货一个总数）已弃用。
 */
export async function fetchWaitingOrderCount(): Promise<Record<string, number>> {
  return fetchApi<Record<string, number>>("/api/orders.waiting.count")
}

/**
 * 订单列表可排序字段白名单 —— 必须与后端 /orders.list 的 SORTABLE_FIELDS 一致，
 * 不在表里的排序字段后端会静默退回 payment_at。
 */
export const ORDER_SORTABLE_FIELDS = [
  'created_at', 'payment_at', 'shipped_at', 'finishd_at', 'totalPrice', 'buyNum',
] as const

/** 可展示的时间字段（须是 PendingOrder 的字段名） */
export type OrderTimeField = 'created_at' | 'payment_at' | 'shipped_at' | 'finishd_at'

/** 表格/卡片里的一个时间列 */
export interface OrderTimeColumn {
  label: string
  field: OrderTimeField
}

/** 订单状态 Tab 配置 */
export interface OrderStatusTab {
  /** URL ?tab= 参数值 */
  key: string
  /** Tab 文案 */
  label: string
  /** 后端 orderStatus 字面量；跨状态的档位（全部订单）不传，即不按状态筛 */
  state?: string
  /** 空态 / 错误文案里指代本档订单的名词（「暂无X」「加载X失败」） */
  emptyText: string
  /**
   * 本档要展示的时间列（按顺序排布）。
   *
   * 按订单流转环节累积：待付款只有下单时间 → 待发货加付款时间 → 已发货再加发货时间 →
   * 交易成功一路到成交时间。没发生过的环节不列，整列都会是 `-`。
   */
  times: readonly OrderTimeColumn[]
  /** 是否处于「待处理」阶段 —— 只有这类状态才需要发货配置与「去配置」操作 */
  actionable: boolean
  /** 是否可改价 —— 只有待付款档有这动作（买家还没付款，卖家才调得动价） */
  canReprice?: boolean
  /** 是否展示「订单状态」列 —— 跨状态的档位才有必要，单状态档位该列恒为同一个值 */
  withState?: boolean
}

/**
 * 四个时间列的标签与字段 —— 各档配置直接引用，别在每档重复写字面量。
 * 标签即业务口径：下单时间（created_at）/ 付款时间（payment_at）/ 发货时间（shipped_at）/ 成交时间（finishd_at）。
 */
const ORDER_TIME_COLUMNS = {
  created:  { label: '下单时间', field: 'created_at' },
  paid:     { label: '付款时间', field: 'payment_at' },
  shipped:  { label: '发货时间', field: 'shipped_at' },
  finished: { label: '成交时间', field: 'finishd_at' },
} as const satisfies Record<string, OrderTimeColumn>

/** 订单状态筛选项（顺序即 Tab 顺序） */
export const ORDER_STATUS_TABS = [
  { key: 'all',       label: '全部订单', state: undefined,  emptyText: '订单',
    times: [ORDER_TIME_COLUMNS.created], actionable: false, withState: true },
  { key: 'notpay',    label: '待付款',   state: '待付款',   emptyText: '待付款订单',
    times: [ORDER_TIME_COLUMNS.created], actionable: true, canReprice: true },
  { key: 'notship',   label: '待发货',   state: '待发货',   emptyText: '待发货订单',
    times: [ORDER_TIME_COLUMNS.created, ORDER_TIME_COLUMNS.paid], actionable: true },
  { key: 'shipped',   label: '已发货',   state: '已发货',   emptyText: '已发货订单',
    times: [ORDER_TIME_COLUMNS.created, ORDER_TIME_COLUMNS.paid, ORDER_TIME_COLUMNS.shipped], actionable: false },
  { key: 'refunding', label: '退款中',   state: '退款中',   emptyText: '退款中订单',
    times: [ORDER_TIME_COLUMNS.created, ORDER_TIME_COLUMNS.paid], actionable: false },
  { key: 'finished',  label: '交易成功', state: '交易成功', emptyText: '交易成功订单',
    times: [ORDER_TIME_COLUMNS.created, ORDER_TIME_COLUMNS.paid, ORDER_TIME_COLUMNS.shipped, ORDER_TIME_COLUMNS.finished], actionable: false },
  { key: 'closed',    label: '交易关闭', state: '交易关闭', emptyText: '交易关闭订单',
    times: [ORDER_TIME_COLUMNS.created], actionable: false },
] as const satisfies readonly OrderStatusTab[]

/**
 * 订单列表查询条件（筛选/排序/同步 —— 后端全部收在请求体里）。
 *
 * 一框一字段，每个参数只筛一个字段。匹配语义分两档（照抄后端）：
 * - 精确：uid / orderId / gid / buyerId / state
 * - 包含：title / buyerName
 */
export interface OrdersQuery {
  uid?: string
  state?: string
  /** true = 先向闲鱼拉一次最新订单再返回列表（耗时较长，由页面「同步」按钮触发） */
  sync?: boolean
  /** 订单号，精确 */
  orderId?: string
  /** 商品 ID，精确 */
  gid?: string
  /** 商品标题，包含匹配 */
  title?: string
  /** 买家 ID，精确 */
  buyerId?: string
  /** 买家昵称，包含匹配 */
  buyerName?: string
  order_by?: string
  asc?: boolean
}

/**
 * 订单列表 — POST /api/orders.list?page=&size=
 *
 * 订单接口自 2026-09 起迁到 `free/user/order.py`（router prefix `/api`，不再是 `/api/items`）。
 * 分页在 query，其余条件全在后端 Body 参数里（uid/state/sync/order_by/asc）。
 * 注意这里是 POST 而非 GET：浏览器 fetch 不允许 GET 携带请求体，
 * 而 body 化的筛选参数是调不通就退化成「全量 + 默认排序」的静默错误，
 * 所以后端路由必须注册为 post。
 *
 * sync=true 时后端会先同步一次订单再返回，调用方（页面「同步」按钮）需自行
 * 承担等待与失败提示。
 */
export async function fetchOrders(
  query: OrdersQuery,
  page = 1,
  size = 20,
): Promise<PendingOrdersResponse> {
  return fetchApi<PendingOrdersResponse>("/api/orders.list", {
    method: "POST",
    params: { page, size },
    body: JSON.stringify(query),
  })
}

/**
 * 修改订单价格 — GET /api/order.alter.price?uid=&orderId=&newprice=
 *
 * 三个参数全在 query。`newprice` 单位是**元**（与 totalPrice 同口径），后端自己乘 100
 * 换成闲鱼要的「分」。返回改价后的订单对象，调用方拿它替换列表里那一行即可，
 * 不必重新拉列表。
 *
 * 仅待付款订单可改价（后端只在买家未付款时调得动），所以按钮只挂在这一档。
 */
export async function alterOrderPrice(
  uid: string,
  orderId: string,
  newprice: number,
): Promise<PendingOrder> {
  return fetchApi<PendingOrder>("/api/order.alter.price", {
    params: { uid, orderId, newprice },
  })
}
