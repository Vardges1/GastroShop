import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: (currency?: string) => number
  getItemQuantity: (productId: number) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.product.id === product.id)
          
          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            }
          }
          
          return {
            items: [...state.items, { product, quantity }],
          }
        })
      },
      
      removeItem: (productId: number) => {
        set((state) => ({
          items: state.items.filter(item => item.product.id !== productId),
        }))
      },
      
      updateQuantity: (productId: number, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.product.id === productId
              ? { ...item, quantity }
              : item
          ),
        }))
      },
      
      clearCart: () => {
        set({ items: [] })
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
      
      getTotalPrice: (currency = 'RUB') => {
        return get().items.reduce((total, item) => {
          const price = item.product.currency === currency 
            ? item.product.price_cents 
            : convertCurrency(item.product.price_cents, item.product.currency, currency)
          return total + (price * item.quantity)
        }, 0)
      },
      
      getItemQuantity: (productId: number) => {
        const item = get().items.find(item => item.product.id === productId)
        return item ? item.quantity : 0
      },
    }),
    {
      name: 'cart-storage',
      version: 1,
    }
  )
)

// Simple currency conversion function
function convertCurrency(priceCents: number, fromCurrency: string, toCurrency: string): number {
  const rates: Record<string, Record<string, number>> = {
    RUB: { USD: 0.011, EUR: 0.01 },
    USD: { RUB: 90, EUR: 0.92 },
    EUR: { RUB: 100, USD: 1.09 },
  }
  
  if (fromCurrency === toCurrency) return priceCents
  const rate = rates[fromCurrency]?.[toCurrency] || 1
  return Math.round(priceCents * rate)
}
