import { create } from 'zustand'
import type { Currency, Locale } from '@/types'

interface UIStore {
  // Modals
  isAssistantOpen: boolean
  isCartOpen: boolean
  isSearchOpen: boolean
  
  // Settings
  currency: Currency
  locale: Locale
  
  // Map
  selectedRegion: string | null
  
  // Actions
  toggleAssistant: () => void
  toggleCart: () => void
  toggleSearch: () => void
  setCurrency: (currency: Currency) => void
  setLocale: (locale: Locale) => void
  setSelectedRegion: (region: string | null) => void
  closeAllModals: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  isAssistantOpen: false,
  isCartOpen: false,
  isSearchOpen: false,
  currency: 'RUB',
  locale: 'en',
  selectedRegion: null,
  
  // Actions
  toggleAssistant: () => set((state) => ({ 
    isAssistantOpen: !state.isAssistantOpen,
    isCartOpen: false,
    isSearchOpen: false,
  })),
  
  toggleCart: () => set((state) => ({ 
    isCartOpen: !state.isCartOpen,
    isAssistantOpen: false,
    isSearchOpen: false,
  })),
  
  toggleSearch: () => set((state) => ({ 
    isSearchOpen: !state.isSearchOpen,
    isAssistantOpen: false,
    isCartOpen: false,
  })),
  
  setCurrency: (currency: Currency) => set({ currency }),
  setLocale: (locale: Locale) => set({ locale }),
  setSelectedRegion: (region: string | null) => set({ selectedRegion: region }),
  
  closeAllModals: () => set({
    isAssistantOpen: false,
    isCartOpen: false,
    isSearchOpen: false,
  }),
}))
