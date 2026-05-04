'use client'

import { ProductItem } from '@/lib/api/selection'
import { Eye, ThumbsUp, Heart, Tag } from 'lucide-react'

interface ContentListProps {
  products: ProductItem[]
}

export function ContentList({ products }: ContentListProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 text-sm">该日期暂无采集数据</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* 表头 */}
      <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-400 bg-gray-50/50">
        <div className="col-span-5">商品信息</div>
        <div className="col-span-1 text-right">价格</div>
        <div className="col-span-1 text-center">浏览</div>
        <div className="col-span-1 text-center">想要</div>
        <div className="col-span-1 text-center">询单率</div>
        <div className="col-span-1 text-center">收藏</div>
        <div className="col-span-1 text-center">来源</div>
        <div className="col-span-1 text-center">发布时间</div>
      </div>
      {/* 数据行 */}
      {products.map((p) => (
        <div
          key={p.id}
          className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center text-sm hover:bg-gray-50/50 transition-colors border-t border-gray-50"
        >
          <div className="col-span-5 min-w-0">
            <div className="truncate font-medium text-gray-900">{p.title}</div>
            <div className="truncate text-xs text-gray-400">{p.shopName}</div>
          </div>
          <div className="col-span-1 text-right font-semibold text-orange-600">¥{p.price}</div>
          <div className="col-span-1 text-center text-gray-400 flex items-center justify-center gap-0.5">
            <Eye className="w-3.5 h-3.5" />{p.lookCount}
          </div>
          <div className="col-span-1 text-center text-red-400 flex items-center justify-center gap-0.5">
            <ThumbsUp className="w-3.5 h-3.5" />{p.wantCount}
          </div>
          <div className="col-span-1 text-center text-gray-600">{p.ratio}</div>
          <div className="col-span-1 text-center text-gray-400 flex items-center justify-center gap-0.5">
            <Heart className="w-3.5 h-3.5" />{p.collectCount}
          </div>
          <div className="col-span-1 text-center">
            <span className={`text-[10px] px-2 py-0.5 rounded ${
              p.sourceType === 'keyword' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
            }`}>
              {p.sourceType === 'keyword' ? '关键词' : '账号'}
            </span>
          </div>
          <div className="col-span-1 text-center text-xs text-gray-400">{p.publishedAt}</div>
        </div>
      ))}
    </div>
  )
}
