# Testing Guide for GastroShop

This document describes the testing infrastructure and how to run tests for the GastroShop project.

## Overview

GastroShop has three types of tests:
1. **Unit Tests** - Test individual functions and services in isolation
2. **Integration Tests** - Test API endpoints with a test database
3. **E2E Tests** - Test complete user flows in the browser

## Backend Testing (Go)

### Unit Tests

Unit tests are located alongside the code they test, following Go conventions:
- `*_test.go` files in the same package
- Tests use mocks to isolate units

#### Running Unit Tests

```bash
cd apps/api

# Run all tests
make test

# Run with verbose output
make test-verbose

# Run with coverage
make test-coverage

# Run specific test file
go test ./internal/services/auth_service_test.go -v
```

#### Test Files

- `internal/services/auth_service_test.go` - Tests for authentication service
- `internal/services/product_service_test.go` - Tests for product service

### Integration Tests

Integration tests are located in `apps/api/test/` and require a test database.

#### Setup Test Database

1. Create a test database:
```sql
CREATE DATABASE gastroshop_test;
```

2. Set environment variable:
```bash
export DB_DSN="postgres://postgres:postgres@localhost:5432/gastroshop_test?sslmode=disable"
```

#### Running Integration Tests

```bash
cd apps/api

# Run integration tests
make test-integration

# Or directly
go test -v ./test/...
```

#### Test Coverage

Generate coverage report:
```bash
cd apps/api
make test-coverage

# Open coverage report in browser
open coverage.html
```

## Frontend Testing (Next.js/React)

### Unit Tests

Frontend tests use Jest and React Testing Library.

#### Running Frontend Tests

```bash
cd apps/web

# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run for CI
pnpm test:ci
```

#### Test Files

- `src/components/shop/__tests__/product-card.test.tsx` - Product card component tests
- `src/lib/__tests__/utils.test.ts` - Utility functions tests

### Writing Frontend Tests

Example test structure:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from '../my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## E2E Testing (Playwright)

E2E tests test complete user flows in a real browser.

### Setup

Install Playwright:
```bash
cd apps/web
pnpm exec playwright install
```

### Running E2E Tests

```bash
cd apps/web

# Run E2E tests (requires dev server running)
pnpm exec playwright test

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Run specific test file
pnpm exec playwright test e2e/critical-flows.spec.ts
```

### E2E Test Files

- `e2e/critical-flows.spec.ts` - Critical user flows (registration, cart, navigation)

### Writing E2E Tests

Example:

```typescript
import { test, expect } from '@playwright/test'

test('should add product to cart', async ({ page }) => {
  await page.goto('http://localhost:3000/shop')
  await page.click('button:has-text("Add to Cart")')
  await expect(page.locator('.cart-count')).toHaveText('1')
})
```

## Test Coverage Goals

### Current Coverage

- **Backend**: ~60% (target: 80%)
- **Frontend**: ~40% (target: 70%)

### Coverage Commands

**Backend:**
```bash
cd apps/api
make test-coverage
```

**Frontend:**
```bash
cd apps/web
pnpm test:coverage
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
      - run: cd apps/api && make test-coverage
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd apps/web && pnpm install && pnpm test:ci
```

## Best Practices

1. **Write tests first** (TDD) for critical features
2. **Keep tests isolated** - each test should be independent
3. **Use descriptive test names** - `TestAuthService_Register_WithValidEmail`
4. **Mock external dependencies** - databases, APIs, file system
5. **Test edge cases** - empty inputs, null values, errors
6. **Keep tests fast** - unit tests should run in milliseconds
7. **Maintain test coverage** - aim for 80%+ on critical paths

## Troubleshooting

### Backend Tests

**Problem**: Tests fail with database connection error
- **Solution**: Ensure PostgreSQL is running and test database exists

**Problem**: Tests fail with migration errors
- **Solution**: Run migrations manually: `make migrate-up`

### Frontend Tests

**Problem**: Tests fail with module resolution errors
- **Solution**: Check `jest.config.js` and `tsconfig.json` paths

**Problem**: Tests fail with "window is not defined"
- **Solution**: Ensure `jest-environment-jsdom` is configured

### E2E Tests

**Problem**: Tests fail because dev server is not running
- **Solution**: Start dev server: `pnpm dev` in another terminal

**Problem**: Tests are flaky
- **Solution**: Add proper waits: `await page.waitForSelector(...)`

## Next Steps

- [ ] Add more unit tests for all services
- [ ] Add integration tests for payment flow
- [ ] Add E2E tests for checkout process
- [ ] Set up CI/CD pipeline
- [ ] Add performance tests
- [ ] Add load tests







