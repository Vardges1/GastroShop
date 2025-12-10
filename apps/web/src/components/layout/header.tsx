"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, ShoppingCart, Menu, X, User, Heart, Shield, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/store/cart-store'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { useFavoritesStore } from '@/store/favorites-store'
import { api } from '@/lib/api'
import { debounce } from '@/lib/utils'
import type { Product } from '@/types'

export function Header() {
  const t = useTranslations()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const toggleCart = useUIStore((state) => state.toggleCart)
  const toggleAssistant = useUIStore((state) => state.toggleAssistant)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const favorites = useFavoritesStore((state) => state.favorites)

  const cartItemsCount = getTotalItems()
  const favoritesCount = favorites.length

  // Debounced search for suggestions
  const fetchSuggestions = debounce(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await api.products.getAll({
        query: query.trim(),
        page_size: 20, // Получаем больше результатов для фильтрации
        page: 1,
      })
      const queryLower = query.trim().toLowerCase()
      
      // Фильтруем только товары, которые начинаются с введенного текста
      const filteredItems = (response.items || []).filter(product => 
        product.title.toLowerCase().startsWith(queryLower)
      )
      
      // Сортировка по алфавиту
      const sortedItems = filteredItems.sort((a, b) => 
        a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' })
      ).slice(0, 5) // Берем только первые 5 результатов
      
      setSearchSuggestions(sortedItems)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Search suggestions error:', error)
      setSearchSuggestions([])
    }
  }, 300)

  useEffect(() => {
    if (searchQuery) {
      fetchSuggestions(searchQuery)
    } else {
      setSearchSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchQuery])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/shop?query=${encodeURIComponent(searchQuery)}`)
      setIsSearchOpen(false)
      setSearchQuery('')
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (product: Product) => {
    router.push(`/shop/${product.slug}`)
    setSearchQuery('')
    setShowSuggestions(false)
    setIsSearchOpen(false)
  }

  const handleSuggestionSearch = (query: string) => {
    router.push(`/shop?query=${encodeURIComponent(query)}`)
    setSearchQuery('')
    setShowSuggestions(false)
    setIsSearchOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur [backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded bg-primary" />
          <span className="text-xl font-bold">GastroShop</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            {t('navigation.home')}
          </Link>
          <Link href="/shop" className="text-sm font-medium hover:text-primary transition-colors">
            {t('navigation.shop')}
          </Link>
          <Link href="/map" className="text-sm font-medium hover:text-primary transition-colors">
            {t('navigation.map')}
          </Link>
          <Link href="/assistant" className="text-sm font-medium hover:text-primary transition-colors">
            {t('navigation.assistant')}
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearch} className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                className="w-48 h-9"
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-5 w-5" />
              </Button>
            </form>
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSuggestionClick(product)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors flex items-center gap-3"
                    >
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {((product.price_cents || 0) / 100).toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSuggestionSearch(searchQuery)}
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors text-sm font-medium text-primary border-t mt-1 pt-2"
                  >
                    Показать все результаты для "{searchQuery}"
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Favorites - скрыто для админа */}
          {user?.role !== 'admin' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/account')}
              className="relative"
              title={t('navigation.favorites')}
            >
              <Heart className={`h-5 w-5 ${favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </Button>
          )}

          {/* Cart - скрыто для админа */}
          {user?.role !== 'admin' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/cart')}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          )}

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              {user?.role === 'admin' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/admin')}
                  title="Админ панель"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Shield className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/account')}
                >
                  <User className="h-5 w-5" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                title={t('logout')}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/account')}
            >
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/"
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.home')}
              </Link>
              <Link
                href="/shop"
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.shop')}
              </Link>
              <Link
                href="/map"
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.map')}
              </Link>
              <Link
                href="/assistant"
                className="text-sm font-medium hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('navigation.assistant')}
              </Link>
            </nav>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
              </div>
              <div className="flex items-center space-x-2">
                {/* Favorites - скрыто для админа */}
                {user?.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push('/account')
                      setIsMobileMenuOpen(false)
                    }}
                    className="relative"
                    title={t('navigation.favorites')}
                  >
                    <Heart className={`h-5 w-5 ${favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {favoritesCount}
                      </span>
                    )}
                  </Button>
                )}
                {/* Cart - скрыто для админа */}
                {user?.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push('/cart')
                      setIsMobileMenuOpen(false)
                    }}
                    className="relative"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Button>
                )}
                {user?.role === 'admin' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push('/admin')
                      setIsMobileMenuOpen(false)
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push('/account')
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Auth */}
            {isAuthenticated && (
              <div className="pt-4 border-t space-y-2">
                {user?.role === 'admin' && (
                  <Button
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      router.push('/admin')
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Админ панель
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                    router.push('/');
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
