#!/bin/bash

# Скрипт для исправления пароля администратора
# Использование: ./fix_admin_password.sh

echo "Исправление пароля администратора..."

# Проверяем, запущен ли docker-compose
if ! docker-compose ps | grep -q "Up"; then
    echo "Ошибка: Docker контейнеры не запущены. Запустите docker-compose up -d"
    exit 1
fi

# Получаем имя контейнера с базой данных
DB_CONTAINER=$(docker-compose ps -q db)

if [ -z "$DB_CONTAINER" ]; then
    echo "Ошибка: Контейнер базы данных не найден"
    exit 1
fi

echo "Подключение к базе данных..."

# Выполняем SQL для обновления пароля
docker-compose exec -T db psql -U postgres -d gastroshop <<EOF
-- Обновить пароль администратора
UPDATE users 
SET password_hash = '\$2a\$10\$EbctoatfGRklofQiHaLKpeQ1mOODk9X7yPJxb7vZeBP343Hi5bZSO',
    role = 'admin'
WHERE email = 'admin@gastroshop.com';

-- Если пользователь не существует, создать его
INSERT INTO users (email, password_hash, role)
SELECT 'admin@gastroshop.com', '\$2a\$10\$EbctoatfGRklofQiHaLKpeQ1mOODk9X7yPJxb7vZeBP343Hi5bZSO', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@gastroshop.com');

-- Проверяем результат
SELECT email, role, 
       CASE 
           WHEN password_hash = '\$2a\$10\$EbctoatfGRklofQiHaLKpeQ1mOODk9X7yPJxb7vZeBP343Hi5bZSO' 
           THEN 'OK' 
           ELSE 'WRONG HASH' 
       END as password_status
FROM users 
WHERE email = 'admin@gastroshop.com';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Пароль администратора успешно обновлен!"
    echo ""
    echo "Учетные данные:"
    echo "  Email: admin@gastroshop.com"
    echo "  Password: Admin123!"
    echo ""
    echo "Теперь вы можете войти в админ-панель."
else
    echo ""
    echo "✗ Ошибка при обновлении пароля. Проверьте логи выше."
    exit 1
fi


















