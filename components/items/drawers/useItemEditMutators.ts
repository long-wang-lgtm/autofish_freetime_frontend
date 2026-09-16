"use client"

import { useMemo } from "react"
import type { ItemEditMaterial } from "@/lib/api/items"
import type { ItemEditMutators } from "./item-edit-types"

/** 与 React 的 setState 同形：接受函数式更新即可，这里不暴露直接赋值 */
export type DraftUpdater = (updater: (prev: ItemEditMaterial) => ItemEditMaterial) => void

/**
 * 把「编辑草稿写回」集中成一组纯改写器。
 *
 * 每个方法只替换目标字段、其余原样保留 —— 保存时整包下发，漏掉任何字段都会
 * 让商品少一块数据，所以一律走不可变展开而非部分构造。
 *
 * setDraft 需是稳定引用（用 useCallback 包过），否则下面的 useMemo 每次都重建，
 * 子组件拿到的 mutators 引用一变就整片重渲染。
 */
export function useItemEditMutators(setDraft: DraftUpdater): ItemEditMutators {
  return useMemo(
    () => ({
      setDesc: (key, value) =>
        setDraft((d) => ({ ...d, itemTextDTO: { ...d.itemTextDTO, [key]: value } })),

      patchImage: (index, value) =>
        setDraft((d) => ({
          ...d,
          imageInfoDOList: d.imageInfoDOList.map((img, i) =>
            i === index ? { ...img, ...value } : img
          ),
        })),

      removeImage: (index) =>
        setDraft((d) => ({
          ...d,
          imageInfoDOList: d.imageInfoDOList.filter((_, i) => i !== index),
        })),

      patchPrice: (key, value) =>
        setDraft((d) => ({
          ...d,
          itemPriceDTO: { ...d.itemPriceDTO, [key]: value },
        })),

      setQuantity: (value) => setDraft((d) => ({ ...d, quantity: value })),

      patchAddr: (key, value) =>
        setDraft((d) => ({ ...d, itemAddrDTO: { ...d.itemAddrDTO, [key]: value } })),

      patchCat: (key, value) =>
        setDraft((d) => ({ ...d, itemCatDTO: { ...d.itemCatDTO, [key]: value } })),

      patchLabel: (index, key, value) =>
        setDraft((d) => ({
          ...d,
          itemLabelExtList: d.itemLabelExtList.map((l, i) =>
            i === index ? { ...l, [key]: value } : l
          ),
        })),

      patchPostFee: (key, value) =>
        setDraft((d) => ({
          ...d,
          itemPostFeeDTO: { ...d.itemPostFeeDTO, [key]: value },
        })),

      patchProtocol: (index, enable) =>
        setDraft((d) => ({
          ...d,
          userRightsProtocols: d.userRightsProtocols.map((p, i) =>
            i === index ? { ...p, enable } : p
          ),
        })),

      patchSku: (index, key, value) =>
        setDraft((d) => ({
          ...d,
          itemSkuList: (d.itemSkuList ?? []).map((s, i) =>
            i === index ? { ...s, [key]: value } : s
          ),
        })),
    }),
    [setDraft]
  )
}
