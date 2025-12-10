import { formatPrice, isValidEmail, getInitials } from '../utils'

describe('formatPrice', () => {
  it('formats price in RUB correctly', () => {
    expect(formatPrice(10000, 'RUB')).toContain('100')
    expect(formatPrice(10000, 'RUB')).toContain('₽')
  })

  it('formats price in USD correctly', () => {
    const result = formatPrice(10000, 'USD')
    expect(result).toContain('$')
  })

  it('formats price in EUR correctly', () => {
    const result = formatPrice(10000, 'EUR')
    expect(result).toContain('€')
  })

  it('handles zero price', () => {
    expect(formatPrice(0, 'RUB')).toContain('0')
  })

  it('handles large prices', () => {
    const result = formatPrice(1000000, 'RUB')
    expect(result).toContain('10')
  })
})

describe('isValidEmail', () => {
  it('validates correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('user+tag@example.com')).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('test@.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('getInitials', () => {
  it('returns initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Jane Smith')).toBe('JS')
  })

  it('handles single name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })

  it('handles multiple words', () => {
    expect(getInitials('John Michael Doe')).toBe('JD')
  })
})







