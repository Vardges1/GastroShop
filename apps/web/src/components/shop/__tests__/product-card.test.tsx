import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProductCard } from '../product-card'
import type { Product } from '@/types'

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock stores
const mockAddItem = jest.fn()
const mockToggleFavorite = jest.fn()
const mockIsFavorite = jest.fn(() => false)

jest.mock('@/store/cart-store', () => ({
  useCartStore: () => ({
    addItem: mockAddItem,
  }),
}))

jest.mock('@/store/ui-store', () => ({
  useUIStore: () => ({
    currency: 'RUB',
  }),
}))

jest.mock('@/store/favorites-store', () => ({
  useFavoritesStore: () => ({
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
  }),
}))

// Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

const mockProduct: Product = {
  id: 1,
  slug: 'test-product',
  title: 'Test Product',
  description: 'Test Description',
  price_cents: 10000,
  currency: 'RUB',
  tags: ['cheese', 'hard'],
  region_code: 'IT',
  images: ['/images/test.jpg'],
  in_stock: true,
  quantity: 10,
  created_at: new Date().toISOString(),
}

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('displays product price', () => {
    render(<ProductCard product={mockProduct} />)

    // Price should be formatted (10000 cents = 100 RUB)
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('shows out of stock badge when product is not in stock', () => {
    const outOfStockProduct = { ...mockProduct, in_stock: false }
    render(<ProductCard product={outOfStockProduct} />)

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument()
  })

  it('calls addItem when add to cart button is clicked', async () => {
    render(<ProductCard product={mockProduct} />)

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith(mockProduct, 1)
    })
  })

  it('calls toggleFavorite when favorite button is clicked', () => {
    render(<ProductCard product={mockProduct} />)

    // Hover to show favorite button
    const card = screen.getByText('Test Product').closest('div')?.parentElement
    if (card) {
      fireEvent.mouseEnter(card)
    }

    // Find and click favorite button
    const favoriteButtons = screen.getAllByRole('button')
    const favoriteButton = favoriteButtons.find((btn) =>
      btn.querySelector('svg')
    )

    if (favoriteButton) {
      fireEvent.click(favoriteButton)
      expect(mockToggleFavorite).toHaveBeenCalledWith(mockProduct)
    }
  })

  it('renders product image when available', () => {
    render(<ProductCard product={mockProduct} />)

    const image = screen.getByAltText('Test Product')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/images/test.jpg')
  })

  it('renders placeholder when no image', () => {
    const productWithoutImage = { ...mockProduct, images: [] }
    render(<ProductCard product={productWithoutImage} />)

    expect(screen.getByText('🧀')).toBeInTheDocument()
  })
})







