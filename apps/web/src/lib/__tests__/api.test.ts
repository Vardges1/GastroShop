import { api } from '../api'
import type { Product } from '@/types'

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn((url: string) => {
      if (url.includes('/products')) {
        return Promise.resolve({
          data: {
            items: [
              { id: 1, title: 'Product 1' },
              { id: 2, title: 'Product 2' },
            ],
            total: 2,
            page: 1,
            page_size: 10,
          },
        })
      }
      return Promise.resolve({ data: {} })
    }),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}))

describe('API Client', () => {
  it('fetches products', async () => {
    const response = await api.products.getAll({})
    expect(response.items).toBeDefined()
    expect(Array.isArray(response.items)).toBe(true)
  })

  it('fetches products with filters', async () => {
    const response = await api.products.getAll({
      query: 'cheese',
      page: 1,
      page_size: 20,
    })
    expect(response.items).toBeDefined()
  })

  it('fetches product by slug', async () => {
    const product = await api.products.getBySlug('test-product')
    expect(product).toBeDefined()
  })
})

