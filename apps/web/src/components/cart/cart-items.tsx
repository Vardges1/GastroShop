"use client"

import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
import { Minus, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function CartItems() {
  const t = useTranslations('cart')
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('empty.title')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Link href={`/shop/${item.product.slug}`} className="shrink-0">
            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
              {item.product.images.length > 0 ? (
                <Image
                  src={item.product.images[0]}
                  alt={item.product.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span className="text-2xl">🧀</span>
                </div>
              )}
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link href={`/shop/${item.product.slug}`}>
              <h3 className="font-medium hover:text-primary transition-colors cursor-pointer">
                {item.product.title}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground truncate">
              {item.product.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {item.product.region_code}
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {item.product.tags.slice(0, 2).join(', ')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => {
                  const newQuantity = parseInt(e.target.value) || 1
                  updateQuantity(item.product.id, newQuantity)
                }}
                className="w-16 text-center"
                min="1"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-right min-w-[100px]">
              <div className="font-medium">
                {formatPrice(item.product.price_cents * item.quantity, item.product.currency)}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatPrice(item.product.price_cents, item.product.currency)} each
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.product.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
