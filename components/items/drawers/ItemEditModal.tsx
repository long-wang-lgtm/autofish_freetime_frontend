"use client"

import { useState } from "react"
import { ImagePlus } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { Modal } from "@/components/ui/overlay/Modal"
import { useToast } from "@/components/ui/Toaster"

interface ItemEditModalProps {
  item: ShopItem
  open: boolean
  onClose: () => void
}

/**
 * 商品编辑弹窗 —— 编辑商品自身属性（标题 / 封面图 / 描述 / 发布地址 / 价格）。
 *
 * 与它替换掉的旧编辑抽屉是两件事：旧的是「各项自动化配置」的编辑入口，
 * 那些配置现在都在表格对应列上直接改，弹窗不再承担。这里只管商品属性。
 *
 * 当前是骨架：统一编辑接口尚未定，除标题外一律只渲染控件不提交 ——
 * 保存只提示「接口未接入」，不写伪 mutation，避免后续接接口时误认为已通。
 * 字段单列纵向排布，PC 与移动端同一套结构（移动端视口小，双列会挤压标签与输入框）。
 */
export function ItemEditModal({ item, open, onClose }: ItemEditModalProps) {
  // 商品标题在只读信息带里已展示，不再重复开一个可编辑输入框；
  // 其余字段待接口同步后接线
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")

  const { addToast } = useToast()

  const inputClass =
    "w-full h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500"

  // 占位字段统一提示，接接口后逐条删除
  const pendingHint = (text: string) => (
    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{text}</p>
  )

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        取消
      </button>
      <button
        type="button"
        onClick={() => addToast({ title: "编辑接口尚未接入", variant: "info" })}
        className="h-10 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg opacity-50 cursor-not-allowed"
      >
        保存
      </button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} size="xl" maxHeight="80vh" footer={footer}>
      <div className="space-y-4">
        {/* 商品信息 —— 只读 */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {item.picurl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.picurl}
              alt={item.title || "商品封面"}
              loading="lazy"
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title || "无标题"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {item.account.name} · <span className="tabular-nums">gid {item.gid}</span>
            </p>
          </div>
        </div>

        {/* 商品封面图 */}
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">商品图片</span>
          <div className="flex flex-wrap items-center gap-3">
            {item.picurl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.picurl}
                alt="商品图片"
                loading="lazy"
                className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
              />
            )}

            {/* 添加图片 —— 占位，待接入图片上传接口 */}
            <button
              type="button"
              aria-label="添加图片"
              title="添加图片"
              disabled
              className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0 cursor-not-allowed"
            >
              <ImagePlus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
          {pendingHint("添加图片待接入图片上传接口")}
        </div>

        {/* 商品描述 */}
        <div>
          <label htmlFor="item-edit-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            商品描述
          </label>
          <textarea
            id="item-edit-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="商品描述"
            className={`${inputClass} h-auto resize-vertical leading-relaxed`}
          />
          {pendingHint("商品描述字段待后端同步")}
        </div>

        {/* 发布地址 */}
        <div>
          <label htmlFor="item-edit-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            发布地址
          </label>
          <input
            id="item-edit-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="发布地址"
            className={inputClass}
          />
          {pendingHint("发布地址字段待后端同步")}
        </div>

        {/* 价格 —— 只读，改价走列表的「改价」按钮，这里不重复提供入口 */}
        <div>
          <label htmlFor="item-edit-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            价格（元）
          </label>
          <input
            id="item-edit-price"
            value={item.reservePrice || "-"}
            disabled
            className={inputClass}
          />
          {pendingHint("修改价格请使用列表的「改价」按钮")}
        </div>
      </div>
    </Modal>
  )
}
