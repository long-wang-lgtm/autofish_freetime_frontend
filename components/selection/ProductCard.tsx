'use client'

import { ProductItem } from '@/lib/api/selection'
import { Eye, ThumbsUp, Tag } from 'lucide-react'

interface ProductCardProps {
  product: ProductItem
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 hover:shadow-md transition-all">
      {/* 商品图 */}
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-gray-300 text-sm">[商品图片]</span>
      </div>

      {/* 价格 + 热度 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl font-bold text-orange-600">¥{product.price}</span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {product.lookCount}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <ThumbsUp className="w-3.5 h-3.5" />
            {product.wantCount}
          </span>
        </div>
      </div>

      {/* 标题 */}
      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-3">{product.title}</h3>

      {/* 店铺 + 来源 */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span>{product.shopName}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Tag className="w-3 h-3" />
          {product.source}
        </span>
      </div>

      {/* 指标行 */}
      <div className="flex items-center gap-3 text-xs text-gray-400 py-3 border-t border-gray-50">
        <span>询单率: <strong className="text-gray-600">{product.ratio}</strong></span>
        <span>收藏: <strong className="text-gray-600">{product.collectCount}</strong></span>
        <span className="ml-auto">{product.publishedAt}</span>
      </div>
    </div>
  )
}
