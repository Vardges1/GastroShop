"use client"

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CampaignBanner() {
  const t = useTranslations('home.campaign')

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container">
        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t('title')}
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Discover our premium selection with free shipping on qualifying orders
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
            <Link href="/shop">
              {t('cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
