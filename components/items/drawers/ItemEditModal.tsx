"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ShopItem, ItemEditMaterial } from "@/lib/api/items"
import { getItemEditDetail } from "@/lib/api/items"
import { Modal } from "@/components/ui/overlay/Modal"
import { ConfirmDialog } from "@/components/ui/overlay/ConfirmDialog"
import { ErrorBanner } from "@/components/ui/feedback/ErrorBanner"
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner"
import { ItemEditFields } from "./ItemEditFields"
import type { DraftUpdater } from "./useItemEditMutators"

/**
 * 提交动作 —— 这个弹窗有两条来路，共用同一套表单，只有「提交到哪」不一样：
 * 编辑商品属性（保存）与重新发布（重发）。差异全部收在这一个对象里，
 * 弹窗本身不认识任何具体接口。
 */
export interface ItemEditSubmit {
  /** 主按钮文案 */
  label: string
  /**
   * 提交动作，入参即请求体 —— 弹窗里改了什么就下发什么，请求体由弹窗自己构造。
   * 失败时抛错（调用方自己提示），成功即关窗。
   */
  run: (body: ItemEditMaterial) => Promise<unknown>
  /** 提交前的二次确认。不可逆的操作必须让用户先看清代价 */
  confirm?: {
    title: string
    description: ReactNode
    confirmLabel: string
  }
  /** 提交进行中 */
  pending?: boolean
}

interface ItemEditModalProps {
  item: ShopItem
  open: boolean
  onClose: () => void
  /** 提交到哪 —— 保存或重发 */
  submit: ItemEditSubmit
}

/**
 * 深拷贝一份物料。
 *
 * 接口返回的是 JSON，用 JSON 往返即可，且刻意不引入 structuredClone —— 它对新
 * 运行环境有要求，而这里没有任何需要它的理由（无 Date、Map、循环引用）。
 */
const cloneMaterial = (m: ItemEditMaterial): ItemEditMaterial =>
  JSON.parse(JSON.stringify(m)) as ItemEditMaterial

/**
 * ⚠ 临时开关：提交动作尚未开发完成，先把保存 / 重发按钮置灰。
 *
 * 只禁按钮 —— 接口接入、请求体构造、二次确认、mutation 全部原样留着，
 * 开发完成后改回 false 即可恢复，不用重新接一遍。
 */
const SUBMIT_DISABLED = true

/**
 * 商品编辑弹窗 —— 编辑商品自身属性。
 *
 * 与它替换掉的旧编辑抽屉是两件事：旧的是「各项自动化配置」的编辑入口，
 * 那些配置现在都在表格对应列上直接改。这里只管商品属性。
 *
 * 数据流：打开时拉 /api/items/item.edit.detail，把响应**深拷贝成两份** ——
 * 一份 `draft` 作为编辑副本（也是提交时的请求体），一份 `original` 原封不动留着。
 * 字段改动实时合并进副本，提交时整包下发副本。这样字段没有「拉取模型 → 表单模型」
 * 的映射层，也就没有两端字段漂移的可能；而原数据始终在手上，任何时候都能整份回去。
 *
 * 提交到哪由 `submit` 决定：保存（/item.edit）与重发（/item.republish）走的是同一个
 * 表单、同一份请求体，只有那个函数不一样。弹窗本身不认识任何具体接口。
 */
export function ItemEditModal({ item, open, onClose, submit }: ItemEditModalProps) {
  // draft：编辑副本，即请求体。所有改动只落在这份副本上
  const [draft, setDraft] = useState<ItemEditMaterial | null>(null)
  // original：拉取时的原数据，独立于 draft 的另一份副本，用于「恢复原值」
  const [original, setOriginal] = useState<ItemEditMaterial | null>(null)
  // 每次换数据就自增，作为字段区的 key —— 强制它重挂载
  const [draftVersion, setDraftVersion] = useState(0)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["itemEditDetail", item.gid, item.account.uid],
    queryFn: () => getItemEditDetail(item.gid, item.account.uid),
    enabled: open,
    // 物料是发布态快照，编辑期间不能被后台刷新覆盖掉用户正在改的值
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // 每次打开都从缓存/接口重新起一份副本，原数据另存一份不动。
  // 不能只依赖 data 变化：放弃编辑后立刻重开，staleTime 内 data 是同一个引用，
  // 效果不重跑，被丢弃的草稿会原样回来。
  useEffect(() => {
    if (!open) return
    if (!data) {
      setDraft(null)
      setOriginal(null)
      return
    }
    setDraft(cloneMaterial(data))
    setOriginal(cloneMaterial(data))
    // 字段区在挂载时把数据推导成自己的本地态（价格输入文本、规格维度），
    // 换了一份数据而不重挂载，它会拿着上一份继续编辑
    setDraftVersion((v) => v + 1)
  }, [open, data])

  const baseline = useMemo(
    () => (original ? JSON.stringify(original) : null),
    [original]
  )

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
   * 构造请求体 —— 保存与重发共用这一份。
   *
   * desc 与 title 在这里对齐：后端读回时 title 已被校验器覆盖为 desc 全文
   * （ItemDesc.validate_title），用户改的是 desc，若原样带回旧 title，
   * 保存后标题会与正文脱节。
   */
  const buildRequestBody = (d: ItemEditMaterial): ItemEditMaterial => ({
    ...d,
    itemTextDTO: { ...d.itemTextDTO, title: d.itemTextDTO.desc },
  })

  /** 真正执行提交 —— 无论提交到哪，成功即关窗，失败留在原地 */
  const runSubmit = async () => {
    if (!draft) return
    try {
      // 弹窗里的改动就是请求体，调用方不必知道它怎么构造的
      await submit.run(buildRequestBody(draft))
      // 提交成功即完成使命，直接关 —— 这里不走 handleClose：那是拦「未保存改动」
      // 的，而此刻改动已经交出去了，再问一遍「是否放弃编辑」只会让人困惑
      onClose()
    } catch {
      // 失败就留在弹窗里：错误提示由提交动作自己给，用户改完还能再来一次
    }
  }

  /** 主按钮：有二次确认就先把确认摆出来，没有就直接提交 */
  const handleSubmitClick = () => {
    if (submit.confirm) {
      setConfirmSubmit(true)
      return
    }
    void runSubmit()
  }

  const submitting = !!submit.pending
  // 不要求「先改点什么」才让点：保存与重发都是「把弹窗里这份物料发出去」，
  // 原样下发也是一次有效请求。只挡三件事 —— 功能未开放、物料还没到、正在提交。
  const canSubmit = !SUBMIT_DISABLED && !!draft && !submitting

  /**
   * 恢复原数据 —— 把编辑副本整个换回打开时的那一份。
   *
   * 只换 draft 不够：各字段区在挂载时会把数据推导成自己的本地态（价格输入框的
   * 文本、规格维度），不重挂载就会拿着旧副本继续编辑。所以自增版本号当 key，
   * 让整棵字段树按恢复后的数据重新挂载一次。
   */
  const handleRestore = () => {
    if (!original) return
    setDraft(cloneMaterial(original))
    setDraftVersion((v) => v + 1)
    setConfirmRestore(false)
  }

  const footer = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirmRestore(true)}
        disabled={!original || !isDirty}
        className="mr-auto h-10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        恢复
      </button>
      <button
        type="button"
        onClick={handleClose}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        取消
      </button>
      <button
        type="button"
        onClick={handleSubmitClick}
        disabled={!canSubmit}
        // 灰着的按钮说明一下原因，免得又被当成「点了没反应」
        title={SUBMIT_DISABLED ? `${submit.label}功能尚未开发完成` : undefined}
        className="h-10 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            {/* 蓝底上的转圈：默认的灰/蓝配色在白字按钮里看不见，改成白色系 */}
            <LoadingSpinner size="sm" className="border-white/40 border-t-white" />
            {submit.label}中...
          </span>
        ) : (
          submit.label
        )}
      </button>
    </div>
  )

  return (
    <>
      {/*
        宽度：字段区是 3 列网格，max-w-2xl（672px）会把每列压到 200px 以下。
        桌面端取 2/3 视口宽，但不小于 672px —— 否则在 640~900px 这一档会比原来还窄。
        断点写在 sm 上：小屏不加限制，满宽更接近移动端 bottomsheet 的观感。
      */}
      <Modal
        open={open}
        onClose={handleClose}
        size="xl"
        maxHeight="85vh"
        className="sm:max-w-[max(672px,67vw)]"
        footer={footer}
      >
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
            // key 绑定数据版本：换数据（含「恢复原值」）时整棵树重挂载，
            // 让各字段区按新的数据重建自己的本地态
            <ItemEditFields key={draftVersion} draft={draft} setDraft={applyPatch} />
          ) : (
            // 重开时 data 命中缓存、isPending 为 false，而 draft 要等 effect 落地，
            // 这一帧不能空着 —— 否则弹窗会闪一下无内容
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
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

      <ConfirmDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="恢复原值？"
        description="当前的改动会被丢弃，字段回到打开弹窗时的数据。"
        confirmLabel="恢复"
        cancelLabel="继续编辑"
        variant="danger"
        onConfirm={handleRestore}
      />

      {submit.confirm && (
        <ConfirmDialog
          open={confirmSubmit}
          onOpenChange={setConfirmSubmit}
          title={submit.confirm.title}
          description={submit.confirm.description}
          confirmLabel={submit.confirm.confirmLabel}
          variant="danger"
          onConfirm={() => {
            setConfirmSubmit(false)
            void runSubmit()
          }}
        />
      )}
    </>
  )
}
