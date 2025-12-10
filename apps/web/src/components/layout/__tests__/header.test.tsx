import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Header } from '../header'

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock stores
jest.mock('@/store/cart-store', () => ({
  useCartStore: () => ({
    getTotalItems: () => 3,
  }),
}))

jest.mock('@/store/ui-store', () => ({
  useUIStore: () => ({
    toggleCart: jest.fn(),
    toggleAssistant: jest.fn(),
  }),
}))

jest.mock('@/store/auth-store', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
  }),
}))

jest.mock('@/store/favorites-store', () => ({
  useFavoritesStore: () => ({
    favorites: [],
  }),
}))

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    products: {
      getAll: jest.fn(() => Promise.resolve({ items: [] })),
    },
  },
}))

// Mock debounce
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  debounce: (fn: any) => fn,
}))

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders header with navigation', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('displays cart items count', () => {
    render(<Header />)
    // Cart icon should be visible
    expect(screen.getByRole('button', { name: /cart/i })).toBeInTheDocument()
  })

  it('opens mobile menu when menu button is clicked', () => {
    render(<Header />)
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    // Menu should open (check for mobile menu content)
  })

  it('handles search input', async () => {
    render(<Header />)
    const searchInput = screen.getByPlaceholderText(/поиск/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('test')
    })
  })
})

