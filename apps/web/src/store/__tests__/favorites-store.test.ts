import { renderHook, act } from '@testing-library/react'
import { useFavoritesStore } from '../favorites-store'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 1,
  slug: 'test-product',
  title: 'Test Product',
  description: 'Test',
  price_cents: 1000,
  currency: 'RUB',
  tags: [],
  region_code: 'IT',
  images: [],
  in_stock: true,
  quantity: 10,
  created_at: new Date().toISOString(),
}

describe('FavoritesStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useFavoritesStore())
    act(() => {
      // Clear favorites by removing all
      result.current.favorites.forEach(fav => {
        result.current.removeFavorite(fav.id)
      })
    })
  })

  it('adds product to favorites', () => {
    const { result } = renderHook(() => useFavoritesStore())
    
    act(() => {
      result.current.toggleFavorite(mockProduct)
    })

    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].id).toBe(1)
  })

  it('removes product from favorites when toggled again', () => {
    const { result } = renderHook(() => useFavoritesStore())
    
    act(() => {
      result.current.toggleFavorite(mockProduct)
      result.current.toggleFavorite(mockProduct)
    })

    expect(result.current.favorites).toHaveLength(0)
  })

  it('checks if product is in favorites', () => {
    const { result } = renderHook(() => useFavoritesStore())
    
    act(() => {
      result.current.toggleFavorite(mockProduct)
    })

    expect(result.current.isFavorite(1)).toBe(true)
    expect(result.current.isFavorite(999)).toBe(false)
  })

  it('handles multiple products', () => {
    const { result } = renderHook(() => useFavoritesStore())
    
    const product2: Product = { ...mockProduct, id: 2 }
    
    act(() => {
      result.current.toggleFavorite(mockProduct)
      result.current.toggleFavorite(product2)
    })

    expect(result.current.favorites).toHaveLength(2)
  })
})

