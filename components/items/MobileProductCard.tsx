"use client"

import { useState, useRef, useEffect } from "react"
import { Item } from "@/lib/api/items"
import { Bot, Truck, Upload, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"

type ConfigField = "deliveryContent" | "receiptAfter" | "positiveReviewAfter" | "ai_reply_item_prompt"

function formatPublishTime(timestamp: string | null): string {
  if (!timestamp) return "-"
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusLabel(status: number): { text: string; color: string } {
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
      <div className="px-4 pb-2.5 flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
        <span className="truncate max-w-[80px]">{item.account.name}</span>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-gray-500 break-all">{item.gid}</span>
        <span className="text-gray-300">|</span>
        <span className={`px-1.5 py-px rounded-full text-[10px] font-medium flex-shrink-0 ${status.color}`}>
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
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
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
            <SendCodeRow
              key={cfg.key}
              gid={item.gid}
              sendCode={item.sendCode}
              hasValue={cfg.hasValue}
              onChange={onSendCodeChange}
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
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400">{cfg.icon} {cfg.label}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">未配置</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </span>
                  </button>
                ) : cfg.key === "sendCode" ? (
                  <SendCodeRow
                    key={cfg.key}
                    gid={item.gid}
                    sendCode={item.sendCode}
                    hasValue={cfg.hasValue}
                    onChange={onSendCodeChange}
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

/** 纯图标切换按钮 */
function IconToggle({
  active,
  activeClass,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean
  activeClass: string
  disabled?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
        disabled
          ? "text-gray-300 bg-gray-50 cursor-not-allowed"
          : active
          ? activeClass
          : "text-gray-400 bg-gray-50"
      }`}
    >
      {children}
    </button>
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
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
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

/** 指令码行 — 点击原地编辑 */
function SendCodeRow({
  gid,
  sendCode,
  hasValue,
  onChange,
}: {
  gid: string
  sendCode: string | null
  hasValue: boolean
  onChange: (gid: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed !== (sendCode || "")) {
      onChange(gid, trimmed)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-gray-600">⌨️ 指令码</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") setEditing(false)
          }}
          className="w-16 text-center text-xs px-1.5 py-1 border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setEditValue(sendCode || "")
        setEditing(true)
      }}
      title="指令码 — 仅买家时生效"
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
    >
      <span className={hasValue ? "text-gray-600" : "text-gray-400"}>⌨️ 指令码</span>
      <span className="flex items-center gap-1">
        <span className={`text-xs max-w-[100px] truncate ${hasValue ? "text-gray-700 font-mono" : "text-gray-400"}`}>
          {hasValue ? (sendCode || "").trim() : "未配置"}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </span>
    </button>
  )
}
