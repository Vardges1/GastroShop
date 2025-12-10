# GastroShop

A premium gastronomy e-commerce platform specializing in European cheeses and delicacies, featuring an AI-powered recommendation system and interactive origin mapping.

## Features

- **Minimalist UI**: Clean, monochrome design with large typography and generous spacing
- **AI Assistant**: Natural language product recommendations based on food pairing queries
- **Interactive Map**: Clickable European regions showing local products and information
- **Multi-currency Support**: RUB, USD, EUR with real-time conversion
- **Internationalization**: Russian and English language support
- **Payment Integration**: Multi-provider payment system with Mock, ЮKassa, and CloudPayments support
- **Analytics**: Event tracking and Prometheus metrics
- **Responsive Design**: Mobile-first approach with accessibility features

## Tech Stack

### Frontend
- **Next.js 15** with App Router - React framework with server-side rendering
- **TypeScript** - Type-safe JavaScript for better development experience
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - Modern component library built on Radix UI primitives
- **Zustand** - Lightweight state management for React applications
- **TanStack Query** - Powerful data synchronization for React
- **next-intl** - Internationalization library for Next.js applications
- **MapLibre GL JS** - Interactive vector maps for web applications
- **Lucide React** - Beautiful & consistent icon toolkit
- **Axios** - HTTP client for API communication
- **React Hook Form** - Performant forms with easy validation

### Backend
- **Go 1.22** with Gin framework - High-performance web framework
- **PostgreSQL 15** - Robust relational database with JSON support
- **JWT** authentication with refresh tokens - Secure stateless authentication
- **bcrypt** - Password hashing for security
- **golang-migrate** - Database migration tool for Go
- **Prometheus** - Metrics collection and monitoring
- **pq** - PostgreSQL driver for Go
- **golang-jwt** - JWT implementation for Go
- **golang.org/x/crypto** - Cryptographic functions

### Infrastructure & DevOps
- **Docker** and **docker-compose** - Containerization and orchestration
- **Nginx** - High-performance reverse proxy and load balancer
- **GitHub Actions** - CI/CD pipeline automation
- **Multi-stage Docker builds** - Optimized container images
- **Health checks** - Container health monitoring
- **Volume persistence** - Data persistence across container restarts

### Development Tools
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for code quality
- **Make** - Build automation for Go backend
- **pnpm** - Fast, disk space efficient package manager
- **Go modules** - Dependency management for Go

### Third-party Integrations
- **YooKassa** - Payment processing for Russian market
- **CloudPayments** - Alternative payment provider
- **Prometheus** - Application metrics and monitoring
- **PostgreSQL** - Primary database with advanced features

## Architecture Overview

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Go/Gin)      │◄──►│   (PostgreSQL)  │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Payment       │    │   Monitoring    │
│   Reverse Proxy │    │   Providers     │    │   (Prometheus)  │
│   Port: 80/443  │    │   (YooKassa)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **User Request** → Nginx → Next.js Frontend
2. **API Calls** → Nginx → Go Backend → PostgreSQL
3. **Authentication** → JWT tokens with refresh mechanism
4. **Payments** → External payment providers via webhooks
5. **Analytics** → Prometheus metrics collection

### Key Features Implementation
- **AI Assistant**: Rule-based recommendation system with natural language processing
- **Interactive Map**: MapLibre GL JS with GeoJSON data for European regions
- **Multi-currency**: Real-time conversion with user preference storage
- **Internationalization**: next-intl with Russian/English language support
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Technology Choices Rationale

#### Frontend Stack
- **Next.js 15**: Chosen for its App Router, server-side rendering, and excellent developer experience
- **TypeScript**: Provides type safety and better IDE support for large-scale applications
- **Tailwind CSS**: Enables rapid UI development with consistent design system
- **Zustand**: Lightweight alternative to Redux with minimal boilerplate
- **shadcn/ui**: Modern component library with accessibility built-in

#### Backend Stack
- **Go + Gin**: High performance, low memory footprint, excellent concurrency support
- **PostgreSQL**: ACID compliance, JSON support, and robust data integrity
- **JWT**: Stateless authentication suitable for microservices architecture
- **Prometheus**: Industry-standard metrics collection for monitoring

#### Infrastructure
- **Docker**: Consistent environments across development, staging, and production
- **Nginx**: Battle-tested reverse proxy with excellent performance characteristics
- **Multi-stage builds**: Optimized container images for production deployment

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Go 1.22+ (for local development)
- Node.js 18+ (for local development)
- pnpm (for package management)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GastroShop
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files
   cp apps/api/env.example apps/api/.env
   cp apps/web/env.example apps/web/.env
   
   # Edit the .env files with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Go API server on port 8080
   - Next.js web app on port 3000
   - Nginx reverse proxy on port 80

4. **Run database migrations**
   ```bash
   # Inside the API container
   docker-compose exec api make migrate-up
   ```

5. **Access the application**
   - Web app: http://localhost:3000
   - API: http://localhost:8080
   - API docs: http://localhost:8080/api

### Local Development

#### Backend (Go API)
```bash
cd apps/api

# Install dependencies
go mod download

# Run migrations
make migrate-up

# Start the server
make dev
```

#### Frontend (Next.js)
```bash
cd apps/web

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Project Structure

```
GastroShop/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities and API client
│   │   │   ├── store/       # Zustand stores
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   ├── api/                 # Go backend
│   │   ├── cmd/api/         # Application entry point
│   │   ├── internal/        # Internal packages
│   │   │   ├── config/      # Configuration
│   │   │   ├── database/    # Database connection
│   │   │   ├── handlers/    # HTTP handlers
│   │   │   ├── middleware/  # Middleware
│   │   │   ├── models/      # Data models
│   │   │   ├── repository/  # Data access layer
│   │   │   └── services/    # Business logic
│   │   └── go.mod
│   └── migrations/          # Database migrations
├── nginx/                   # Nginx configuration
├── docker-compose.yml       # Docker services
└── README.md
```

## API Endpoints

### Products
- `GET /api/products` - List products with filtering and pagination
- `GET /api/products/:slug` - Get product by slug
- `GET /api/regions/:code/products` - Get products by region

### Regions
- `GET /api/regions` - List all regions with GeoJSON data

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Cart & Orders
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart/:productId` - Remove item from cart
- `POST /api/orders` - Create order

### Payments
- `POST /api/payments/create` - Create payment with ЮKassa
- `GET /api/payments/status/:payment_id` - Get payment status
- `POST /api/webhooks/yookassa` - ЮKassa webhook handler

### Recommendations
- `POST /api/recommend` - Get product recommendations

### Analytics
- `POST /api/events` - Track user events
- `GET /metrics` - Prometheus metrics

## Environment Variables

### Backend (.env)
```env
# Database
DB_DSN=postgres://postgres:postgres@localhost:5432/gastroshop?sslmode=disable

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Payment Provider
PAYMENT_PROVIDER=yookassa
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key
YOOKASSA_TEST_MODE=true
YOOKASSA_WEBHOOK_URL=https://yourdomain.com/api/webhooks/yookassa

# CloudPayments (alternative)
CPUBLIC_ID=your-public-id
CAPI_SECRET=your-api-secret

# Server
PORT=8080
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```env
# Environment
NODE_ENV=development

# URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8080

# Map
NEXT_PUBLIC_MAP_STYLE=/map/style.json

# Currency
NEXT_PUBLIC_DEFAULT_CURRENCY=RUB
```

## Database Schema

### Products
- `id`, `slug`, `title`, `description`
- `price_cents`, `currency`, `tags[]`
- `region_code`, `images[]`, `in_stock`
- `created_at`

### Regions
- `code` (PK), `name`, `geojson_feature`

### Users
- `id`, `email`, `password_hash`, `role`
- `created_at`

### Orders
- `id`, `user_id`, `items` (JSONB)
- `amount_cents`, `currency`, `status`
- `payment_id`, `shipping_address` (JSONB)
- `created_at`

### Events
- `id`, `user_id`, `type`, `payload` (JSONB)
- `created_at`

## AI Assistant

The AI assistant uses a rule-based recommendation system that:
1. Parses natural language queries for food-related keywords
2. Extracts tags like "cheese", "pasta", "wine", "soft", "aged", etc.
3. Searches products by matching tags
4. Returns relevant product recommendations

Future enhancements can integrate with external ML APIs by implementing the `RecommendationProvider` interface.

## Payment Integration

Система поддерживает множественные платежные провайдеры:

### Провайдеры
- **Mock Provider** - для демонстрации и тестирования без юридических рисков
- **ЮKassa** - основной провайдер для РФ
- **CloudPayments** - альтернативный провайдер

### Конфигурация
```bash
# Выбор провайдера
PAYMENT_PROVIDER=mock  # mock|yookassa|cloudpayments

# ЮKassa настройки
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key
YOOKASSA_TEST_MODE=true
YOOKASSA_WEBHOOK_URL=https://yourdomain.com/api/webhooks/yookassa

# Mock настройки
MOCK_WEBHOOK_SECRET=mock-webhook-secret-key

# CloudPayments настройки
CPUBLIC_ID=your-public-id
CAPI_SECRET=your-api-secret
```

### API Endpoints
- `POST /api/payments/create` - создание платежа
- `GET /api/payments/status/{payment_id}` - статус платежа
- `POST /api/webhooks/yookassa` - обработка webhook

### Демонстрация
```bash
# Запуск демонстрации
./demo_payment_flow.sh

# Админ панель
http://localhost:3000/admin

# Mock checkout
http://localhost:3000/mock-checkout/{payment_id}
```

### Особенности
- ✅ Идемпотентность webhook
- ✅ HMAC-SHA256 валидация подписей
- ✅ Полное логирование операций
- ✅ Админка для тестирования
- ✅ Поддержка множественных провайдеров

## Development Commands

### Backend
```bash
# Run migrations
make migrate-up
make migrate-down

# Create new migration
make migrate-create name=migration_name

# Run tests
make test

# Start development server
make dev
```

### Frontend
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose up --build
```

## Payment Integration

GastroShop includes full integration with ЮKassa (Яндекс.Касса) for Russian market payments.

### Setup

1. **Register with ЮKassa**:
   - Create account at [yookassa.ru](https://yookassa.ru/)
   - Create a shop and get your Shop ID and Secret Key

2. **Configure Environment**:
   ```env
   PAYMENT_PROVIDER=yookassa
   YOOKASSA_SHOP_ID=your-shop-id
   YOOKASSA_SECRET_KEY=your-secret-key
   YOOKASSA_TEST_MODE=true
   YOOKASSA_WEBHOOK_URL=https://yourdomain.com/api/webhooks/yookassa
   ```

3. **Setup Webhook**:
   - In ЮKassa dashboard, add webhook URL: `https://yourdomain.com/api/webhooks/yookassa`
   - Select events: `payment.succeeded`, `payment.canceled`

### Testing

Use the provided test script:
```bash
./test_yookassa.sh
```

Or test manually with test cards:
- **Success**: 5555 5555 5555 4444
- **Decline**: 5555 5555 5555 4445
- **CVV**: 123
- **Expiry**: Any future date

### Features

- ✅ Real-time payment processing
- ✅ Webhook validation and security
- ✅ Payment status tracking
- ✅ Receipt generation for tax compliance
- ✅ Test and production modes
- ✅ Error handling and logging

For detailed integration guide, see [YOOKASSA_INTEGRATION.md](./YOOKASSA_INTEGRATION.md).

## Testing

### Backend Tests
```bash
cd apps/api
go test ./...
```

### Frontend Tests
```bash
cd apps/web
pnpm test
```

### E2E Tests
```bash
# Install Playwright
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e
```

## Deployment

### Production Build
```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
1. Set production environment variables
2. Configure SSL certificates for Nginx
3. Set up database backups
4. Configure monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
