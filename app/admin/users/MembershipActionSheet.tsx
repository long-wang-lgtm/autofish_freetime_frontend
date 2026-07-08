"use client"

import { useState, useEffect } from "react"
import { SlidePanel } from "@/components/ui/slide-panel"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "sonner"
import { adminApi, type AdminUserInfo } from "@/lib/api/admin"
import type { MembershipPlan, StoneSalePricing } from "@/lib/api/admin"
import { fmtPrice } from "@/lib/utils/format"

/* ===== 等级 Badge 映射 ===== */
const TIER_LABELS: Record<number, string> = {
  0: "Free",
  1: "Basic",
  2: "Standard",
  3: "Pro",
}

const TIER_COLORS: Record<number, string> = {
  0: "text-gray-600 bg-gray-100",
  1: "text-blue-600 bg-blue-50",
  2: "text-amber-600 bg-amber-50",
  3: "text-purple-600 bg-purple-50",
}

/* ===== 价格计算 ===== */

/** 升级金额：差价 × 剩余天数 / 本月天数 */
function calcUpgradeAmount(currentPlan: MembershipPlan, targetPlan: MembershipPlan): {
  amount: number
  detail: string
} {
  const priceDiff = targetPlan.price - currentPlan.price
  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysInMonth = endOfMonth.getDate()
  const remainingDays = Math.max(
    Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    1,
  )
  const amount = Math.round(priceDiff * remainingDays / daysInMonth)
  const detail = `${fmtPrice(priceDiff)} × ${remainingDays}天 ÷ ${daysInMonth}天 ≈ ${fmtPrice(amount)}`
  return { amount, detail }
}

/** 续费金额：月数 × 单价 */
function calcRenewAmount(durationMonths: number, unitPrice: number): {
  amount: number
  detail: string
} {
  const amount = durationMonths * unitPrice
  const detail = `${durationMonths} × ${fmtPrice(unitPrice)}/月 = ${fmtPrice(amount)}`
  return { amount, detail }
}

/* ===== 等级卡片（私有组件） ===== */

interface PlanCardProps {
  plan: MembershipPlan
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

function PlanCard({ plan, selected, onClick, disabled }: PlanCardProps) {
  const tier = plan.tier
  const color = TIER_COLORS[tier] ?? "text-gray-600 bg-gray-100"
  const label = TIER_LABELS[tier] ?? `Tier ${tier}`

  let borderCls: string
  let bgCls: string
  if (disabled) {
    borderCls = "border-gray-100"
    bgCls = "bg-gray-50"
  } else if (selected) {
    borderCls = "border-blue-500 ring-1 ring-blue-500"
    bgCls = "bg-blue-50"
  } else {
    borderCls = "border-gray-200 hover:border-blue-300"
    bgCls = "bg-white hover:bg-gray-50"
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full p-3 rounded-lg border text-left transition-colors ${borderCls} ${bgCls} ${disabled ? "cursor-default" : "cursor-pointer"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${color}`}>
            {label}
          </span>
          <span className="text-sm font-semibold text-gray-900">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {fmtPrice(plan.price)}<span className="text-xs text-gray-400 font-normal">/月</span>
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        最多 {plan.max_accounts} 个店铺 &nbsp; 每日 +{plan.daily_bonus} 风铃石
      </div>
    </button>
  )
}

/* ===== 风铃石卡片（私有组件） ===== */

interface StoneCardProps {
  pricing: StoneSalePricing
  selected: boolean
  onClick: () => void
}

function StoneCard({ pricing, selected, onClick }: StoneCardProps) {
  const borderCls = selected
    ? "border-blue-500 ring-1 ring-blue-500"
    : "border-gray-200 hover:border-blue-300"
  const bgCls = selected ? "bg-blue-50" : "bg-white hover:bg-gray-50"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-lg border text-center transition-colors cursor-pointer ${borderCls} ${bgCls}`}
    >
      <div className="text-base font-semibold text-gray-900 tabular-nums">
        {fmtPrice(pricing.amount)}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{pricing.stones} 风铃石</div>
    </button>
  )
}

/* ===== Props ===== */
interface Props {
  open: boolean
  onClose: () => void
  action: "upgrade" | "downgrade" | "renew" | "recharge"
  user: AdminUserInfo
  onSuccess: () => void
}

/* ===== 主组件 ===== */
export function MembershipActionSheet({ open, onClose, action, user, onSuccess }: Props) {
  const currentTier = user.plan?.tier ?? 0

  // ---- 后台数据 ----
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [stonePrices, setStonePrices] = useState<StoneSalePricing[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // ---- 表单 ----
  const [targetTier, setTargetTier] = useState<number>(currentTier)
  const [amountCents, setAmountCents] = useState<number>(0)
  const [durationMonths, setDurationMonths] = useState<number>(1)
  const [stoneAmount, setStoneAmount] = useState<number>(0)
  const [calcDetail, setCalcDetail] = useState<string>("")
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // ---- 加载 plans & prices ----
  useEffect(() => {
    if (open) {
      setDataLoading(true)
      Promise.all([adminApi.getMembershipPlans(), adminApi.getStonePrices()])
        .then(([p, s]) => {
          setPlans(p || [])
          setStonePrices(s || [])
        })
        .catch((e) => toast.error(`加载数据失败: ${e}`))
        .finally(() => setDataLoading(false))
    }
  }, [open])

  // ---- 可选等级 ----
  const upgradablePlans = plans.filter((p) => p.tier > currentTier)
  const downgradablePlans = plans.filter((p) => p.tier < currentTier)
  const currentPlanData = plans.find((p) => p.tier === currentTier)

  // ---- 选择等级（升级/降级） ----
  const selectPlan = (plan: MembershipPlan) => {
    setTargetTier(plan.tier)
    if (action === "upgrade" && currentPlanData) {
      const { amount, detail } = calcUpgradeAmount(currentPlanData, plan)
      setAmountCents(amount)
      setCalcDetail(detail)
    }
  }

  // ---- 重置表单 ----
  useEffect(() => {
    if (open) {
      setDurationMonths(1)
      setStoneAmount(stonePrices[0]?.amount ?? 0)
      setCalcDetail("")
      setRemark("")
      if (action === "upgrade") {
        const first = upgradablePlans[0]
        if (first) selectPlan(first)
        else { setTargetTier(currentTier); setAmountCents(0) }
      } else if (action === "downgrade") {
        const first = downgradablePlans[0]
        if (first) { setTargetTier(first.tier); setAmountCents(0) }
        else { setTargetTier(currentTier); setAmountCents(0) }
      } else if (action === "renew") {
        setTargetTier(currentTier)
        if (currentPlanData) {
          const { amount, detail } = calcRenewAmount(1, currentPlanData.price)
          setAmountCents(amount)
          setCalcDetail(detail)
        }
      }
    }
  }, [open, action, currentTier, plans, stonePrices])

  // ---- 续费月数变化时实时计算 ----
  useEffect(() => {
    if (action === "renew" && currentPlanData) {
      const { amount, detail } = calcRenewAmount(durationMonths, currentPlanData.price)
      setAmountCents(amount)
      setCalcDetail(detail)
    }
  }, [durationMonths])

  // ---- 标题 ----
  const titleMap: Record<string, string> = {
    upgrade: "升级会员",
    downgrade: "降级会员",
    renew: "续费会员",
    recharge: "充值风铃石",
  }
  const title = `${titleMap[action]} - ${user.username || user.userId}`

  // ---- 提交 ----
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (action === "upgrade") {
        await adminApi.upgradeMembership({
          userId: user.userId!,
          tier: targetTier,
          amount_cents: amountCents || undefined,
          remark: remark || undefined,
        })
      } else if (action === "downgrade") {
        await adminApi.downgradeMembership({
          userId: user.userId!,
          tier: targetTier,
          amount_cents: amountCents || undefined,
          remark: remark || undefined,
        })
      } else if (action === "renew") {
        await adminApi.renewMembership({
          userId: user.userId!,
          duration_months: durationMonths,
          tier: currentTier,
          amount_cents: amountCents,
          remark: remark || undefined,
        })
      } else if (action === "recharge") {
        await adminApi.rechargeStones(user.userId!, stoneAmount)
      }

      toast.success(titleMap[action] + "成功")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(`${titleMap[action]}失败: ${err}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ---- 提交按钮可用性 ----
  const canSubmit = (() => {
    if (submitting) return false
    if (action === "upgrade" && targetTier <= currentTier) return false
    if (action === "downgrade" && targetTier >= currentTier) return false
    if (action === "renew" && (durationMonths < 1 || amountCents <= 0)) return false
    if (action === "recharge" && stoneAmount <= 0) return false
    return true
  })()

  // ---- 表单样式常量 ----
  const labelCls = "block text-sm font-medium text-gray-700 mb-1"
  const inputCls =
    "w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"

  return (
    <SlidePanel open={open} onClose={onClose} title={title}>
      {dataLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* ======== 升级 / 降级 / 续费：当前等级展示 ======== */}
          {(action === "upgrade" || action === "downgrade" || action === "renew") && currentPlanData && (
            <div>
              <label className={labelCls}>
                {action === "renew" ? "续费等级" : "当前等级"}
              </label>
              <PlanCard plan={currentPlanData} selected={false} onClick={() => {}} disabled />
            </div>
          )}

          {/* ======== 升级：可选等级卡片列表 ======== */}
          {action === "upgrade" && (
            <div>
              <label className={labelCls}>选择目标等级</label>
              {upgradablePlans.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-lg">
                  已是最高等级
                </div>
              ) : (
                <div className="space-y-2">
                  {upgradablePlans.map((p) => (
                    <PlanCard
                      key={p.tier}
                      plan={p}
                      selected={targetTier === p.tier}
                      onClick={() => selectPlan(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======== 降级：可选等级卡片列表 ======== */}
          {action === "downgrade" && (
            <div>
              <label className={labelCls}>选择目标等级</label>
              {downgradablePlans.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-lg">
                  已是最低等级
                </div>
              ) : (
                <div className="space-y-2">
                  {downgradablePlans.map((p) => (
                    <PlanCard
                      key={p.tier}
                      plan={p}
                      selected={targetTier === p.tier}
                      onClick={() => { setTargetTier(p.tier); setAmountCents(0); setCalcDetail("") }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======== 升级：金额(分) ======== */}
          {action === "upgrade" && (
            <div>
              <label className={labelCls}>金额(分)</label>
              <input
                type="number"
                className={inputCls}
                value={amountCents}
                onChange={(e) => setAmountCents(Number(e.target.value))}
                min={0}
              />
              {calcDetail && (
                <p className="text-xs text-gray-400 mt-1">{calcDetail}</p>
              )}
            </div>
          )}

          {/* ======== 降级：金额(分) ======== */}
          {action === "downgrade" && (
            <div>
              <label className={labelCls}>金额(分)</label>
              <input
                type="number"
                className={inputCls}
                value={amountCents}
                onChange={(e) => setAmountCents(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-gray-400 mt-1">选填，默认 0（免费操作）</p>
            </div>
          )}

          {/* ======== 续费：月数 + 金额(分) ======== */}
          {action === "renew" && (
            <>
              <div>
                <label className={labelCls}>续费月数</label>
                <input
                  type="number"
                  className={inputCls}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value)))}
                  min={1}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>金额(分)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={amountCents}
                  onChange={(e) => setAmountCents(Number(e.target.value))}
                  min={1}
                  required
                />
                {calcDetail && (
                  <p className="text-xs text-gray-400 mt-1">{calcDetail}</p>
                )}
              </div>
            </>
          )}

          {/* ======== 充值：当前余额 + 档位卡片 ======== */}
          {action === "recharge" && (
            <>
              <div>
                <label className={labelCls}>当前风铃石余额</label>
                <span className="text-sm text-gray-700 tabular-nums">
                  {(user.stones ?? 0).toLocaleString("zh-CN")}
                </span>
              </div>
              <div>
                <label className={labelCls}>选择充值档位</label>
                {stonePrices.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-lg">
                    暂无可选定价
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {stonePrices.map((sp) => (
                      <StoneCard
                        key={sp.id}
                        pricing={sp}
                        selected={stoneAmount === sp.amount}
                        onClick={() => setStoneAmount(sp.amount)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======== 备注（非充值操作） ======== */}
          {action !== "recharge" && (
            <div>
              <label className={labelCls}>备注</label>
              <input
                type="text"
                className={inputCls}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="选填"
              />
            </div>
          )}

          {/* ---- 提交 ---- */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-10 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <LoadingSpinner size="sm" />}
            {submitting ? "操作中..." : titleMap[action]}
          </button>
        </div>
      )}
    </SlidePanel>
  )
}
