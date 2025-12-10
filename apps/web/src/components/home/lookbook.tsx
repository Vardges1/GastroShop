"use client"

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const lookbookItems = [
  {
    id: 1,
    title: "Cheese & Wine Pairing",
    description: "Perfect combinations for your next dinner party",
    image: "/images/lookbook-1.jpg",
    href: "/shop?tags=wine,cheese"
  },
  {
    id: 2,
    title: "Artisanal Charcuterie",
    description: "Cured meats and aged cheeses from Europe",
    image: "/images/lookbook-2.jpg",
    href: "/shop?tags=ham,cured"
  },
  {
    id: 3,
    title: "Holiday Collection",
    description: "Special selections for festive occasions",
    image: "/images/lookbook-3.jpg",
    href: "/shop?tags=holiday,special"
  }
]

export function Lookbook() {
  const t = useTranslations('home.lookbook')

  return (
    <section className="section-padding">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {lookbookItems.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg bg-muted">
              <div className="aspect-[4/5] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <h3 className="text-2xl font-bold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                  <Button asChild variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Link href={item.href}>
                      Explore Collection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
