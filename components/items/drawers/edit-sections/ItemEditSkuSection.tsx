"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import type { ItemEditMaterial, ItemEditSku } from "@/lib/api/items"
import { SectionTitle } from "./Section"
import { YuanPriceInput } from "./YuanPriceInput"
import { MAX_SPECS, skuKey, buildSkuList, buildItemProperties, type SpecDimension } from "./sku-specs"
import { CONTROL, INPUT, toNumberInput, type ItemEditSectionProps } from "../item-edit-types"

interface SkuSectionProps extends ItemEditSectionProps {
  /** 规格维度由父级持有，因为价格与库存区的存废取决于它 */
  specs: SpecDimension[]
  onSpecsChange: (next: SpecDimension[]) => void
}

/**
 * 规格区 —— 单规格与多规格在此切换。
 *
 * 单规格（无 SKU 列表）：只给一个「添加规格」入口。建好规格名与规格值之后，
 * 价格库存就由下面的笛卡尔积表承载，上方「价格与库存」区整块不再渲染 ——
 * 与后端行为一致（有 itemSkuList 时单规格字段不生效）。
 *
 * 恢复单规格：删光所有维度即可。此时把 itemSkuList 还原成**打开弹窗时的原值**
 * （而不是就地清成 []），于是误点「添加规格」再删掉之后，草稿与基线一致、
 * 不会被判成有未保存改动，商品数据一个字节都没动。
 *
 * 规格维度由父级持有（它决定价格区的存废），这里只负责渲染与改动；而**重算组合
 * 的时机**留在本组件：后端返回的 SKU 列表未必是完整笛卡尔积（可能缺货下架过若干
 * 组合），每次渲染都重算会把这些组合补回来。所以只在 `dirty`（用户真的动过规格）
 * 之后才重算。
 */
export function SkuSection({ draft, mutators, specs, onSpecsChange }: SkuSectionProps) {
  const skuList = draft.itemSkuList ?? []

  // 用户是否动过规格 —— 没动过就绝不重算组合
  const [dirty, setDirty] = useState(false)
  // 弹窗打开时的 itemSkuList，用于「恢复单规格」时原样还原（含 null 本身）
  const originalSkuList = useRef<ItemEditSku[] | null>(draft.itemSkuList ?? null)
  // 同上，规格声明也要一起还原 —— 两者是一件事的两个视角，只还原一个会得到
  // 自相矛盾的草稿。刻意不写 `?? null`：接口没给这个字段时是 undefined，原样
  // 还原成 undefined 才会被 JSON.stringify 略过，与基线逐字节一致。
  const originalProperties = useRef<ItemEditMaterial["itemProperties"]>(draft.itemProperties)

  // 每个维度的「待添加规格值」输入草稿，按维度下标存
  const [valueDrafts, setValueDrafts] = useState<Record<number, string>>({})

  // 规格维度或取值变化 → 重算笛卡尔积，并找回已填的价格库存
  useEffect(() => {
    if (!dirty) return
    if (specs.length === 0) {
      // 删光维度 = 恢复单规格。还原原值而非清成 []，草稿才能回到与基线一致的状态。
      // 判据取原始值：写入后 itemSkuList 变成 null 或 []，长度归零即可停手，
      // 不会因为 `null` 与归一化后的 `[]` 不等而反复触发自己。
      if ((draft.itemSkuList?.length ?? 0) > 0) {
        mutators.setSkuList(originalSkuList.current, originalProperties.current)
      }
      return
    }
    const ready = specs.every((s) => s.name.trim() !== "" && s.values.length > 0)
    if (!ready) return

    const generated = buildSkuList(specs, skuList)
    // 规格声明从同一份 specs 产出，随组合表一起下发。只改组合表的话，新增的规格值
    // 出现在 itemSkuList 里却不在 itemProperties 里 —— 闲鱼会收到两份矛盾的数据
    const properties = buildItemProperties(specs)

    // 与当前一致就不写回，否则 effect 会被自己的写入再次触发
    if (
      JSON.stringify(generated) !== JSON.stringify(skuList) ||
      JSON.stringify(properties) !== JSON.stringify(draft.itemProperties ?? null)
    ) {
      mutators.setSkuList(generated, properties)
    }
    // skuList 是 draft.itemSkuList 的归一化视图，跟着它变；单列它会让 Lint
    // 要求补一个每次渲染都换引用的 dep（`?? []` 的产物），反而每帧都白跑一遍
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs, dirty, draft.itemSkuList, mutators])

  /** 所有规格改动都经由此处，统一置脏 —— 漏一处就会静默不生成表格 */
  const editSpecs = (fn: (prev: SpecDimension[]) => SpecDimension[]) => {
    setDirty(true)
    onSpecsChange(fn(specs))
  }

  const addSpec = () => {
    if (specs.length >= MAX_SPECS) return
    editSpecs((prev) => [...prev, { name: "", values: [] }])
  }

  const removeSpec = (index: number) => {
    editSpecs((prev) => prev.filter((_, i) => i !== index))
    setValueDrafts({})
  }

  const renameSpec = (index: number, name: string) =>
    editSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, name } : s)))

  const addValue = (index: number) => {
    // 规格值挂在规格名下，名字没定下来，值也无处安放。输入框本身就 disabled 了，
    // 这里再挡一道：回车键与未来的其它入口不该绕过这条约束
    if (!specs[index]?.name.trim()) return
    const raw = (valueDrafts[index] ?? "").trim()
    if (!raw) return
    editSpecs((prev) =>
      prev.map((s, i) =>
        i === index && !s.values.includes(raw) ? { ...s, values: [...s.values, raw] } : s
      )
    )
    setValueDrafts((d) => ({ ...d, [index]: "" }))
  }

  const removeValue = (index: number, value: string) =>
    editSpecs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, values: s.values.filter((v) => v !== value) } : s))
    )

  /**
   * 收回最后一个规格值 —— 输入框空着时按退格触发。
   *
   * 收的是「最后一个」而不是「光标左边那个」：标签与输入框共用一个框，但值是
   * 顺序追加的，退格删末尾是标签式输入框的通用手感，也免得去猜用户指的是哪个。
   */
  const popValue = (index: number) => {
    const last = specs[index]?.values.slice(-1)[0]
    if (last !== undefined) removeValue(index, last)
  }

  const ready = specs.length > 0 && specs.every((s) => s.name.trim() !== "" && s.values.length > 0)

  return (
    <section className="space-y-3">
      <SectionTitle>商品规格</SectionTitle>

      {/* 入口常驻顶部：规格维度会随着填写一路长高，把入口压在列表末尾，会让
          「再加一个规格」越往后越难找 —— 而它是这一区唯一的起点 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addSpec}
          disabled={specs.length >= MAX_SPECS}
          className="inline-flex items-center gap-1.5 h-10 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          添加规格
        </button>
        {/* 不用 Hint：它自带 mt-1，是为了块级说明设计的，放进横排按钮行会矮半格 */}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          最多 {MAX_SPECS} 个规格
        </span>
      </div>

      {specs.length > 0 && (
        <div className="space-y-3">
          {specs.map((spec, i) => {
            // 规格名是规格值的前提：「颜色」没定下来，填「红色」也无所依附
            const nameReady = spec.name.trim() !== ""

            return (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                {/* 删除整个规格维度放在行首：它与这一行是「整体 - 部件」的关系，
                    跟在字段后面容易被当成「删掉前面的输入」 */}
                <button
                  type="button"
                  aria-label={`删除规格 ${i + 1}`}
                  title="删除该规格"
                  onClick={() => removeSpec(i)}
                  className="h-10 w-10 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <label
                    htmlFor={`spec-name-${i}`}
                    className="text-sm text-gray-500 dark:text-gray-400"
                  >
                    规格类型
                  </label>
                  <input
                    id={`spec-name-${i}`}
                    value={spec.name}
                    onChange={(e) => renameSpec(i, e.target.value)}
                    placeholder="如：颜色、尺码"
                    className={`${CONTROL} w-28`}
                  />
                </div>

                {/* 规格值：已添加的标签与光标同在一个框里，回车即添加一个标签。
                    标签落在输入框内部而不是飘在外面，填完一眼就能看到自己刚输的
                    值已经进去了；一个规格值就是一个词，为它单开一行、再配一个
                    加号按钮，两个规格就能把弹窗占满 */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    规格值
                  </span> */}
                  <div
                    className={`flex flex-wrap items-center gap-1.5 flex-1 min-w-0 min-h-10 px-2 py-1 rounded-lg border transition-colors ${
                      nameReady
                        ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                    }`}
                  >
                    {spec.values.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        {v}
                        <button
                          type="button"
                          aria-label={`删除规格值 ${v}`}
                          onClick={() => removeValue(i, v)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      value={valueDrafts[i] ?? ""}
                      onChange={(e) => setValueDrafts((d) => ({ ...d, [i]: e.target.value }))}
                      onKeyDown={(e) => {
                        // 输入法组字中（中文拼音还没上屏）时，回车与退格都是在跟
                        // 候选词打交道，交给 IME，不要抢
                        if (e.nativeEvent.isComposing) return
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addValue(i)
                          return
                        }
                        // 框里还留着字的时候退格是在删字，只有空框才当作收回标签
                        if (e.key === "Backspace" && (valueDrafts[i] ?? "") === "") {
                          e.preventDefault()
                          popValue(i)
                        }
                      }}
                      disabled={!nameReady}
                      aria-label={`第 ${i + 1} 个规格的规格值，输入后回车添加`}
                      placeholder={nameReady ? "回车确认" : "请先输入规格类型"}
                      className="flex-1 min-w-20 h-6 px-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 价格库存表 —— 规格齐备、组合生成之后才有内容可填 */}
      {ready && skuList.length > 0 && (
        // 宽度按内容取，不撑满弹窗：撑满会把价格与库存推到最右侧，眼睛得横跨
        // 半个弹窗去对行。规格列与价格库存各占各的宽度，余量留在右侧
        <div className="w-fit max-w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                {/* 一个规格维度一列，表头就是用户填的规格名（颜色 / 尺寸）。
                    统一叫「规格」的话，两个规格挤在一格里还得靠「/」猜哪个是哪个 */}
                {specs.map((spec, i) => (
                  <th
                    key={i}
                    className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {spec.name}
                  </th>
                ))}
                <th className="w-32 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  价格（元）
                </th>
                <th className="w-28 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  库存
                </th>
              </tr>
            </thead>
            <tbody>
              {skuList.map((sku, i) => {
                const name = sku.propertyList.map((p) => p.valueText).join(" / ")
                return (
                  <tr key={skuKey(sku.propertyList)} className="border-t border-gray-100 dark:border-gray-800">
                    {sku.propertyList.map((p, j) => (
                      <td
                        key={j}
                        className="px-3 py-2 text-gray-700 dark:text-gray-300 leading-tight break-words"
                      >
                        {p.valueText}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <YuanPriceInput
                        ariaLabel={`${name} 的价格`}
                        cents={sku.priceInCent}
                        onChange={(v) => mutators.patchSku(i, "priceInCent", v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`${name} 的库存`}
                        value={toNumberInput(sku.quantity)}
                        onChange={(e) => mutators.patchSku(i, "quantity", e.target.value)}
                        placeholder="0"
                        className={INPUT}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
