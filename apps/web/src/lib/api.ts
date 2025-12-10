import axios from 'axios'
import type {
  Product,
  Region,
  Order,
  User,
  PaginatedResponse,
  ErrorResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RecommendationRequest,
  CreateOrderRequest,
  PaymentResponse,
  EventPayload,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token } = response.data
          localStorage.setItem('access_token', access_token)
          
          // Retry the original request
          error.config.headers.Authorization = `Bearer ${access_token}`
          return apiClient.request(error.config)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const api = {
  // Products
  products: {
    getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<Product>> => {
      const response = await apiClient.get('/api/products', { params })
      return response.data
    },
    
    getBySlug: async (slug: string): Promise<Product | null> => {
      try {
        const response = await apiClient.get(`/api/products/${slug}`)
        return response.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    
    getByRegion: async (regionCode: string): Promise<Product[]> => {
      const response = await apiClient.get(`/api/regions/${regionCode}/products`)
      return response.data
    },
    
    getByTags: async (tags: string[]): Promise<Product[]> => {
      const response = await apiClient.get('/api/products', { 
        params: { tags: tags.join(',') } 
      })
      return response.data.data || []
    },
  },

  // Regions
  regions: {
    getAll: async (): Promise<Region[]> => {
      const response = await apiClient.get('/api/regions')
      return response.data
    },
  },

  // Auth
  auth: {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
      const response = await apiClient.post('/api/auth/login', data)
      return response.data
    },
    
    register: async (data: RegisterRequest): Promise<User> => {
      const response = await apiClient.post('/api/auth/register', data)
      return response.data
    },
    
    refresh: async (refreshToken: string): Promise<{ access_token: string }> => {
      const response = await apiClient.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      })
      return response.data
    },
  },

  // Recommendations
  recommendations: {
    get: async (data: RecommendationRequest): Promise<Product[]> => {
      const response = await apiClient.post('/api/recommend', data)
      return response.data
    },
  },

  // Orders
  orders: {
    getAll: async (): Promise<Order[]> => {
      const response = await apiClient.get('/api/orders')
      return response.data
    },
    
    create: async (data: CreateOrderRequest): Promise<Order> => {
      const response = await apiClient.post('/api/orders', data)
      return response.data
    },
    
    getById: async (id: number): Promise<Order> => {
      const response = await apiClient.get(`/api/orders/${id}`)
      return response.data
    },
  },

  // Cart (simplified - in production, you'd have a proper cart API)
  cart: {
    get: async (): Promise<any[]> => {
      const response = await apiClient.get('/api/cart')
      return response.data.items || []
    },
    
    add: async (productId: number, quantity: number): Promise<void> => {
      await apiClient.post('/api/cart', { product_id: productId, quantity })
    },
    
    remove: async (productId: number): Promise<void> => {
      await apiClient.delete(`/api/cart/${productId}`)
    },
  },

  // Orders
  orders: {
    create: async (data: CreateOrderRequest): Promise<Order> => {
      const response = await apiClient.post('/api/orders', data)
      return response.data
    },
    
    getById: async (id: number): Promise<Order> => {
      const response = await apiClient.get(`/api/orders/${id}`)
      return response.data
    },
  },

  // Payments
  payments: {
    create: async (orderId: number): Promise<PaymentResponse> => {
      const response = await apiClient.post('/api/payments/create', { 
        order_id: orderId 
      })
      return response.data
    },
    
    getStatus: async (paymentId: string): Promise<{ id: string; status: string; amount: { value: string; currency: string } }> => {
      const response = await apiClient.get(`/api/payments/status/${paymentId}`)
      return response.data
    },
    
    mockComplete: async (paymentId: string): Promise<{ message: string; payment_id: string; order_id: number }> => {
      const response = await apiClient.post('/api/payments/mock/complete', { payment_id: paymentId })
      return response.data
    },
  },

  // Events
  events: {
    track: async (data: EventPayload): Promise<void> => {
      await apiClient.post('/api/events', data)
    },
  },

  // AI Assistant
  ai: {
    chat: async (message: string, conversationHistory?: Array<{ role: string; content: string }>): Promise<{
      message: string
      products?: Product[]
      has_products: boolean
    }> => {
      const response = await apiClient.post('/api/ai/chat', {
        message,
        conversation_history: conversationHistory || [],
      })
      return response.data
    },
  },

  // Admin
  admin: {
    products: {
      getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<Product>> => {
        const response = await apiClient.get('/api/admin/products', { params })
        return response.data
      },
      
      getById: async (id: number): Promise<Product> => {
        const response = await apiClient.get(`/api/admin/products/${id}`)
        return response.data
      },
      
      create: async (product: {
        slug: string
        title: string
        description?: string
        price_cents: number
        currency?: string
        tags?: string[]
        region_code?: string
        images?: string[]
        quantity?: number
      }): Promise<Product> => {
        const response = await apiClient.post('/api/admin/products', product)
        return response.data
      },
      
      update: async (id: number, product: Partial<Product>): Promise<Product> => {
        const response = await apiClient.put(`/api/admin/products/${id}`, product)
        return response.data
      },
      
      updateQuantity: async (id: number, quantity: number): Promise<Product> => {
        const response = await apiClient.patch(`/api/admin/products/${id}/quantity`, { quantity })
        return response.data
      },
      
      delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/admin/products/${id}`)
      },
    },
    
    orders: {
      getAll: async (): Promise<Order[]> => {
        const response = await apiClient.get('/api/admin/orders')
        return response.data
      },
      
      updateStatus: async (id: number, status: string): Promise<Order> => {
        const response = await apiClient.patch(`/api/admin/orders/${id}/status`, { status })
        return response.data
      },
    },
    
    users: {
      getAll: async (): Promise<User[]> => {
        const response = await apiClient.get('/api/admin/users')
        return response.data
      },
      
      updateRole: async (id: number, role: string): Promise<User> => {
        const response = await apiClient.patch(`/api/admin/users/${id}/role`, { role })
        return response.data
      },
      
      updateBlocked: async (id: number, blocked: boolean): Promise<User> => {
        const response = await apiClient.patch(`/api/admin/users/${id}/blocked`, { blocked })
        return response.data
      },
    },
    
    statistics: {
      get: async (params?: { start_date?: string; end_date?: string }): Promise<{
        total_revenue: number
        order_count: number
        avg_order_value: number
        top_products: Array<{ ProductID: number; Quantity: number; Product: Product }>
        sales_by_day: Array<{ date: string; amount: number }>
      }> => {
        const response = await apiClient.get('/api/admin/statistics', { params })
        return response.data
      },
    },
  },
}

export default api
