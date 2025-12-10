"use client"

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { debounce } from '@/lib/utils'

export function SearchBar() {
  const t = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('query') || '')

  const debouncedSearch = debounce((searchQuery: string) => {
    const params = new URLSearchParams(searchParams)
    if (searchQuery) {
      params.set('query', searchQuery)
    } else {
      params.delete('query')
    }
    params.delete('page') // Reset to first page
    router.push(`/shop?${params.toString()}`)
  }, 300)

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  const handleClear = () => {
    setQuery('')
  }

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={`${t('search')} products...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-10"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
