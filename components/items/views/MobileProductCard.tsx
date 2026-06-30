"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"
import { Bot, Truck, Upload, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { ConfigField, formatPublishTime, statusLabel } from "../config"
import { IconToggle } from "../parts/IconToggle"
import { SendCodeEditor } from "../parts/SendCodeEditor"

interface ConfigEntry {
  key: string
  label: string
  icon: string
  hasValue: boolean
}

interface MobileProductCardProps {
  item: Item
  keywordCount: number
  onToggle: (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => void
  onEdit: () => void
  onKeywordClick: () => void
  onConfigClick: (field: ConfigField) => void
  onSendCodeChange: (gid: string, value: string) => void
}

export function MobileProductCard({
  item,
  keywordCount,
  onToggle,
  onEdit,
  onKeywordClick,
  onConfigClick,
  onSendCodeChange,
}: MobileProductCardProps) {
  const status = statusLabel(item.status)
  const [expanded, setExpanded] = useState(false)

  // 构建配置入口列表（有序）
  const allConfigs: ConfigEntry[] = [
    { key: "deliveryContent", label: "付款后发货", icon: "📝", hasValue: (item.deliveryContent || "").trim().length > 0 },
    { key: "receiptAfter", label: "收货后赠送", icon: "🎁", hasValue: (item.receiptAfter || "").trim().length > 0 },
    { key: "positiveReviewAfter", label: "评价后赠送", icon: "⭐", hasValue: (item.positiveReviewAfter || "").trim().length > 0 },
    { key: "ai_reply_item_prompt", label: "AI提示词", icon: "💬", hasValue: (item.ai_reply_item_prompt || "").trim().length > 0 },
    { key: "keyword", label: "关键词回复", icon: "🔑", hasValue: keywordCount > 0 },
    { key: "sendCode", label: "指令码", icon: "⌨️", hasValue: !!(item.sendCode && item.sendCode.trim().length > 0) },
  ]

  const configuredConfigs = allConfigs.filter((c) => c.hasValue)
  const unconfiguredConfigs = allConfigs.filter((c) => !c.hasValue)
  const hasUnconfigured = unconfiguredConfigs.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
      {/* === 标题行 + 快捷开关 === */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2 gap-2">
        <button
          onClick={onEdit}
          className="text-left text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors flex-1 min-w-0"
        >
          {item.title || "无标题"}
        </button>

        {/* 纯图标开关（无文字） */}
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
            active={item.auto_delivery}
            activeClass="text-green-500 bg-green-50"
            title={item.auto_delivery ? "自动发货：开" : "自动发货：关"}
            onClick={() => onToggle(item, "auto_delivery")}
          >
            <Truck className="w-4 h-4" />
          </IconToggle>

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
      </div>

      {/* === 信息栏（账号 → GID → 状态 → 价格 → 时间） === */}
      <div className="px-4 pb-2 flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
        <span className="truncate max-w-[80px]">{item.account.name}</span>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-gray-500 break-all">{item.gid}</span>
        <span className="text-gray-300">|</span>
        <span className={`px-1.5 py-px rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
          {status.text}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-orange-600 font-semibold flex-shrink-0">¥{item.price}</span>
        <span className="text-gray-300">|</span>
        <span className="flex-shrink-0">{formatPublishTime(item.publishTime)}</span>
      </div>

      {/* 分割线 */}
      <div className="border-t border-gray-100" />

      {/* === 已配置项（始终显示） === */}
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
              sendCode={item.sendCode}
              variant="row"
              hasValue={cfg.hasValue}
              onUpdateField={(gid, _field, value) => onSendCodeChange(gid, value)}
            />
          ) : (
            <ConfigRow
              key={cfg.key}
              label={cfg.label}
              icon={cfg.icon}
              hasValue={cfg.hasValue}
              value={item[cfg.key as keyof Item] as string}
              onClick={() => onConfigClick(cfg.key as ConfigField)}
            />
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
                    sendCode={item.sendCode}
                    variant="row"
                    hasValue={cfg.hasValue}
                    onUpdateField={(gid, _field, value) => onSendCodeChange(gid, value)}
                  />
                ) : (
                  <ConfigRow
                    key={cfg.key}
                    label={cfg.label}
                    icon={cfg.icon}
                    hasValue={cfg.hasValue}
                    value={item[cfg.key as keyof Item] as string}
                    onClick={() => onConfigClick(cfg.key as ConfigField)}
                  />
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** 可点击的配置行 */
function ConfigRow({
  label,
  icon,
  hasValue,
  value,
  onClick,
}: {
  label: string
  icon: string
  hasValue: boolean
  value: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
    >
      <span className={hasValue ? "text-gray-600" : "text-gray-400"}>
        {icon} {label}
      </span>
      <span className="flex items-center gap-1">
        <span
          className={`text-xs max-w-[100px] truncate ${
            hasValue ? "text-blue-600" : "text-gray-400"
          }`}
        >
          {hasValue ? value : "未配置"}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </span>
    </button>
  )
}
