# Настройка переменных окружения

Для безопасной работы приложения все секретные ключи и конфигурация должны храниться в файле `.env`, который не коммитится в Git.

## Быстрый старт

1. **Скопируйте файл примера:**
   ```bash
   cp .env.example .env
   ```

2. **Отредактируйте `.env` и добавьте ваши реальные значения:**
   - `OPENAI_API_KEY` - ваш API ключ OpenAI для AI ассистента
   - `JWT_SECRET` - секретный ключ для JWT токенов (сгенерируйте случайную строку)
   - `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY` - для интеграции с ЮKassa (если используется)

3. **Запустите приложение:**
   ```bash
   docker compose up -d
   ```

## Структура переменных

### Обязательные для работы

- `OPENAI_API_KEY` - ключ OpenAI API для AI ассистента (можно оставить пустым для fallback режима)
- `JWT_SECRET` - секретный ключ для подписи JWT токенов
- `DB_DSN` - строка подключения к PostgreSQL

### Опциональные

- `PAYMENT_PROVIDER` - провайдер платежей (`mock`, `yookassa`, `cloudpayments`)
- `SKIP_MIGRATIONS` - пропустить миграции БД при запуске (`true`/`false`)

## Безопасность

✅ **НЕ КОММИТЬТЕ `.env` в Git** - файл уже добавлен в `.gitignore`  
✅ Используйте `.env.example` как шаблон  
✅ В production используйте Docker secrets или внешние менеджеры секретов (HashiCorp Vault, AWS Secrets Manager и т.д.)

## Docker Compose

Docker Compose автоматически загружает переменные из `.env` файла через директиву `env_file`:

```yaml
api:
  env_file:
    - .env
  environment:
    - OPENAI_API_KEY=${OPENAI_API_KEY}
```

Это означает, что:
- Значения берутся из `.env` файла
- Можно переопределить через системные переменные окружения
- Если переменная не задана, используются значения по умолчанию (через `${VAR:-default}`)

## Production

Для production окружения рекомендуется:

1. **Использовать Docker secrets:**
   ```yaml
   secrets:
     openai_key:
       file: ./secrets/openai_key.txt
   ```

2. **Или переменные окружения хоста:**
   ```bash
   export OPENAI_API_KEY=your-key
   docker compose up -d
   ```

3. **Или внешний менеджер секретов** (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)

