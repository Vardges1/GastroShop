export interface Product {
  id: number
  slug: string
  title: string
  description?: string
  price_cents: number
  currency: string
  tags: string[]
  region_code: string
  images: string[]
  in_stock: boolean
  quantity?: number
  created_at?: string
}

export interface Region {
  code: string
  name: string
  geojson_feature: string
}

export interface OrderItem {
  product_id: number
  quantity: number
  price_cents: number
}

export interface Order {
  id: number
  user_id?: number
  items: OrderItem[]
  amount_cents: number
  currency: string
  status: string
  payment_id?: string
  shipping_address: Record<string, any>
  created_at: string
}

export interface User {
  id: number
  email: string
  role: string
  blocked?: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface ErrorResponse {
  error: string
  code?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface RecommendationRequest {
  query?: string
  tags?: string[]
}

export interface CreateOrderRequest {
  items: OrderItem[]
  shipping_address: Record<string, any>
}

export interface PaymentResponse {
  payment_url: string
  payment_id: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface EventPayload {
  type: string
  payload: Record<string, any>
}

export type Currency = 'RUB' | 'USD' | 'EUR'
export type Locale = 'en' | 'ru'
