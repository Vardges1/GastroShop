import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'

interface FavoritesStore {
  favorites: Product[]
  addFavorite: (product: Product) => void
  removeFavorite: (productId: number) => void
  isFavorite: (productId: number) => boolean
  toggleFavorite: (product: Product) => void
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (product) => {
        set((state) => {
          if (state.favorites.find(f => f.id === product.id)) {
            return state
          }
          return {
            favorites: [...state.favorites, product],
          }
        })
      },
      
      removeFavorite: (productId) => {
        set((state) => ({
          favorites: state.favorites.filter(f => f.id !== productId),
        }))
      },
      
      isFavorite: (productId) => {
        return get().favorites.some(f => f.id === productId)
      },
      
      toggleFavorite: (product) => {
        const isFavorite = get().isFavorite(product.id)
        if (isFavorite) {
          get().removeFavorite(product.id)
        } else {
          get().addFavorite(product)
        }
      },
    }),
    {
      name: 'favorites-storage',
      version: 1,
    }
  )
)




























