"use client"

import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'

export function CheckoutSummary() {
  const t = useTranslations('checkout.summary')
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
      
      <CardContent className="space-y-6">
        {/* Items */}
        <div className="space-y-4">
          <h3 className="font-medium">{t('items')}</h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                  {item.product.images.length > 0 ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span className="text-lg">🧀</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {item.product.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t('quantity')}: {item.quantity}
                  </p>
                </div>
                
                <div className="text-sm font-medium">
                  {formatPrice(item.product.price_cents * item.quantity, item.product.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span>{t('subtotalPrefix')} ({totalItems} {t('itemsSuffix')})</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>{t('shipping')}</span>
            <span>
              {shipping === 0 ? t('freeShipping') : formatPrice(shipping, currency)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>{t('vat')}</span>
            <span>{formatPrice(tax, currency)}</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>{t('total')}</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">{t('safePayment')}</p>
          <p>
            {t('safePaymentDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
