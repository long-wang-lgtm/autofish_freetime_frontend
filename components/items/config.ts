export type ConfigField =
  | "deliveryContent"
  | "receiptAfter"
  | "positiveReviewAfter"
  | "ai_reply_item_prompt"
  | "sendCode"

export const FIELD_LABELS: Record<ConfigField, string> = {
  deliveryContent: "付款后发货内容",
  receiptAfter: "收货后赠送内容",
  positiveReviewAfter: "评价后赠送内容",
  ai_reply_item_prompt: "AI系统提示词",
  sendCode: "指令码",
}

export const PLACEHOLDERS = [
  { label: "订单号", value: "{订单号}" },
  { label: "商品标题", value: "{商品标题}" },
  { label: "价格", value: "{价格}" },
  { label: "数量", value: "{数量}" },
  { label: "使用说明", value: "{使用说明}" },
  { label: "商家编码", value: "{商家编码}" },
  { label: "卡种/卡券方案名称", value: "{卡种/卡券方案名称}" },
  { label: "卡券信息", value: "{卡券信息}" },
  { label: "分段符", value: "{分段符}" },
  { label: "Sku属性名", value: "{Sku属性名}" },
  { label: "充值账号", value: "{充值账号}" },
  { label: "拍下时间", value: "{拍下时间}" },
  { label: "付款时间", value: "{付款时间}" },
  { label: "当前时间", value: "{当前时间}" },
  { label: "买家留言", value: "{买家留言}" },
]

export function formatPublishTime(timestamp: string | null): string {
  if (!timestamp) return "-"
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function statusLabel(status: number): { text: string; color: string } {
  switch (status) {
    case 0:
      return { text: "在售", color: "bg-green-100 text-green-700" }
    case -2:
      return { text: "已下架", color: "bg-gray-100 text-gray-500" }
    case 1:
      return { text: "已售出", color: "bg-red-100 text-red-600" }
    default:
      return { text: "未知", color: "bg-gray-100 text-gray-500" }
  }
}
