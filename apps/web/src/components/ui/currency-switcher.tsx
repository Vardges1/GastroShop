"use client"

import { Button } from '@/components/ui/button'
import { DollarSign } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import type { Currency } from '@/types/index'

const currencies: { code: Currency; symbol: string; label: string }[] = [
  { code: 'RUB', symbol: '₽', label: 'RUB' },
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
]

export function CurrencySwitcher() {
  const currency = useUIStore((state) => state.currency)
  const setCurrency = useUIStore((state) => state.setCurrency)

  const currentCurrency = currencies.find(c => c.code === currency) || currencies[0]

  const switchCurrency = () => {
    const currentIndex = currencies.findIndex(c => c.code === currency)
    const nextIndex = (currentIndex + 1) % currencies.length
    setCurrency(currencies[nextIndex].code)
  }

  return (
    <div className="flex items-center space-x-1">
      <DollarSign className="h-4 w-4" />
      <Button
        variant="ghost"
        size="sm"
        onClick={switchCurrency}
        className="h-8 px-2"
      >
        {currentCurrency.symbol} {currentCurrency.label}
      </Button>
    </div>
  )
}
