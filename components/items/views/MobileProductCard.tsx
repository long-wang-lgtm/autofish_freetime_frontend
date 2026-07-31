"use client"

import { useState } from "react"
import type { ShopItem } from "@/lib/api/items"
import { Bot, Truck, Upload, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import type { ShipStage, ConfigField } from "../config"
import { formatPublishTime, statusLabel, hasShipConfig } from "../config"
import { IconToggle } from "../parts/IconToggle"
import { SendCodeEditor } from "../parts/SendCodeEditor"
import { ShelfActions } from "../parts/ShelfActions"

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
  shelfPending: boolean
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
  shelfPending,
}: MobileProductCardProps) {
  const status = statusLabel(item.status)
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
          <IconToggle
            active={item.auto_ai_reply}
            activeClass="text-purple-500 bg-purple-50"
            title={item.auto_ai_reply ? "AI回复：开" : "AI回复：关"}
            onClick={() => onToggle(item, "auto_ai_reply")}
          >
            <Bot className="w-4 h-4" />
          </IconToggle>

          <IconToggle
            active={item.auto_ship}
            activeClass="text-green-500 bg-green-50"
            title={item.auto_ship ? "自动发货：开" : "自动发货：关"}
            onClick={() => onToggle(item, "auto_ship")}
          >
            <Truck className="w-4 h-4" />
          </IconToggle>

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
        <span className="flex-shrink-0">{formatPublishTime(item.publishTime)}</span>
        <ShelfActions
          item={item}
          variant="mobile"
          pending={shelfPending}
          onShelve={onShelve}
          onOffline={onOffline}
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
