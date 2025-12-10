"use client"

import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

export function CartSummary() {
  const t = useTranslations('cart.summary')
  const items = useCartStore((state) => state.items)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const getTotalPrice = useCartStore((state) => state.getTotalPrice)
  const currency = useUIStore((state) => state.currency)

  const totalItems = getTotalItems()
  const subtotal = getTotalPrice(currency)
  const shipping = subtotal > 10000 ? 0 : 2000 // Free shipping over $100
  const tax = Math.round(subtotal * 0.1) // 10% tax
  const total = subtotal + shipping + tax

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({totalItems} items)</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>{t('shipping')}</span>
            <span>
              {shipping === 0 ? 'Free' : formatPrice(shipping, currency)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>{t('tax')}</span>
            <span>{formatPrice(tax, currency)}</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>{t('total')}</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>
        
        <Button asChild className="w-full" size="lg">
          <Link href="/checkout">
            {t('checkout')}
          </Link>
        </Button>
        
        <div className="text-center">
          <Link href="/shop" className="text-sm text-muted-foreground hover:text-primary">
            Continue Shopping
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
