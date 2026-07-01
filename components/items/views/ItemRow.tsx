"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"

/** Items 表格列宽定义 — 13 列 grid-template-columns（前2列为商品标题区，后11列为数据列） */
export const ITEMS_GRID_COLS = '2fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'
import { Bot, Truck, Upload } from "lucide-react"
import { ConfigField, formatPublishTime } from "../config"
import { IconToggle } from "../parts/IconToggle"
import { SendCodeEditor } from "../parts/SendCodeEditor"
import { ConfigDrawer } from "../drawers/ConfigDrawer"

interface ItemRowProps {
  item: Item
  isEven: boolean
  onToggle: (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => void
  onEdit: () => void
  onKeywordClick: () => void
  keywordCount: number
  onUpdateField: (gid: string, field: ConfigField, value: string) => void
}

export function ItemRow({
  item,
  isEven,
  onToggle,
  onEdit,
  onKeywordClick,
  keywordCount,
  onUpdateField,
}: ItemRowProps) {
  const [configField, setConfigField] = useState<ConfigField | null>(null)

  return (
    <>
      <div
        className={`grid gap-2 px-4 py-2 items-center text-xs border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
          isEven ? "bg-white" : "bg-gray-50/30"
        }`}
        style={{ gridTemplateColumns: ITEMS_GRID_COLS }}
      >
        {/* 商品信息 */}
        <div className="col-span-2 min-w-0">
          <button
            // onClick={onEdit}
            className="text-left hover:text-blue-600 hover:underline truncate block w-full text-sm text-gray-800 leading-snug"
            title={item.title || "无标题"}
          >
            {item.title || "无标题"}
          </button>
          <div className="flex items-center gap-1 mt-0.5 text-gray-400 truncate text-xs">
            <span title={item.gid} className="min-w-[85px]">{item.gid}</span>
            <span className="text-gray-300">|</span>
            <span title={item.account.uid} className="truncate">{item.account.name}</span>
          </div>
        </div>

        {/* 价格 */}
        <div className="col-span-1 text-center">
          <span className="text-orange-600 font-semibold">¥{item.price}</span>
        </div>

        {/* 发布时间 */}
        <div className="col-span-1 text-center text-xs text-gray-500">
          {formatPublishTime(item.publishTime)}
        </div>

        {/* 浏览/想要/收藏 */}
        {/* <div className="col-span-1 text-center text-sm leading-tight">
          <div>{item.lookCount} / <span className="text-red-400">{item.wantCount}</span> / {item.collectCount}</div>
          <div className="text-gray-400">
            {item.collectCount > 0 ? (item.wantCount / item.collectCount).toFixed(1) : "-"}
          </div>
        </div> */}

        {/* AI回复开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <IconToggle
            active={item.auto_ai_reply}
            activeClass="text-purple-500 bg-purple-50"
            title={item.auto_ai_reply ? "AI回复：开" : "AI回复：关"}
            onClick={() => onToggle(item, "auto_ai_reply")}
          >
            <Bot className="w-4 h-4" />
          </IconToggle>
        </div>

        {/* 自动发货开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <IconToggle
            active={item.auto_delivery}
            activeClass="text-green-500 bg-green-50"
            title={item.auto_delivery ? "自动发货：开" : "自动发货：关"}
            onClick={() => onToggle(item, "auto_delivery")}
          >
            <Truck className="w-4 h-4" />
          </IconToggle>
        </div>

        {/* 付款后发货 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.deliveryContent}
            onClick={() => setConfigField("deliveryContent")}
          />
        </div>

        {/* 收货后 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.receiptAfter}
            onClick={() => setConfigField("receiptAfter")}
          />
        </div>

        {/* 评价后 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.positiveReviewAfter}
            onClick={() => setConfigField("positiveReviewAfter")}
          />
        </div>

        {/* 关键词回复 */}
        <div className="col-span-1 text-center">
          <button
            onClick={onKeywordClick}
            className={`text-xs hover:underline ${keywordCount > 0 ? "text-orange-600" : "text-gray-400"}`}
            title="关键词回复"
          >
            {keywordCount > 0 ? `${keywordCount}条规则` : "未配置"}
          </button>
        </div>

        {/* AI提示词 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.ai_reply_item_prompt}
            onClick={() => setConfigField("ai_reply_item_prompt")}
          />
        </div>

        {/* 自动上架 */}
        <div className="col-span-1 flex items-center justify-center">
          <IconToggle
            active={item.auto_restock}
            activeClass="text-teal-500 bg-teal-50"
            disabled={item.account.isPro && !item.auto_restock}
            title={
              item.account.isPro && !item.auto_restock
                ? "Pro账号无法开启自动上架"
                : item.auto_restock
                ? "自动上架：开"
                : "自动上架：关"
            }
            onClick={() => {
              if (item.account.isPro && !item.auto_restock) return
              onToggle(item, "auto_restock")
            }}
          >
            <Upload className="w-4 h-4" />
          </IconToggle>
        </div>

        {/* 指令码 */}
        <div className="col-span-1 text-center">
          <SendCodeEditor
            gid={item.gid}
            sendCode={item.sendCode}
            variant="cell"
            onUpdateField={onUpdateField}
          />
        </div>
      </div>

      {/* 配置抽屉 — 取代原 ConfigModal */}
      {configField && (
        <ConfigDrawer
          open={!!configField}
          item={item}
          field={configField}
          onClose={() => setConfigField(null)}
          onSave={(gid, field, value) => {
            onUpdateField(gid, field, value)
            setConfigField(null)
          }}
        />
      )}
    </>
  )
}

// ====== 内部组件：ConfigCell（仅 ItemRow 使用） ======

function ConfigCell({ value, onClick }: { value: string; onClick: () => void }) {
  const hasValue = value && value.trim().length > 0
  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[2.5rem] max-h-[2.5rem] text-xs px-1 flex items-center justify-center text-center hover:underline ${
        hasValue ? "text-blue-600" : "text-gray-400"
      }`}
      title={value || "点击配置"}
    >
      {hasValue ? (
        <span className="text-center">闲鱼消息<br />无需物流发货</span>
      ) : (
        "未配置"
      )}
    </button>
  )
}
