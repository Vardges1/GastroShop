"use client"

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { useUIStore } from '@/store/ui-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/shop/product-card'
import { X, MapPin } from 'lucide-react'
import Link from 'next/link'

export function RegionInfo() {
  const t = useTranslations('map.region')
  const selectedRegion = useUIStore((state) => state.selectedRegion)
  const setSelectedRegion = useUIStore((state) => state.setSelectedRegion)

  const { data: products, isLoading } = useQuery({
    queryKey: ['region-products', selectedRegion],
    queryFn: () => api.products.getByRegion(selectedRegion!),
    enabled: !!selectedRegion,
  })

  if (!selectedRegion) return null

  return (
    <div className="fixed top-4 right-4 z-10 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="max-h-[80vh] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <CardTitle className="text-lg">
                {t('title', { region: selectedRegion })}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedRegion(null)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </CardHeader>
        
        <CardContent className="overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4">
                {products.slice(0, 6).map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium text-sm">{product.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-muted px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-sm font-medium">
                          ${(product.price_cents / 100).toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.currency}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {products.length > 6 && (
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/shop?region=${selectedRegion}`}>
                      {t('viewAll')}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {t('noRegionProducts')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
