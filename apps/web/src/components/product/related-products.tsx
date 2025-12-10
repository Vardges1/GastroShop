"use client"

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/shop/product-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types'

interface RelatedProductsProps {
  product: Product
}

export function RelatedProducts({ product }: RelatedProductsProps) {
  const t = useTranslations('product')

  const { data: relatedProducts, isLoading } = useQuery({
    queryKey: ['related-products', product.id],
    queryFn: () => api.products.getByTags(product.tags.slice(0, 3)),
  })

  // Filter out the current product
  const filteredProducts = relatedProducts?.filter(p => p.id !== product.id).slice(0, 4) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t('related')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('related')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((relatedProduct) => (
          <ProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </div>
  )
}
