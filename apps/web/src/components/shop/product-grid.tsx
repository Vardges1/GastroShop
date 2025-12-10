"use client"

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { ProductCard } from './product-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearchParams } from 'next/navigation'

export function ProductGrid() {
  const t = useTranslations('shop')
  const searchParams = useSearchParams()
  
  // Получаем категории и теги из URL
  const categories = searchParams.getAll('category')
  const tags = searchParams.getAll('tag')

  const filters: Record<string, any> = {
    query: searchParams.get('query') || undefined,
    region: searchParams.get('region') || undefined,
    price_min: searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined,
    price_max: searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined,
    in_stock: searchParams.get('inStock') === 'true' ? true : undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    page_size: 20,
  }

  // Добавляем теги, если есть
  if (tags.length > 0) {
    filters.tags = tags
  }
  
  // Добавляем категории, если есть - передаем как массив для правильной обработки на бэкенде
  if (categories.length > 0) {
    // Axios автоматически преобразует массив в формат category=value1&category=value2
    categories.forEach(cat => {
      if (!filters.category) {
        filters.category = []
      }
      filters.category.push(cat)
    })
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.products.getAll(filters),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
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
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('loadError')}</p>
      </div>
    )
  }

  if (!data?.items.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('noProducts')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {data.items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
