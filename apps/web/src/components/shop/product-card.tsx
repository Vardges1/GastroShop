"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { useFavoritesStore } from '@/store/favorites-store'
import { formatPrice } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { ShoppingCart, MapPin, Heart } from 'lucide-react'
import { getCountryFlag } from '@/lib/flags'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations()
  const addItem = useCartStore((state) => state.addItem)
  const currency = useUIStore((state) => state.currency)
  const { toggleFavorite, isFavorite } = useFavoritesStore()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  
  const isInFavorites = isFavorite(product.id)
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product)
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsAdding(true)
    addItem(product, 1)
    
    toast({
      title: product.title,
      description: t('product.addedToCartToast'),
    })
    
    setTimeout(() => setIsAdding(false), 500)
  }

  const price = formatPrice(product.price_cents, currency)

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link href={`/shop/${product.slug}`}>
        <div className="aspect-square relative overflow-hidden bg-muted">
          <button
            onClick={handleToggleFavorite}
            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
          >
            <Heart className={`h-5 w-5 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
          </button>
          {product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🧀</span>
            </div>
          )}
          
          {!product.in_stock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                {t('product.outOfStock')}
              </Badge>
            </div>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {product.title}
            </h3>
            <Badge variant="outline" className="ml-2 shrink-0">
              {product.region_code}
            </Badge>
          </div>
          
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-lg">{getCountryFlag(product.region_code)}</span>
            <span>{t('product.fromRegion')} {product.region_code}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 flex-1">
          {product.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xl font-bold">
            {price}
          </div>
          
          <Button
            onClick={handleAddToCart}
            disabled={!product.in_stock || isAdding}
            size="sm"
            className={`transition-all ${isAdding ? 'scale-110 bg-green-500' : ''}`}
          >
            <ShoppingCart className={`h-4 w-4 mr-2 transition-transform ${isAdding ? 'rotate-[-45deg] scale-125' : ''}`} />
            {isAdding ? t('product.addedToCart') : t('product.addToCart')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
