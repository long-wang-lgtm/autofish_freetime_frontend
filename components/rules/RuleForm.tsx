"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm, useController } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  KeywordRule,
  KeywordRuleCreate,
  KeywordRuleUpdate,
  createKeywordRule,
  updateKeywordRule,
  PREDEFINED_KEYWORDS,
  linkItemToRule,
  unlinkItemFromRule,
  linkGroupToRule,
  unlinkGroupFromRule,
  listRuleItems,
} from "@/lib/api/keywords"
import { listItemGroups, ItemGroup } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { useQueryClient } from "@tanstack/react-query"

// 占位符定义
const PLACEHOLDERS = [
  { label: "订单号", value: "{订单号}" },
  { label: "商品标题", value: "{商品标题}" },
  { label: "价格", value: "{价格}" },
  { label: "数量", value: "{数量}" },
  { label: "使用说明", value: "{使用说明}" },
  { label: "商家编码", value: "{商家编码}" },
  { label: "卡种/卡券方案", value: "{卡种/卡券方案名称}" },
  { label: "卡券信息", value: "{卡券信息}" },
  { label: "分段符", value: "{分段符}" },
  { label: "Sku属性名", value: "{Sku属性名}" },
  { label: "充值账号", value: "{充值账号}" },
  { label: "拍下时间", value: "{拍下时间}" },
  { label: "付款时间", value: "{付款时间}" },
  { label: "当前时间", value: "{当前时间}" },
  { label: "买家留言", value: "{买家留言}" },
]

// 商品卡片占位符格式 - 使用 [ITEM:商品ID] 方便后端识别
const makeItemCardPlaceholder = (itemId: string) => `[ITEM:${itemId}]`

const ruleSchema = z.object({
  reply_type: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  reply_content: z.string().min(1, "回复内容不能为空"),
  match_type: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
})

type FormData = z.infer<typeof ruleSchema>

interface RuleFormProps {
  rule?: KeywordRule
  onClose: () => void
  onSuccess: () => void
}

export function RuleForm({ rule, onClose, onSuccess }: RuleFormProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)

  const isEdit = !!rule

  // 获取商品列表（规则页专用轻量接口，独立 queryKey 避免与其他页面缓存冲突）
  const { data: itemsData } = useQuery({
    queryKey: ["keyword-rule-items"],
    queryFn: listRuleItems,
  })

  // 获取商品组列表
  const { data: groupsData } = useQuery({
    queryKey: ["item-groups"],
    queryFn: listItemGroups,
  })

  // 选中的关联商品和商品组
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  // 搜索状态
  const [itemSearch, setItemSearch] = useState("")
  const [groupSearch, setGroupSearch] = useState("")

  // 商品卡片选择弹窗状态
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [itemPickerSearch, setItemPickerSearch] = useState("")

  // 初始化关联数据
  useEffect(() => {
    if (rule) {
      setSelectedItems(rule.linked_item_list.map((i) => i.item_id))
      setSelectedGroups(rule.linked_group_list.map((g) => g.group_id))
    } else {
      setSelectedItems([])
      setSelectedGroups([])
    }
  }, [rule])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      reply_type: rule?.reply_type || "custom",
      keyword: rule?.reply_type === "predefined"
        ? (rule.keyword || "first_reply")
        : (rule?.keyword || ""),
      reply_content: rule?.reply_content || "",
      match_type: rule?.match_type || "exact",
      priority: rule?.priority || 0,
      enabled: rule?.enabled ?? true,
    },
  })

  const replyType = watch("reply_type")
  const replyContent = watch("reply_content")

  // 插入占位符 - 使用 setValue 确保 react-hook-form 收到更新
  const insertPlaceholder = useCallback((placeholder: string) => {
    const currentValue = replyContent || ""
    const newValue = currentValue + placeholder
    setValue("reply_content", newValue, { shouldValidate: true })
  }, [replyContent, setValue])

  // 插入商品卡片到回复内容
  const insertItemCard = useCallback((itemId: string) => {
    const placeholder = makeItemCardPlaceholder(itemId)
    const currentValue = replyContent || ""
    const newValue = currentValue + placeholder
    setValue("reply_content", newValue, { shouldValidate: true })
    setShowItemPicker(false)
    setItemPickerSearch("")
  }, [replyContent, setValue])

  // 从关联商品拖拽到回复内容
  const handleItemDrag = useCallback((e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("text/plain", makeItemCardPlaceholder(itemId))
  }, [])

  const handleReplyContentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text && text.startsWith("[ITEM:")) {
      const currentValue = replyContent || ""
      const newValue = currentValue + text
      setValue("reply_content", newValue, { shouldValidate: true })
    }
  }, [replyContent, setValue])

  const handleReplyContentDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // 过滤商品列表
  const filteredItems = useMemo(() => {
    if (!itemsData) return []
    if (!itemSearch.trim()) return itemsData
    const search = itemSearch.toLowerCase()
    return itemsData.filter(
      (item) =>
        item.gid.toLowerCase().includes(search) ||
        (item.title && item.title.toLowerCase().includes(search))
    )
  }, [itemsData, itemSearch])

  // 过滤商品组列表
  const filteredGroups = useMemo(() => {
    if (!groupsData?.groups) return []
    if (!groupSearch.trim()) return groupsData.groups
    const search = groupSearch.toLowerCase()
    return groupsData.groups.filter(
      (group) =>
        group.groupId.toLowerCase().includes(search) ||
        group.groupName.toLowerCase().includes(search)
    )
  }, [groupsData?.groups, groupSearch])

  // 商品选择器过滤
  const filteredPickerItems = useMemo(() => {
    if (!itemsData) return []
    if (!itemPickerSearch.trim()) return itemsData
    const search = itemPickerSearch.toLowerCase()
    return itemsData.filter(
      (item) =>
        item.gid.toLowerCase().includes(search) ||
        (item.title && item.title.toLowerCase().includes(search))
    )
  }, [itemsData, itemPickerSearch])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      let createdRule: KeywordRule | null = null

      if (isEdit) {
        const updateData: KeywordRuleUpdate = {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        }
        createdRule = await updateKeywordRule(rule.rule_id, updateData)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const createData: KeywordRuleCreate = {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        }
        createdRule = await createKeywordRule(createData)
        addToast({ title: "创建成功", description: "规则已创建" })
      }

      // 处理关联
      if (createdRule) {
        // 同步商品关联
        const currentItems = rule?.linked_item_list.map((i) => i.item_id) || []
        for (const itemId of selectedItems) {
          if (!currentItems.includes(itemId)) {
            await linkItemToRule(createdRule.rule_id, itemId)
          }
        }
        for (const itemId of currentItems) {
          if (!selectedItems.includes(itemId)) {
            await unlinkItemFromRule(createdRule.rule_id, itemId)
          }
        }

        // 同步商品组关联
        const currentGroups = rule?.linked_group_list.map((g) => g.group_id) || []
        for (const groupId of selectedGroups) {
          if (!currentGroups.includes(groupId)) {
            await linkGroupToRule(createdRule.rule_id, groupId)
          }
        }
        for (const groupId of currentGroups) {
          if (!selectedGroups.includes(groupId)) {
            await unlinkGroupFromRule(createdRule.rule_id, groupId)
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      onSuccess()
    } catch (e) {
      addToast({
        title: isEdit ? "更新失败" : "创建失败",
        description: String(e),
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  const selectAllItems = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map((i) => i.gid))
    }
  }

  const selectAllGroups = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups(filteredGroups.map((g) => g.groupId))
    }
  }

  // 获取关联商品的标题
  const getItemTitle = (itemId: string) => {
    const item = itemsData?.find((i) => i.gid === itemId)
    return item?.title || itemId.slice(0, 8)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">
            {isEdit ? "编辑规则" : "创建规则"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 表单内容 - 左右布局 */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex flex-1 overflow-hidden">
            {/* 左侧：关键词配置 */}
            <div className="w-1/2 p-4 border-r overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-3">关键词配置</h3>

              {/* 回复类型 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  回复类型
                </label>
                <select
                  {...register("reply_type")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="custom">自定义关键词</option>
                  <option value="predefined">预定义关键词</option>
                </select>
              </div>

              {/* 预定义关键词 / 自定义关键词 */}
              {replyType === "predefined" ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    预定义关键词
                  </label>
                  <select
                    {...register("keyword")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {PREDEFINED_KEYWORDS.map((kw) => (
                      <option key={kw.value} value={kw.value}>
                        {kw.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      关键词
                    </label>
                    <input
                      {...register("keyword")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="例如: 多少钱 / 价格"
                    />
                    {errors.keyword && (
                      <p className="mt-1 text-xs text-red-500">{errors.keyword.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        匹配类型
                      </label>
                      <select
                        {...register("match_type")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="exact">精确匹配</option>
                        <option value="fuzzy">模糊匹配</option>
                        <option value="regex">正则匹配</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        优先级
                      </label>
                      <input
                        type="number"
                        {...register("priority", { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
                    </div>
                  </div>
                </>
              )}

              {/* 回复内容 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    回复内容 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowItemPicker(true)}
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    + 插入商品卡片
                  </button>
                </div>
                {/* 占位符工具栏 */}
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">点击插入占位符：</div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => insertPlaceholder(p.value)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 cursor-pointer whitespace-nowrap"
                        title={p.value}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  {...register("reply_content")}
                  rows={4}
                  onDrop={handleReplyContentDrop}
                  onDragOver={handleReplyContentDragOver}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                  placeholder="当消息匹配时，自动发送此回复内容。拖拽右侧商品到此处可插入商品卡片。"
                />
                {errors.reply_content && (
                  <p className="mt-1 text-xs text-red-500">{errors.reply_content.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  提示：占位符格式为 {`{占位符名称}`}，商品卡片格式为 [ITEM:商品ID]
                </p>
              </div>

              {/* 启用开关 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("enabled")}
                  id="enabled"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="text-sm text-gray-700">
                  启用此规则
                </label>
              </div>
            </div>

            {/* 右侧：商品/商品组关联 */}
            <div className="w-1/2 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-3">商品与商品组关联</h3>

              {/* 关联商品 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    关联商品 ({selectedItems.length}个) - 拖拽到左侧插入商品卡片
                  </label>
                  <button
                    type="button"
                    onClick={selectAllItems}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedItems.length === filteredItems.length ? "取消全选" : "全选"}
                  </button>
                </div>
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="搜索商品..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
                />
                <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                  {filteredItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {filteredItems.map((item) => (
                        <div
                          key={item.gid}
                          draggable
                          onDragStart={(e) => handleItemDrag(e, item.gid)}
                          className={`px-2 py-1 text-xs rounded cursor-grab ${
                            selectedItems.includes(item.gid)
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.gid)}
                              onChange={() => toggleItem(item.gid)}
                              className="sr-only"
                            />
                            {item.title || item.gid.slice(0, 10)}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">
                      {itemSearch ? "未找到匹配的商品" : "暂无可关联的商品"}
                    </p>
                  )}
                </div>
              </div>

              {/* 关联商品组 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    关联商品组 ({selectedGroups.length}个)
                  </label>
                  <button
                    type="button"
                    onClick={selectAllGroups}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedGroups.length === filteredGroups.length ? "取消全选" : "全选"}
                  </button>
                </div>
                <input
                  type="text"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="搜索商品组..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
                />
                <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                  {filteredGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {filteredGroups.map((group) => (
                        <label
                          key={group.groupId}
                          className={`px-2 py-1 text-xs rounded cursor-pointer ${
                            selectedGroups.includes(group.groupId)
                              ? "bg-purple-100 text-purple-700 border border-purple-300"
                              : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.groupId)}
                            onChange={() => toggleGroup(group.groupId)}
                            className="sr-only"
                          />
                          {group.groupName}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">
                      {groupSearch ? "未找到匹配的商品组" : "暂无可关联的商品组"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              {isEdit ? "保存" : "创建"}
            </button>
          </div>
        </form>
      </div>

      {/* 商品选择弹窗 */}
      {showItemPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">选择商品插入到回复内容</h3>
              <button
                onClick={() => {
                  setShowItemPicker(false)
                  setItemPickerSearch("")
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                value={itemPickerSearch}
                onChange={(e) => setItemPickerSearch(e.target.value)}
                placeholder="搜索商品..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredPickerItems.length > 0 ? (
                <div className="space-y-2">
                  {filteredPickerItems.map((item) => (
                    <button
                      key={item.gid}
                      type="button"
                      onClick={() => insertItemCard(item.gid)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {item.title || "无标题"}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>ID: {item.gid.slice(0, 12)}...</span>
                        <span>¥{item.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  {itemPickerSearch ? "未找到匹配的商品" : "暂无可选的商品"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
