"use client"

import { useCallback, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ShopItem, ItemEditMaterial } from "@/lib/api/items"
import { getItemEditDetail } from "@/lib/api/items"
import { Modal } from "@/components/ui/overlay/Modal"
import { ConfirmDialog } from "@/components/ui/overlay/ConfirmDialog"
import { ErrorBanner } from "@/components/ui/feedback/ErrorBanner"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
import { useToast } from "@/components/ui/Toaster"
import { ItemEditFields } from "./ItemEditFields"
import type { DraftUpdater } from "./useItemEditMutators"

interface ItemEditModalProps {
  item: ShopItem
  open: boolean
  onClose: () => void
}

/**
 * 商品编辑弹窗 —— 编辑商品自身属性。
 *
 * 与它替换掉的旧编辑抽屉是两件事：旧的是「各项自动化配置」的编辑入口，
 * 那些配置现在都在表格对应列上直接改。这里只管商品属性。
 *
 * 数据流：打开时拉 /api/items/item.edit.detail，响应即保存接口的请求体，
 * 全程以它作为 draft 的唯一数据源 —— 字段改动就地合并进 draft，保存时整包下发。
 * 这样字段没有「拉取模型 → 表单模型」的映射层，也就没有两端字段漂移的可能。
 *
 * 保存接口尚未提供，因此保存只构造并回显请求体，不发起请求。
 */
export function ItemEditModal({ item, open, onClose }: ItemEditModalProps) {
  const { addToast } = useToast()

  // draft：当前编辑值，即保存请求体
  const [draft, setDraft] = useState<ItemEditMaterial | null>(null)
  // baseline：拉取时的原值，用于判断是否有未保存改动
  const [baseline, setBaseline] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // 保存接口未就位，先给一个能看见请求体的出口，省得只能靠开发者工具
  const [showBody, setShowBody] = useState(false)
  const [lastBody, setLastBody] = useState<ItemEditMaterial | null>(null)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["itemEditDetail", item.gid, item.account.uid],
    queryFn: () => getItemEditDetail(item.gid, item.account.uid),
    enabled: open,
    // 物料是发布态快照，编辑期间不能被后台刷新覆盖掉用户正在改的值
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // 每次打开都从缓存/接口重新起一份草稿。
  // 不能只依赖 data 变化：放弃编辑后立刻重开，staleTime 内 data 是同一个引用，
  // 效果不重跑，被丢弃的草稿会原样回来。
  useEffect(() => {
    if (!open) return
    if (!data) {
      setDraft(null)
      setBaseline(null)
      return
    }
    setDraft(data)
    setBaseline(JSON.stringify(data))
  }, [open, data])

  // 稳定引用：ItemEditFields 依赖它做 useMemo，行内函数会让 mutators 每次重建
  const applyPatch = useCallback<DraftUpdater>(
    (fn) => setDraft((prev) => (prev ? fn(prev) : prev)),
    []
  )

  const isDirty = draft !== null && baseline !== null && JSON.stringify(draft) !== baseline

  const handleClose = () => {
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  // Modal 的遮罩是阻断式的、不响应点击，这里补一个 Esc 关闭。
  // 依赖 isDirty：它决定 handleClose 是直接关还是弹确认，变了必须重绑
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDirty])

  /**
   * 构造保存请求体。
   *
   * desc 与 title 在这里对齐：后端读回时 title 已被校验器覆盖为 desc 全文，
   * 用户改的是 desc，若原样带回旧 title，保存后标题会与正文脱节。
   * 保存接口就位后，把这个对象直接作为 body 下发即可。
   */
  const buildRequestBody = (d: ItemEditMaterial): ItemEditMaterial => ({
    ...d,
    itemTextDTO: { ...d.itemTextDTO, title: d.itemTextDTO.desc },
  })

  const handleSave = () => {
    if (!draft) return
    // 保存接口暂未提供：只构造并回显请求体，不发起请求
    setLastBody(buildRequestBody(draft))
    setShowBody(true)
    addToast({ title: "保存接口尚未接入", description: "已构造请求体", variant: "info" })
  }

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleClose}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        取消
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={!draft || !isDirty}
        className="h-10 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        保存
      </button>
    </div>
  )

  return (
    <>
      <Modal open={open} onClose={handleClose} size="xl" maxHeight="85vh" footer={footer}>
        <div className="space-y-4">
          {/* 商品信息 —— 只读 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {item.picurl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.picurl}
                alt={item.title || "商品"}
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

          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500 dark:text-gray-400">
              <LoadingSpinner size="md" />
              正在拉取商品信息...
            </div>
          ) : isError ? (
            <ErrorBanner
              variant="banner"
              message={`商品信息加载失败：${error instanceof Error ? error.message : String(error)}`}
              onRetry={() => refetch()}
            />
          ) : draft ? (
            <ItemEditFields draft={draft} setDraft={applyPatch} />
          ) : (
            // 重开时 data 命中缓存、isPending 为 false，而 draft 要等 effect 落地，
            // 这一帧不能空着 —— 否则弹窗会闪一下无内容
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          )}

          {/* 请求体预览 —— 保存接口接入后可移除 */}
          {showBody && lastBody && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  保存请求体
                </h4>
                <button
                  type="button"
                  onClick={() => setShowBody(false)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  收起
                </button>
              </div>
              <pre className="max-h-64 overflow-auto p-3 rounded-lg bg-gray-900 text-gray-100 text-xs leading-relaxed">
                {JSON.stringify(lastBody, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="放弃编辑？"
        description="有未保存的改动，关闭后将会丢失。"
        confirmLabel="放弃"
        cancelLabel="继续编辑"
        variant="danger"
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
      />
    </>
  )
}
