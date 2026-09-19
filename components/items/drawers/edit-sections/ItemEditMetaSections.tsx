"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Switch } from "@/components/ui/feedback/Switch"
import { RadioGroup } from "@/components/ui/feedback/RadioGroup"
import { ErrorBanner } from "@/components/ui/feedback/ErrorBanner"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
import { Select } from "@/components/ui/data/Select"
import { getItemEditChannels } from "@/lib/api/items"
import { SectionTitle, Hint } from "./Section"
import { LABEL, SERVICE_LABELS, type ItemEditSectionProps } from "../item-edit-types"

/** 下拉项 —— id 是回写用的原值，value 是给 DOM 的字符串，两者不能混 */
interface CategoryOption {
  id: number | string
  value: string
  label: string
}

interface CategorySectionProps extends ItemEditSectionProps {
  /** 商品 ID 与所属账号 —— 类目候选由该账号的闲鱼接口按商品描述给出 */
  gid: number
  accountUid: string
}

/**
 * 商品类目 —— 下拉选择，候选项来自后端。
 *
 * 接口按商品描述推荐类目，所以先拿「打开弹窗时那份描述」问一次，把候选铺进下拉。
 * 描述是挂载时定格的：若把实时 desc 写进 queryKey，用户在描述框里每敲一个字都会
 * 变成一次闲鱼请求（后端每次还会 upsert 一批类目记录），而编辑描述期间看到旧候选
 * 并无损失 —— 保存后重开弹窗，候选自然按新描述重取。
 *
 * 商品分类不单独渲染：它与类目共用 channelCatId / channelCateName 这对字段
 * （分类侧叫 channelCatId，类目侧叫 channelCateId），改类目时一并回写，
 * 见 useItemEditMutators 的 setChannelCate。两者的差异只有 catId（闲鱼内部
 * 类目 ID），本次不暴露。
 *
 * 类目属性（itemLabelExtList）不渲染：它是发布器读的元数据，字段间的对应关系
 * （properties 发布串 / text / 类目 ID）由发布器按类目定义解读，前端既无法校验
 * 也无需人工确认，摆五个只读字段只会淹没真正能改的东西。
 */
export function CategorySection({ draft, mutators, gid, accountUid }: CategorySectionProps) {
  const current = draft.itemCatDTO.channelCatId
  const name = draft.itemCatDTO.catName

  const [desc] = useState(() => draft.itemTextDTO.desc.trim())

  const {
    data: channels = [],
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["itemEditChannels", accountUid, gid, desc],
    queryFn: () => getItemEditChannels(gid, accountUid, desc),
    // 没有描述就没有推荐依据，问了也是白问
    enabled: desc.length > 0,
    // 同一商品的候选短时间内不会变，来回开关弹窗不必重复问闲鱼
    staleTime: 5 * 60 * 1000,
  })

  /**
   * 当前类目始终兜在列表里：接口给的是推荐结果，未必包含它，缺了它原生 select
   * 找不到匹配项会显示成空白，看上去像「类目丢了」。
   *
   * 后端还会把该账号常用的类目追在推荐结果后面，与推荐项可能重复，按 ID 去重。
   * 回写用 id（原类型）而非 value —— value 是字符串，拿它回写会把数字 ID 变成
   * 同值的字符串，草稿就平白变成「有未保存改动」。
   */
  const options = useMemo(() => {
    const seen = new Set<string>()
    const opts: CategoryOption[] = []

    for (const c of channels) {
      const value = String(c.channelCateId)
      if (seen.has(value)) continue
      seen.add(value)
      opts.push({ id: c.channelCateId, value, label: c.channelCateName ?? value })
    }

    if (!seen.has(String(current))) {
      opts.unshift({ id: current, value: String(current), label: name })
    }

    return opts
  }, [channels, current, name])

  return (
    <section className="space-y-3">
      <SectionTitle>商品类目</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div>
          <Select
            id="edit-channel-cate"
            value={String(current)}
            onChange={(v) => {
              const picked = options.find((o) => o.value === v)
              if (picked) mutators.setChannelCate(picked.id, picked.label)
            }}
            options={options.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
      </div>

      {/* 拉取失败不挡住编辑：下拉里还有当前类目，保存不受影响 */}
      {isError && (
        <ErrorBanner
          variant="inline"
          message={`获取类目候选失败：${error instanceof Error ? error.message : String(error)}`}
          onRetry={() => refetch()}
        />
      )}

      {isFetching && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <LoadingSpinner size="sm" />
          正在按商品描述获取类目候选…
        </div>
      )}
    </section>
  )
}

/**
 * 运费 —— 只渲染「包邮」这一个选项，且是单选。
 *
 * 包邮对本类商品是必选、不可取消的，所以这是一组只有一个选项的单选：
 * 点它不会有任何变化（原生单选组里点已选中项本就不响应），正是「必选」的语义。
 * 不用 Switch：开关的形状表达的是「开/关」，而这里表达的是「在若干运费方式里
 * 选了包邮」，是互斥选择，圆点才是对的语言。
 *
 * supportFreight / postPriceInCent / templateId / idleTemplateId / onlyTakeSelf
 * 全部按当前值原样下发，不显示也不修改 —— 它们不参与本次编辑范围。
 */
export function PostFeeSection({ draft }: ItemEditSectionProps) {
  // 选项写死为「包邮」，因为可选的运费方式目前只有这一种。字段本身不动，
  // 原值原样进请求体 —— 控件表达的是约束，不是对数据的改写。
  const options = [{ value: "free", label: "包邮" }]

  return (
    <section className="space-y-3">
      <SectionTitle>发货设置</SectionTitle>
      <RadioGroup name="edit-post-fee" value="free" onChange={() => {}} options={options} />
      {/* 写死选项的前提是该字段恒为 true。不成立时宁可让用户看见冲突，
          也不要渲染一个与数据相反的选中态 */}
      {!draft.itemPostFeeDTO.canFreeShipping && (
        <ErrorBanner
          variant="inline"
          message="当前商品数据为非包邮，与「只渲染包邮」的约定不符，保存前请确认。"
        />
      )}
      {/* <Hint>包邮为必选项，不可取消。运费金额与模板按当前值原样保留，暂未开放编辑。</Hint> */}
    </section>
  )
}

/**
 * 服务标签 —— 多选，横向排列。
 *
 * 每个标签是独立的布尔（勾/不勾各自生效），所以用 Switch 而非单选组。
 * serviceCode 是稳定标识，展示名走字典，未收录的码回落显示原码，不隐藏也不猜。
 */
export function ProtocolSection({ draft, mutators }: ItemEditSectionProps) {
  return (
    <section className="space-y-3">
      <SectionTitle>服务</SectionTitle>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {draft.userRightsProtocols.map((p, i) => (
          <Switch
            key={p.serviceCode}
            checked={p.enable}
            onChange={(v) => mutators.patchProtocol(i, v)}
            label={SERVICE_LABELS[p.serviceCode] ?? p.serviceCode}
          />
        ))}
      </div>
    </section>
  )
}
