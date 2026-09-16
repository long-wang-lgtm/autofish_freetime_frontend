"use client"

import { useState } from "react"
import type { ShopItem } from "@/lib/api/items"
import { ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import type { ShipStage, ConfigField } from "../config"
import {
  formatPublishTime, statusLabel, hasShipConfig, displayQuantity, fansPrices, canSetFansPrice,
} from "../config"
import { AutomationToggles } from "../parts/AutomationToggles"
import { SendCodeEditor } from "../parts/SendCodeEditor"
import { ShelfActions } from "../parts/ShelfActions"
import { DeleteItemButton } from "../parts/DeleteItemButton"
import { RepublishButton } from "../parts/RepublishButton"
import { ItemActionButtons } from "../parts/ItemActionButtons"
import type { RepriceSubmit } from "../parts/RepricingDialog"
import type { FansPriceSubmit } from "../parts/FansPriceDialog"

interface ConfigEntry {
  key: string
  label: string
  icon: string
  hasValue: boolean
}

interface MobileProductCardProps {
  item: ShopItem
  keywordCount: number
  onToggle: (item: ShopItem, field: "auto_reply" | "auto_ship" | "auto_ai_reply" | "auto_restock") => void
  onEdit: () => void
  onKeywordClick: () => void
  onConfigClick: (stage: ShipStage) => void
  onSendCodeChange: (gid: number, value: string) => void
  onShelve: (item: ShopItem) => void
  onOffline: (item: ShopItem) => void
  onDelete: (item: ShopItem) => void
  onRepublish: (item: ShopItem) => void
  onReprice: (item: ShopItem, submit: RepriceSubmit) => Promise<void>
  onSetFansPrice: (item: ShopItem, submit: FansPriceSubmit) => Promise<void>
  shelfPending: boolean
  deletePending: boolean
}

export function MobileProductCard({
  item,
  keywordCount,
  onToggle,
  onEdit,
  onKeywordClick,
  onConfigClick,
  onSendCodeChange,
  onShelve,
  onOffline,
  onDelete,
  onRepublish,
  onReprice,
  onSetFansPrice,
  shelfPending,
  deletePending,
}: MobileProductCardProps) {
  const status = statusLabel(item.status)
  const quantity = displayQuantity(item)
  const [expanded, setExpanded] = useState(false)

  const allConfigs: ConfigEntry[] = [
    {
      key: "shipment", label: "付款后发货", icon: "📝",
      hasValue: item.config ? hasShipConfig(item.config.shipment) : false
    },
    {
      key: "shipconfirm", label: "收货后赠送", icon: "🎁",
      hasValue: item.config ? hasShipConfig(item.config.shipconfirm) : false
    },
    {
      key: "evaluation", label: "评价后赠送", icon: "⭐",
      hasValue: item.config ? hasShipConfig(item.config.evaluation) : false
    },
    {
      key: "aiReplyItemPrompt", label: "AI提示词", icon: "💬",
      hasValue: (item.config?.ai_prompt || "").trim().length > 0
    },
    {
      key: "keyword", label: "关键词回复", icon: "🔑",
      hasValue: keywordCount > 0
    },
    {
      key: "sendCode", label: "指令码", icon: "⌨️",
      hasValue: !!(item.config?.sendCode && item.config.sendCode.trim().length > 0)
    },
  ]

  const configuredConfigs = allConfigs.filter((c) => c.hasValue)
  const unconfiguredConfigs = allConfigs.filter((c) => !c.hasValue)
  const hasUnconfigured = unconfiguredConfigs.length > 0

  const shipStages: ShipStage[] = ['shipment', 'shipconfirm', 'evaluation']

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
      {/* === 标题行 + 快捷开关 === */}
      <div className="flex items-start justify-between px-4 pt-3 pb-3 gap-2">
        <button
          onClick={onEdit}
          className="text-left text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors flex-1 min-w-0"
        >
          {item.title || "无标题"}
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <AutomationToggles item={item} onToggle={onToggle} />
        </div>
      </div>

      {/* === 信息栏 === */}
      <div className="px-4 pb-3 flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
        <span className="truncate max-w-[80px]">{item.account.name}</span>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-gray-500 break-all">{item.gid}</span>
        <span className="text-gray-300">|</span>
        <span className={`px-1.5 py-px rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
          {status.text}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-orange-600 font-semibold flex-shrink-0">{item.reservePrice || '-'}</span>
        <span className="text-gray-300">|</span>
        <span className="flex-shrink-0 text-gray-800 tabular-nums">{quantity === null ? '-' : quantity}</span>
        <span className="text-gray-300">|</span>
        {/* 粉丝价三档（全部/老粉/已购）：桌面上横排数字，移动端三档拼成一个 token。
            内层用 / 而非 | —— 信息栏本身用 | 分隔字段，内层再用 | 会分不清哪根是字段分隔符。
            非 Pro / 多规格商品不支持设置粉丝价，连同后面那根分隔符一起不渲染，
            否则字段之间会多出一根悬空的 | */}
        {canSetFansPrice(item) && (
          <>
            <span className="flex-shrink-0 tabular-nums">
              {fansPrices(item).map((price) => (price === null ? '-' : price)).join('/')}
            </span>
            <span className="text-gray-300">|</span>
          </>
        )}
        <span className="flex-shrink-0">{formatPublishTime(item.publishTime)}</span>
        <ShelfActions
          item={item}
          variant="mobile"
          pending={shelfPending}
          onShelve={onShelve}
          onOffline={onOffline}
        />
        <DeleteItemButton
          item={item}
          variant="mobile"
          pending={deletePending}
          onDelete={onDelete}
        />
        <RepublishButton
          item={item}
          variant="mobile"
          onRepublish={onRepublish}
        />
        <ItemActionButtons
          item={item}
          onEdit={onEdit}
          onReprice={onReprice}
          onSetFansPrice={onSetFansPrice}
        />
      </div>

      <div className="border-t border-gray-100" />

      {/* === 已配置项 === */}
      <div className="divide-y divide-gray-50">
        {configuredConfigs.map((cfg) =>
          cfg.key === "keyword" ? (
            <button
              key={cfg.key}
              onClick={onKeywordClick}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-600">{cfg.icon} {cfg.label}</span>
              <span className="flex items-center gap-1">
                <span className="text-orange-600 font-medium text-xs">
                  {keywordCount > 0 ? `${keywordCount}条规则` : "未配置"}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </span>
            </button>
          ) : cfg.key === "sendCode" ? (
            <SendCodeEditor
              key={cfg.key}
              gid={item.gid}
              sendCode={item.config?.sendCode ?? null}
              variant="row"
              hasValue={cfg.hasValue}
              onUpdateField={(gid, _field, value) => onSendCodeChange(gid, value)}
            />
          ) : shipStages.includes(cfg.key as ShipStage) ? (
            <button
              key={cfg.key}
              onClick={() => onConfigClick(cfg.key as ShipStage)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className={cfg.hasValue ? "text-gray-600" : "text-gray-400"}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="flex items-center gap-1">
                <span className={`text-xs max-w-[100px] truncate ${cfg.hasValue ? "text-blue-600" : "text-gray-400"}`}>
                  {cfg.hasValue ? "已配置" : "未配置"}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </span>
            </button>
          ) : (
            <button
              key={cfg.key}
              onClick={() => onConfigClick('shipment')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className={cfg.hasValue ? "text-gray-600" : "text-gray-400"}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="flex items-center gap-1">
                <span className={`text-xs max-w-[100px] truncate ${cfg.hasValue ? "text-blue-600" : "text-gray-400"}`}>
                  {cfg.hasValue ? "已配置" : "未配置"}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </span>
            </button>
          )
        )}
      </div>

      {/* === 展开/折叠未配置项 === */}
      {hasUnconfigured && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            {expanded ? (
              <>
                收起未配置项
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                展开全部配置（{unconfiguredConfigs.length}项未配置）
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {expanded && (
            <div className="divide-y divide-gray-50 border-t border-gray-50">
              {unconfiguredConfigs.map((cfg) =>
                cfg.key === "keyword" ? (
                  <button
                    key={cfg.key}
                    onClick={onKeywordClick}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400">{cfg.icon} {cfg.label}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">未配置</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </span>
                  </button>
                ) : cfg.key === "sendCode" ? (
                  <SendCodeEditor
                    key={cfg.key}
                    gid={item.gid}
                    sendCode={item.config?.sendCode ?? null}
                    variant="row"
                    hasValue={cfg.hasValue}
                    onUpdateField={(gid, _field, value) => onSendCodeChange(gid, value)}
                  />
                ) : shipStages.includes(cfg.key as ShipStage) ? (
                  <button
                    key={cfg.key}
                    onClick={() => onConfigClick(cfg.key as ShipStage)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400">{cfg.icon} {cfg.label}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">未配置</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </span>
                  </button>
                ) : (
                  <button
                    key={cfg.key}
                    onClick={() => onConfigClick('shipment')}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400">{cfg.icon} {cfg.label}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">未配置</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
