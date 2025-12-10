import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '../cart-store'
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

describe('CartStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useCartStore())
    act(() => {
      result.current.clearCart()
    })
  })

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 2)
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.id).toBe(1)
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('updates quantity when adding same product', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 1)
      result.current.addItem(mockProduct, 2)
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(3)
  })

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 1)
      result.current.removeItem(1)
    })

    expect(result.current.items).toHaveLength(0)
  })

  it('updates item quantity', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 1)
      result.current.updateQuantity(1, 5)
    })

    expect(result.current.items[0].quantity).toBe(5)
  })

  it('calculates total correctly', () => {
    const { result } = renderHook(() => useCartStore())
    
    const product2: Product = { ...mockProduct, id: 2, price_cents: 2000 }
    
    act(() => {
      result.current.addItem(mockProduct, 2) // 1000 * 2 = 2000
      result.current.addItem(product2, 1)     // 2000 * 1 = 2000
    })

    expect(result.current.getTotalPrice()).toBe(4000)
  })

  it('calculates total items correctly', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 2)
      result.current.addItem({ ...mockProduct, id: 2 }, 3)
    })

    expect(result.current.getTotalItems()).toBe(5)
  })

  it('gets item quantity', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 3)
    })

    expect(result.current.getItemQuantity(1)).toBe(3)
    expect(result.current.getItemQuantity(999)).toBe(0)
  })

  it('clears cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 1)
      result.current.clearCart()
    })

    expect(result.current.items).toHaveLength(0)
    expect(result.current.getTotalPrice()).toBe(0)
  })

  it('removes item when quantity is set to 0', () => {
    const { result } = renderHook(() => useCartStore())
    
    act(() => {
      result.current.addItem(mockProduct, 1)
      result.current.updateQuantity(1, 0)
    })

    expect(result.current.items).toHaveLength(0)
  })
})

