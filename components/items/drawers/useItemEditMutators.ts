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

      /**
       * 改类目 —— 一处改动要落到两个对象上。
       *
       * itemCatDTO.channelCatId 与 label.channelCateId 是同一个渠道类目 ID 的两种
       * 写法（mock 里都是 202036301），catName 与 label.channelCateName 同理。发布器
       * 两份都读，只改一份会得到自相矛盾的商品。
       *
       * label.properties 是拼给发布器的串（属性ID##属性名:值ID##值名），类目变了
       * 它必须跟着变，否则发布到旧类目下 —— 所以这里一并重拼。
       */
      setChannelCate: (channelCateId, channelCateName) =>
        setDraft((d) => ({
          ...d,
          itemCatDTO: { ...d.itemCatDTO, channelCatId: channelCateId, catName: channelCateName },
          itemLabelExtList: d.itemLabelExtList.map((l) => ({
            ...l,
            channelCateId,
            channelCateName,
            text: channelCateName,
            properties: `${l.propertyId}##${l.propertyName}:${channelCateId}##${channelCateName}`,
          })),
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

      /**
       * 整包替换 SKU 列表 + 规格声明 —— 规格维度或规格值一变，组合就整体重算，
       * 逐行 patch 无从下手（行数与行的身份都会变）。笛卡尔积的生成在 SkuSection
       * 里，这里只负责落盘。
       *
       * itemProperties 与 itemSkuList 必须一起落盘：前者是「有哪些规格」，后者是
       * 「每个组合卖多少」，拆成两个方法迟早会出现「新组合表 + 旧规格声明」的请求体。
       * 所以这里只留一个口子，单独改其中一个在类型上就办不到。
       */
      setSkuList: (skus, properties) =>
        setDraft((d) => ({ ...d, itemSkuList: skus, itemProperties: properties })),

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
