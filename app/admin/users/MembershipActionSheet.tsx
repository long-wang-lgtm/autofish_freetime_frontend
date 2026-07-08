"use client"

import { useState, useEffect } from "react"
import { SlidePanel } from "@/components/ui/slide-panel"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "sonner"
import { adminApi, type AdminUserInfo } from "@/lib/api/admin"
import type { MembershipPlan, StoneSalePricing } from "@/lib/api/admin"

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

/* ===== Props ===== */
interface Props {
  open: boolean
  onClose: () => void
  action: "upgrade" | "downgrade" | "renew" | "recharge"
  user: AdminUserInfo
  onSuccess: () => void
}

/* ===== 组件 ===== */
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

  // ---- 重置表单 ----
  useEffect(() => {
    if (open) {
      setAmountCents(0)
      setDurationMonths(1)
      setStoneAmount(stonePrices[0]?.amount ?? 0)
      setRemark("")
      // 升级/降级：默认选第一个可选等级
      if (action === "upgrade") {
        const first = plans.filter((p) => p.tier > currentTier)[0]
        setTargetTier(first?.tier ?? currentTier)
      } else if (action === "downgrade") {
        const first = plans.filter((p) => p.tier < currentTier)[0]
        setTargetTier(first?.tier ?? currentTier)
      } else {
        setTargetTier(currentTier)
      }
    }
  }, [open, action, currentTier, plans, stonePrices])

  // ---- 标题 ----
  const titleMap: Record<string, string> = {
    upgrade: "升级会员",
    downgrade: "降级会员",
    renew: "续费会员",
    recharge: "充值风铃石",
  }
  const title = `${titleMap[action]} - ${user.username || user.userId}`

  // ---- 可选等级 ----
  const upgradablePlans = plans.filter((p) => p.tier > currentTier)
  const downgradablePlans = plans.filter((p) => p.tier < currentTier)

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
  const badgeCls = (tier: number) =>
    `inline-block px-1.5 py-0.5 text-xs font-medium rounded-full ${TIER_COLORS[tier] ?? "text-gray-600 bg-gray-100"}`

  return (
    <SlidePanel open={open} onClose={onClose} title={title}>
      {dataLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {/* ---- 当前等级（所有操作共用） ---- */}
          {action !== "recharge" && (
            <div>
              <label className={labelCls}>当前等级</label>
              <span className={badgeCls(currentTier)}>
                {TIER_LABELS[currentTier] ?? `Tier ${currentTier}`}
              </span>
            </div>
          )}

          {/* ---- 升级：目标等级 ---- */}
          {action === "upgrade" && (
            <div>
              <label className={labelCls}>目标等级</label>
              <select
                className={inputCls}
                value={targetTier}
                onChange={(e) => setTargetTier(Number(e.target.value))}
                disabled={upgradablePlans.length === 0}
              >
                {upgradablePlans.length === 0 && (
                  <option value={currentTier}>无可升级等级</option>
                )}
                {upgradablePlans.map((p) => (
                  <option key={p.tier} value={p.tier}>
                    {TIER_LABELS[p.tier] ?? `Tier ${p.tier}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ---- 降级：目标等级 ---- */}
          {action === "downgrade" && (
            <div>
              <label className={labelCls}>目标等级</label>
              <select
                className={inputCls}
                value={targetTier}
                onChange={(e) => setTargetTier(Number(e.target.value))}
                disabled={downgradablePlans.length === 0}
              >
                {downgradablePlans.length === 0 && (
                  <option value={currentTier}>无可降级等级</option>
                )}
                {downgradablePlans.map((p) => (
                  <option key={p.tier} value={p.tier}>
                    {TIER_LABELS[p.tier] ?? `Tier ${p.tier}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ---- 升级/降级：金额(分) ---- */}
          {(action === "upgrade" || action === "downgrade") && (
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

          {/* ---- 续费：月数 ---- */}
          {action === "renew" && (
            <>
              <div>
                <label className={labelCls}>续费月数</label>
                <input
                  type="number"
                  className={inputCls}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>金额(分) *</label>
                <input
                  type="number"
                  className={inputCls}
                  value={amountCents}
                  onChange={(e) => setAmountCents(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
            </>
          )}

          {/* ---- 充值：当前风铃石 + 档位 ---- */}
          {action === "recharge" && (
            <>
              <div>
                <label className={labelCls}>当前风铃石余额</label>
                <span className="text-sm text-gray-700 tabular-nums">
                  {(user.stones ?? 0).toLocaleString("zh-CN")}
                </span>
              </div>
              <div>
                <label className={labelCls}>充值档位</label>
                <select
                  className={inputCls}
                  value={stoneAmount}
                  onChange={(e) => setStoneAmount(Number(e.target.value))}
                  disabled={stonePrices.length === 0}
                >
                  {stonePrices.length === 0 && (
                    <option value={0}>暂无可选定价</option>
                  )}
                  {stonePrices.map((sp) => (
                    <option key={sp.id} value={sp.amount}>
                      {(sp.amount / 100).toFixed(2)} 元 = {sp.stones} 风铃石
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ---- 备注（非充值操作） ---- */}
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
