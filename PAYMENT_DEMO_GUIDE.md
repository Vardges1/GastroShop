# Демонстрация платежной системы GastroShop

## Обзор

Реализована полноценная платежная система с поддержкой:
- **Mock-провайдера** для демонстрации без юридических рисков
- **ЮKassa** для реальных платежей
- **CloudPayments** как альтернативный провайдер

## Архитектура

### Backend (Go)
- **PaymentService** - основной сервис с поддержкой множественных провайдеров
- **PaymentRepository** - работа с БД платежей
- **Webhook обработка** с идемпотентностью и валидацией подписей
- **Логирование** всех операций для отладки

### Frontend (Next.js)
- **Mock Checkout** - тестовая страница оплаты
- **Admin Panel** - админка для тестирования
- **Success Page** - страница результата оплаты

## Конфигурация

### Environment Variables (.env)
```bash
# Провайдер платежей (mock|yookassa|cloudpayments)
PAYMENT_PROVIDER=mock

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

## API Endpoints

### Создание платежа
```http
POST /api/payments/create
Content-Type: application/json

{
  "order_id": 1,
  "amount": 10000,
  "currency": "RUB",
  "description": "Заказ #1"
}
```

**Response:**
```json
{
  "payment_id": "mock_1_1703123456",
  "checkout_url": "http://localhost:3000/mock-checkout/mock_1_1703123456"
}
```

### Webhook обработка
```http
POST /api/webhooks/yookassa
Content-Type: application/json
X-Signature: <HMAC-SHA256-signature>

{
  "event": "payment.succeeded",
  "id": "evt_1234567890",
  "object": {
    "id": "mock_1_1703123456",
    "status": "succeeded",
    "amount": {
      "value": "100.00",
      "currency": "RUB"
    },
    "metadata": {
      "order_id": 1
    }
  }
}
```

### Статус платежа
```http
GET /api/payments/status/{payment_id}
```

## Сценарии демонстрации

### Сценарий A: Успешная оплата

1. **Создание заказа**
   ```bash
   curl -X POST http://localhost:8080/api/orders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "items": [{"product_id": 1, "quantity": 2}],
       "shipping_address": {"city": "Москва", "address": "ул. Примерная, 1"}
     }'
   ```

2. **Создание платежа**
   ```bash
   curl -X POST http://localhost:8080/api/payments/create \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": 1,
       "amount": 10000,
       "currency": "RUB"
     }'
   ```

3. **Переход на checkout**
   - Открыть `checkout_url` из ответа
   - Нажать "✅ Успешная оплата"

4. **Проверка результата**
   - Заказ переходит в статус `paid`
   - Платеж получает статус `paid`
   - Логи показывают обработку webhook

### Сценарий B: Идемпотентность

1. **Повторная отправка webhook**
   ```bash
   # Отправить тот же webhook несколько раз
   curl -X POST http://localhost:8080/api/webhooks/yookassa \
     -H "Content-Type: application/json" \
     -H "X-Signature: <same-signature>" \
     -d '<same-payload>'
   ```

2. **Проверка логов**
   - Первый webhook: "Webhook processed successfully"
   - Повторные: "Webhook event evt_... already processed, skipping"

### Сценарий C: Отмена платежа

1. **Создание платежа** (как в сценарии A)
2. **Нажатие "❌ Отменить оплату"**
3. **Проверка статусов**
   - Платеж: `canceled`
   - Заказ: `canceled`

## Админ панель

### Доступ
- URL: `http://localhost:3000/admin`
- Функции:
  - Просмотр всех платежей и заказов
  - Ручная отправка webhook
  - Тестирование различных сценариев

### Тестирование webhook
1. Ввести Payment ID
2. Нажать "Отправить успешный webhook" или "Отправить отмененный webhook"
3. Проверить изменения в таблицах

## Безопасность

### Валидация подписей
- **HMAC-SHA256** для всех webhook
- Секретный ключ из environment variables
- Проверка подписи перед обработкой

### Идемпотентность
- Проверка `webhook_event_id` в БД
- Предотвращение дублирования операций
- Логирование пропущенных дубликатов

### Логирование
- Полное тело webhook записывается в лог
- Результат обработки логируется
- Ошибки валидации записываются

## База данных

### Таблица payments
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status VARCHAR(50) NOT NULL DEFAULT 'awaiting_payment',
    provider VARCHAR(50) NOT NULL,
    checkout_url TEXT,
    webhook_event_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Индексы
- `idx_payments_payment_id` - быстрый поиск по payment_id
- `idx_payments_order_id` - связь с заказами
- `idx_payments_status` - фильтрация по статусу
- `idx_payments_webhook_event_id` - проверка идемпотентности

## Мониторинг

### Логи
```bash
# Просмотр логов webhook
tail -f /var/log/gastroshop-api.log | grep webhook

# Поиск ошибок
grep "ERROR" /var/log/gastroshop-api.log
```

### Метрики
- Количество созданных платежей
- Статусы платежей
- Время обработки webhook
- Ошибки валидации

## Тестирование

### Unit тесты
```bash
cd apps/api
go test ./internal/services/payment_service_test.go
```

### Integration тесты
```bash
# Запуск тестового сервера
cd apps/api && go run ./cmd/api

# Тестирование API
./test_payment_flow.sh
```

### Mock тесты
```bash
# Тестирование mock провайдера
curl -X POST http://localhost:8080/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"order_id": 1, "amount": 10000}'
```

## Развертывание

### Docker
```bash
# Сборка образов
docker-compose build

# Запуск
docker-compose up -d

# Проверка логов
docker-compose logs -f api
```

### Миграции
```bash
# Применение миграций
cd apps/api
goose up

# Откат
goose down
```

## Troubleshooting

### Частые проблемы

1. **Webhook не обрабатывается**
   - Проверить подпись
   - Проверить формат JSON
   - Проверить логи

2. **Дублирование платежей**
   - Проверить идемпотентность
   - Проверить webhook_event_id

3. **Ошибки валидации**
   - Проверить секретный ключ
   - Проверить алгоритм подписи

### Отладка
```bash
# Включить debug логи
export LOG_LEVEL=debug

# Проверить конфигурацию
curl http://localhost:8080/api/health
```

## Заключение

Система готова для демонстрации на защите:
- ✅ Реалистичный флоу оплаты
- ✅ Без юридических рисков (mock режим)
- ✅ Полная трассировка операций
- ✅ Идемпотентность и безопасность
- ✅ Админка для тестирования
- ✅ Подробное логирование
