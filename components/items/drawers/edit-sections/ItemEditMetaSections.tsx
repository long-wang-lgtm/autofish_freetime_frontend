"use client"

import { Switch } from "@/components/ui/feedback/Switch"
import { RadioGroup } from "@/components/ui/feedback/RadioGroup"
import { ErrorBanner } from "@/components/ui/feedback/ErrorBanner"
import { Select } from "@/components/ui/data/Select"
import { SectionTitle, Hint } from "./Section"
import { LABEL, SERVICE_LABELS, type ItemEditSectionProps } from "../item-edit-types"

/**
 * 商品类目 —— 下拉选择。
 *
 * 类目选项接口尚未提供，因此唯一选项是当前值、且置灰不可选；选项到位后只需
 * 填 options、去掉 disabled，回写逻辑无需改动。
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
export function CategorySection({ draft, mutators }: ItemEditSectionProps) {
  const current = draft.itemCatDTO.channelCatId
  const name = draft.itemCatDTO.catName

  return (
    <section className="space-y-3">
      <SectionTitle>商品类目</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="edit-channel-cate">
            类目
          </label>
          <Select
            id="edit-channel-cate"
            value={String(current)}
            onChange={(v) => {
              // 选项到位后，从选项中取名称；当前只有一个选项，回写自身不会改变内容
              const picked = [{ value: String(current), label: name }].find((o) => o.value === v)
              if (picked) mutators.setChannelCate(v, picked.label)
            }}
            options={[{ value: String(current), label: name }]}
            disabled
          />
          {/* <Hint>类目选项接口待接入；改动会同步「商品分类」的渠道类目与名称。</Hint> */}
        </div>
      </div>
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
