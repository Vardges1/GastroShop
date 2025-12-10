# Интеграция с ЮKassa (Яндекс.Касса)

## Настройка

### 1. Получение данных от ЮKassa

1. Зарегистрируйтесь в [ЮKassa](https://yookassa.ru/)
2. Создайте магазин в личном кабинете
3. Получите:
   - **Shop ID** (идентификатор магазина)
   - **Secret Key** (секретный ключ)

### 2. Настройка переменных окружения

Создайте файл `.env` в папке `apps/api/` на основе `env.example`:

```env
# Payment Provider
PAYMENT_PROVIDER=yookassa
YOOKASSA_SHOP_ID=your-shop-id-here
YOOKASSA_SECRET_KEY=your-secret-key-here
YOOKASSA_TEST_MODE=true
YOOKASSA_WEBHOOK_URL=https://yourdomain.com/api/webhooks/yookassa

# Server
PORT=8080
CORS_ORIGIN=http://localhost:3000
```

### 3. Настройка webhook в ЮKassa

1. В личном кабинете ЮKassa перейдите в раздел "Настройки" → "Webhook"
2. Добавьте URL: `https://yourdomain.com/api/webhooks/yookassa`
3. Выберите события:
   - `payment.succeeded` - успешная оплата
   - `payment.canceled` - отмена платежа

### 4. Тестирование

#### Тестовый режим
- Установите `YOOKASSA_TEST_MODE=true` для тестирования
- Используйте тестовые карты:
  - **Успешная оплата**: 5555 5555 5555 4444
  - **Отклоненная оплата**: 5555 5555 5555 4445
  - **CVV**: 123
  - **Срок действия**: любая будущая дата

#### Продакшн режим
- Установите `YOOKASSA_TEST_MODE=false`
- Используйте реальные данные магазина

## API Endpoints

### Создание платежа
```
POST /api/payments/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "order_id": 123
}
```

**Ответ:**
```json
{
  "payment_url": "https://yoomoney.ru/checkout/payments/v2/show?orderId=...",
  "payment_id": "2c5d4b8a-000f-5000-9000-1b68e7b5f0f3"
}
```

### Проверка статуса платежа
```
GET /api/payments/status/{payment_id}
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "id": "2c5d4b8a-000f-5000-9000-1b68e7b5f0f3",
  "status": "succeeded",
  "amount": {
    "value": "100.00",
    "currency": "RUB"
  },
  "metadata": {
    "order_id": 123
  }
}
```

### Webhook (для ЮKassa)
```
POST /api/webhooks/yookassa
Content-Type: application/json
X-Signature: sha256=<signature>

{
  "type": "notification",
  "event": "payment.succeeded",
  "object": {
    "id": "2c5d4b8a-000f-5000-9000-1b68e7b5f0f3",
    "status": "succeeded",
    "amount": {
      "value": "100.00",
      "currency": "RUB"
    },
    "metadata": {
      "order_id": 123
    }
  }
}
```

## Статусы платежей

- `pending` - ожидает оплаты
- `waiting_for_capture` - ожидает подтверждения
- `succeeded` - успешно оплачен
- `canceled` - отменен

## Безопасность

1. **Проверка подписи webhook** - все webhook проверяются на подлинность
2. **HTTPS** - обязательно используйте HTTPS в продакшне
3. **Секретные ключи** - храните секретные ключи в переменных окружения
4. **Idempotency** - используем уникальные ключи для предотвращения дублирования

## Обработка ошибок

### Частые ошибки:

1. **"Invalid signature"** - неправильная подпись webhook
2. **"YooKassa API error"** - ошибка API ЮKassa
3. **"Order not found"** - заказ не найден

### Логирование:
Все ошибки логируются для отладки. Проверьте логи сервера для диагностики проблем.

## Поддержка

- [Документация ЮKassa](https://yookassa.ru/developers/api)
- [Тестовые данные](https://yookassa.ru/developers/using-api/testing)
- [Webhook документация](https://yookassa.ru/developers/using-api/webhooks)
