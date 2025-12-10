#!/bin/bash

# Тестовый скрипт для проверки интеграции с ЮKassa
# Использование: ./test_yookassa.sh

echo "🧪 Тестирование интеграции с ЮKassa"
echo "=================================="

# Проверяем наличие переменных окружения
if [ -z "$YOOKASSA_SHOP_ID" ]; then
    echo "❌ YOOKASSA_SHOP_ID не установлен"
    echo "   Установите переменную окружения: export YOOKASSA_SHOP_ID=your-shop-id"
    exit 1
fi

if [ -z "$YOOKASSA_SECRET_KEY" ]; then
    echo "❌ YOOKASSA_SECRET_KEY не установлен"
    echo "   Установите переменную окружения: export YOOKASSA_SECRET_KEY=your-secret-key"
    exit 1
fi

echo "✅ Переменные окружения установлены"
echo "   Shop ID: $YOOKASSA_SHOP_ID"
echo "   Test Mode: ${YOOKASSA_TEST_MODE:-true}"

# Проверяем, что сервер запущен
echo ""
echo "🔍 Проверка доступности сервера..."
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Сервер доступен"
else
    echo "❌ Сервер недоступен на localhost:8080"
    echo "   Запустите сервер: cd apps/api && go run cmd/api/main.go"
    exit 1
fi

# Тестируем создание заказа
echo ""
echo "🛒 Тестирование создания заказа..."
ORDER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "items": [
      {
        "product_id": 1,
        "quantity": 1,
        "price_cents": 10000
      }
    ],
    "shipping_address": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "+7 999 123 45 67",
      "address": "Test Address",
      "city": "Moscow",
      "postalCode": "123456",
      "country": "Russia"
    }
  }')

if echo "$ORDER_RESPONSE" | grep -q "id"; then
    ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "✅ Заказ создан с ID: $ORDER_ID"
else
    echo "❌ Ошибка создания заказа:"
    echo "$ORDER_RESPONSE"
    exit 1
fi

# Тестируем создание платежа
echo ""
echo "💳 Тестирование создания платежа..."
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/payments/create \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": $ORDER_ID}")

if echo "$PAYMENT_RESPONSE" | grep -q "payment_url"; then
    PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | grep -o '"payment_id":"[^"]*"' | cut -d'"' -f4)
    PAYMENT_URL=$(echo "$PAYMENT_RESPONSE" | grep -o '"payment_url":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Платеж создан"
    echo "   Payment ID: $PAYMENT_ID"
    echo "   Payment URL: $PAYMENT_URL"
else
    echo "❌ Ошибка создания платежа:"
    echo "$PAYMENT_RESPONSE"
    exit 1
fi

# Тестируем проверку статуса платежа
echo ""
echo "📊 Тестирование проверки статуса платежа..."
STATUS_RESPONSE=$(curl -s http://localhost:8080/api/payments/status/$PAYMENT_ID)

if echo "$STATUS_RESPONSE" | grep -q "status"; then
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Статус платежа получен: $STATUS"
else
    echo "❌ Ошибка получения статуса платежа:"
    echo "$STATUS_RESPONSE"
fi

echo ""
echo "🎉 Тестирование завершено!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Перейдите по ссылке: $PAYMENT_URL"
echo "2. Используйте тестовую карту: 5555 5555 5555 4444"
echo "3. CVV: 123, срок действия: любая будущая дата"
echo "4. Проверьте webhook в логах сервера"
echo ""
echo "🔧 Для продакшна:"
echo "1. Установите YOOKASSA_TEST_MODE=false"
echo "2. Настройте webhook URL в личном кабинете ЮKassa"
echo "3. Используйте реальные данные магазина"
