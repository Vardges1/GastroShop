#!/bin/bash

# Тестовый скрипт для демонстрации платежной системы
# GastroShop Payment Flow Demo

set -e

API_BASE="http://localhost:8080"
WEB_BASE="http://localhost:3000"

echo "🚀 GastroShop Payment Flow Demo"
echo "================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка доступности сервисов
check_services() {
    log "Проверка доступности сервисов..."
    
    if curl -s -f "$API_BASE/api/health" > /dev/null; then
        success "API сервер доступен"
    else
        error "API сервер недоступен на $API_BASE"
        exit 1
    fi
    
    if curl -s -f "$WEB_BASE" > /dev/null; then
        success "Web сервер доступен"
    else
        error "Web сервер недоступен на $WEB_BASE"
        exit 1
    fi
}

# Создание тестового заказа
create_test_order() {
    log "Создание тестового заказа..."
    
    ORDER_RESPONSE=$(curl -s -X POST "$API_BASE/api/orders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-token" \
        -d '{
            "items": [
                {"product_id": 1, "quantity": 2},
                {"product_id": 2, "quantity": 1}
            ],
            "shipping_address": {
                "city": "Москва",
                "address": "ул. Тестовая, 123",
                "postal_code": "123456"
            }
        }')
    
    ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
    
    if [ "$ORDER_ID" != "null" ] && [ "$ORDER_ID" != "" ]; then
        success "Заказ создан с ID: $ORDER_ID"
        echo "$ORDER_ID"
    else
        error "Не удалось создать заказ"
        echo "$ORDER_RESPONSE"
        exit 1
    fi
}

# Создание платежа
create_payment() {
    local order_id=$1
    
    log "Создание платежа для заказа $order_id..."
    
    PAYMENT_RESPONSE=$(curl -s -X POST "$API_BASE/api/payments/create" \
        -H "Content-Type: application/json" \
        -d "{
            \"order_id\": $order_id,
            \"amount\": 15000,
            \"currency\": \"RUB\",
            \"description\": \"Тестовый заказ #$order_id\"
        }")
    
    PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.payment_id')
    CHECKOUT_URL=$(echo "$PAYMENT_RESPONSE" | jq -r '.checkout_url')
    
    if [ "$PAYMENT_ID" != "null" ] && [ "$PAYMENT_ID" != "" ]; then
        success "Платеж создан с ID: $PAYMENT_ID"
        echo "Checkout URL: $CHECKOUT_URL"
        echo "$PAYMENT_ID"
    else
        error "Не удалось создать платеж"
        echo "$PAYMENT_RESPONSE"
        exit 1
    fi
}

# Отправка webhook
send_webhook() {
    local payment_id=$1
    local success_status=$2
    
    log "Отправка webhook для платежа $payment_id (статус: $success_status)..."
    
    # Создание webhook payload
    local event="payment.succeeded"
    local status="succeeded"
    
    if [ "$success_status" = "false" ]; then
        event="payment.canceled"
        status="canceled"
    fi
    
    local webhook_payload=$(cat <<EOF
{
    "event": "$event",
    "id": "evt_$(date +%s)",
    "object": {
        "id": "$payment_id",
        "status": "$status",
        "amount": {
            "value": "150.00",
            "currency": "RUB"
        },
        "metadata": {
            "order_id": 1
        }
    }
}
EOF
)
    
    # Создание HMAC подписи
    local signature=$(echo -n "$webhook_payload" | openssl dgst -sha256 -hmac "mock-webhook-secret-key" | cut -d' ' -f2)
    
    # Отправка webhook
    local webhook_response=$(curl -s -X POST "$API_BASE/api/webhooks/yookassa" \
        -H "Content-Type: application/json" \
        -H "X-Signature: $signature" \
        -d "$webhook_payload")
    
    if echo "$webhook_response" | jq -e '.status' > /dev/null; then
        success "Webhook отправлен успешно"
        echo "Ответ: $webhook_response"
    else
        error "Ошибка отправки webhook"
        echo "Ответ: $webhook_response"
    fi
}

# Проверка статуса платежа
check_payment_status() {
    local payment_id=$1
    
    log "Проверка статуса платежа $payment_id..."
    
    local status_response=$(curl -s "$API_BASE/api/payments/status/$payment_id")
    local status=$(echo "$status_response" | jq -r '.status')
    
    if [ "$status" != "null" ] && [ "$status" != "" ]; then
        success "Статус платежа: $status"
        echo "$status_response"
    else
        error "Не удалось получить статус платежа"
        echo "$status_response"
    fi
}

# Демонстрация идемпотентности
test_idempotency() {
    local payment_id=$1
    
    log "Тестирование идемпотентности..."
    
    # Отправляем один и тот же webhook несколько раз
    for i in {1..3}; do
        log "Отправка webhook #$i..."
        send_webhook "$payment_id" "true"
        sleep 1
    done
    
    success "Идемпотентность протестирована"
}

# Основная функция демонстрации
main() {
    echo
    log "Начинаем демонстрацию платежной системы..."
    echo
    
    # Проверка сервисов
    check_services
    echo
    
    # Сценарий A: Успешная оплата
    log "=== Сценарий A: Успешная оплата ==="
    ORDER_ID=$(create_test_order)
    PAYMENT_ID=$(create_payment "$ORDER_ID")
    
    log "Открываем checkout страницу..."
    warning "Перейдите в браузере на: $WEB_BASE/mock-checkout/$PAYMENT_ID"
    warning "Нажмите 'Успешная оплата' для продолжения"
    read -p "Нажмите Enter после выполнения действия..."
    
    check_payment_status "$PAYMENT_ID"
    echo
    
    # Сценарий B: Идемпотентность
    log "=== Сценарий B: Идемпотентность ==="
    test_idempotency "$PAYMENT_ID"
    echo
    
    # Сценарий C: Отмена платежа
    log "=== Сценарий C: Отмена платежа ==="
    ORDER_ID2=$(create_test_order)
    PAYMENT_ID2=$(create_payment "$ORDER_ID2")
    
    log "Открываем checkout страницу для отмены..."
    warning "Перейдите в браузере на: $WEB_BASE/mock-checkout/$PAYMENT_ID2"
    warning "Нажмите 'Отменить оплату' для продолжения"
    read -p "Нажмите Enter после выполнения действия..."
    
    check_payment_status "$PAYMENT_ID2"
    echo
    
    # Админ панель
    log "=== Админ панель ==="
    warning "Откройте админ панель: $WEB_BASE/admin"
    warning "Проверьте статусы платежей и заказов"
    read -p "Нажмите Enter для завершения..."
    
    success "Демонстрация завершена!"
    echo
    log "Полезные ссылки:"
    echo "  - Админ панель: $WEB_BASE/admin"
    echo "  - API документация: $API_BASE/api/health"
    echo "  - Логи: docker-compose logs -f api"
}

# Проверка зависимостей
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        error "curl не установлен"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq не установлен"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        error "openssl не установлен"
        exit 1
    fi
}

# Запуск
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Использование: $0"
    echo
    echo "Демонстрация платежной системы GastroShop"
    echo
    echo "Требования:"
    echo "  - curl, jq, openssl"
    echo "  - Запущенные API и Web серверы"
    echo "  - База данных с примененными миграциями"
    echo
    echo "Сценарии:"
    echo "  A. Успешная оплата"
    echo "  B. Идемпотентность webhook"
    echo "  C. Отмена платежа"
    echo
    exit 0
fi

check_dependencies
main
