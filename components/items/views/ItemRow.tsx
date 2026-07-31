"use client"

import { useState } from "react"
import type { ShopItem } from "@/lib/api/items"
import { Bot, Truck, Upload } from "lucide-react"
import type { ShipStage } from "../config"
import { formatPublishTime, hasShipConfig } from "../config"
import { IconToggle } from "../parts/IconToggle"
import { ConfigStatusCell } from "../parts/ConfigStatusCell"

/** Items 表格列宽定义 — 13 列 grid-template-columns */
export const ITEMS_GRID_COLS = '2fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'

interface ItemRowProps {
  item: ShopItem
  isEven: boolean
  onToggle: (item: ShopItem, field: "auto_reply" | "auto_ship" | "auto_ai_reply" | "auto_restock") => void
  onEdit: () => void
  onKeywordClick: () => void
  keywordCount: number
  onConfigClick: (stage: ShipStage) => void
  onUpdateField: (gid: number, field: string, value: string) => void
  shipPending: boolean
  onShelve: (item: ShopItem) => void
  onOffline: (item: ShopItem) => void
}

export function ItemRow({
  item,
  isEven,
  onToggle,
  onEdit,
  onKeywordClick,
  keywordCount,
  onConfigClick,
  onUpdateField,
  shipPending,
  onShelve,
  onOffline,
}: ItemRowProps) {

  return (
    <div
      className={`grid gap-2 px-4 py-2 items-center text-xs border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
        isEven ? "bg-white" : "bg-gray-50/30"
      }`}
      style={{ gridTemplateColumns: ITEMS_GRID_COLS }}
    >
      {/* 商品信息 */}
      <div className="col-span-2 min-w-0">
        <button
          onClick={onEdit}
          className="text-left hover:text-blue-600 hover:underline truncate block w-full text-sm text-gray-800 leading-snug"
          title={item.title || "无标题"}
        >
          {item.title || "无标题"}
        </button>
        <div className="flex items-center gap-1 mt-0.5 text-gray-400 truncate text-xs">
          <span title={String(item.gid)} className="min-w-[85px]">{item.gid}</span>
          <span className="text-gray-300">|</span>
          <span title={item.account.uid} className="truncate">{item.account.name}</span>
        </div>
      </div>

      {/* 价格 */}
      <div className="col-span-1 text-center">
        <span className="text-orange-600 font-semibold">{item.reservePrice || '-'}</span>
      </div>

      {/* 发布时间 */}
      <div className="col-span-1 text-center text-xs text-gray-500">
        {formatPublishTime(item.publishTime)}
      </div>

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
          active={item.auto_ship}
          activeClass="text-green-500 bg-green-50"
          title={item.auto_ship ? "自动发货：开" : "自动发货：关"}
          onClick={() => onToggle(item, "auto_ship")}
        >
          <Truck className="w-4 h-4" />
        </IconToggle>
      </div>

      {/* 付款后发货 */}
      <div className="col-span-1 text-center">
        <ConfigStatusCell
          hasConfig={item.config ? hasShipConfig(item.config.shipment) : false}
          onClick={() => onConfigClick('shipment')}
        />
      </div>

      {/* 收货后赠送 */}
      <div className="col-span-1 text-center">
        <ConfigStatusCell
          hasConfig={item.config ? hasShipConfig(item.config.shipconfirm) : false}
          onClick={() => onConfigClick('shipconfirm')}
        />
      </div>

      {/* 评价后赠送 */}
      <div className="col-span-1 text-center">
        <ConfigStatusCell
          hasConfig={item.config ? hasShipConfig(item.config.evaluation) : false}
          onClick={() => onConfigClick('evaluation')}
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
        <button
          onClick={() => onConfigClick('shipment')}
          className={`text-xs ${(item.config?.ai_prompt || '').trim().length > 0 ? 'text-blue-600' : 'text-gray-400'} hover:underline`}
        >
          {(item.config?.ai_prompt || '').trim().length > 0 ? '已配置' : '未配置'}
        </button>
      </div>

      {/* 自动上架 */}
      <div className="col-span-1 flex items-center justify-center">
        <IconToggle
          active={item.auto_restock}
          activeClass="text-teal-500 bg-teal-50"
          disabled={item.account.isPro}
          title={
            item.account.isPro
              ? "Pro账号无法开启自动上架"
              : item.auto_restock
              ? "自动上架：开"
              : "自动上架：关"
          }
          onClick={() => {
            if (item.account.isPro) return
            onToggle(item, "auto_restock")
          }}
        >
          <Upload className="w-4 h-4" />
        </IconToggle>
      </div>

      {/* 指令码 */}
      <div className="col-span-1 text-center">
        <button
          onClick={() => onUpdateField(item.gid, 'sendCode', item.config?.sendCode || '')}
          className={`w-full text-xs text-center hover:underline ${
            (item.config?.sendCode || '').trim().length > 0 ? "text-gray-700" : "text-gray-400"
          }`}
          title="此配置仅作为买家时生效"
        >
          {(item.config?.sendCode || '').trim().length > 0 ? item.config?.sendCode?.trim() : "-"}
        </button>
      </div>
    </div>
  )
}
