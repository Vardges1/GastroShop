"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { useFavoritesStore } from '@/store/favorites-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { ShoppingCart, MapPin, Heart, Share2, HeartOff } from 'lucide-react'
import Link from 'next/link'
import type { Product } from '@/types'

interface ProductInfoProps {
  product: Product
}

export function ProductInfo({ product }: ProductInfoProps) {
  const t = useTranslations('product')
  const addItem = useCartStore((state) => state.addItem)
  const currency = useUIStore((state) => state.currency)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const isFavorite = useFavoritesStore((state) => state.isFavorite)
  const [quantity, setQuantity] = useState(1)
  
  const isInFavorites = isFavorite(product.id)

  const handleAddToCart = () => {
    addItem(product, quantity)
  }

  const price = formatPrice(product.price_cents, currency)

  return (
    <div className="space-y-6">
      {/* Title and Region */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
          <Badge variant="outline" className="ml-4">
            {product.region_code}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{t('fromRegion')} {product.region_code}</span>
        </div>
      </div>

      {/* Price and Stock */}
      <div className="space-y-2">
        <div className="text-3xl font-bold">{price}</div>
        <div className="flex items-center gap-2">
          <Badge variant={product.in_stock ? "default" : "destructive"}>
            {product.in_stock ? t('inStock') : t('outOfStock')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {product.currency}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h3 className="font-semibold">{t('description')}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <h3 className="font-semibold">{t('tags')}</h3>
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quantity and Add to Cart */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="quantity" className="text-sm font-medium">
            {t('quantity')}
          </label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10"
            >
              -
            </Button>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center border rounded-md h-10"
              min="1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10"
            >
              +
            </Button>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={handleAddToCart}
            disabled={!product.in_stock}
            className="flex-1"
            size="lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {t('addToCart')}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => toggleFavorite(product)}
            className={isInFavorites ? 'bg-red-50 border-red-200' : ''}
          >
            {isInFavorites ? (
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </Button>
          
          <Button variant="outline" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Origin Link */}
      <div className="pt-4 border-t">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/map?region=${product.region_code}&product=${product.slug}`}>
            <MapPin className="mr-2 h-4 w-4" />
            {t('viewOnMap')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
