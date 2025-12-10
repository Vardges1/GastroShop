"use client"

import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import type { Locale } from '@/types/index'

const locales: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
]

export function LocaleSwitcher() {
  const locale = useUIStore((state) => state.locale)
  const setLocale = useUIStore((state) => state.setLocale)

  const currentLocale = locales.find(l => l.code === locale) || locales[0]

  const switchLocale = () => {
    const currentIndex = locales.findIndex(l => l.code === locale)
    const nextIndex = (currentIndex + 1) % locales.length
    setLocale(locales[nextIndex].code)
  }

  return (
    <div className="flex items-center space-x-1">
      <Languages className="h-4 w-4" />
      <Button
        variant="ghost"
        size="sm"
        onClick={switchLocale}
        className="h-8 px-2"
      >
        {currentLocale.label}
      </Button>
    </div>
  )
}
