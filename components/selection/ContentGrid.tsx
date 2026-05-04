'use client'

import { ProductItem } from '@/lib/api/selection'
import { ProductCard } from './ProductCard'

interface ContentGridProps {
  products: ProductItem[]
}

export function ContentGrid({ products }: ContentGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 text-sm">该日期暂无采集数据</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
