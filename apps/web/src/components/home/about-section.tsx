"use client"

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function AboutSection() {
  const t = useTranslations('home.about')

  return (
    <section className="section-padding bg-muted/30">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('subtitle')}
            </p>
            <p className="text-muted-foreground">
              {t('description')}
            </p>
            <Button asChild size="lg">
              <Link href="/about">
                {t('learnMore')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          
          <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">🧀</span>
              </div>
              <h3 className="text-xl font-semibold">{t('qualityAssured')}</h3>
              <p className="text-muted-foreground">
                {t('qualityDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
