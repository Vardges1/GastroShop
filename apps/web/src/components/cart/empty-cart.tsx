"use client"

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export function EmptyCart() {
  const t = useTranslations('cart.empty')

  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h2 className="text-2xl font-bold mb-4">{t('title')}</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        {t('subtitle')}
      </p>
      
      <Button asChild size="lg">
        <Link href="/shop">
          {t('cta')}
        </Link>
      </Button>
    </div>
  )
}
