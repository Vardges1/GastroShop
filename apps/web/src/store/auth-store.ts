import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken?: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      setAuth: (user: User, accessToken: string, refreshToken: string) => {
        // Save tokens to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken)
          localStorage.setItem('refresh_token', refreshToken)
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },
      
      setTokens: (accessToken: string, refreshToken?: string) => {
        // Save tokens to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken)
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken)
          }
        }
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
        }))
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      },
      
      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },
    }),
    {
      name: 'auth-storage',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore tokens from localStorage on hydration
        if (state && typeof window !== 'undefined') {
          const accessToken = localStorage.getItem('access_token')
          const refreshToken = localStorage.getItem('refresh_token')
          if (accessToken) {
            state.accessToken = accessToken
          }
          if (refreshToken) {
            state.refreshToken = refreshToken
          }
        }
      },
    }
  )
)
