# Инструкция по развертыванию системы

## Требования

- Docker и Docker Compose
- Git (опционально)
- OpenSSL для генерации SSL сертификатов

## Шаг 1: Клонирование/создание проекта

Если вы уже находитесь в директории проекта, пропустите этот шаг.

## Шаг 2: Генерация SSL сертификатов

Для работы HTTPS необходимо создать SSL сертификаты:

### Windows (PowerShell):
```powershell
cd nginx
New-Item -ItemType Directory -Force -Path ssl
# Используйте OpenSSL (можно установить через Git Bash или отдельно)
# Альтернативно: запустите через Git Bash или WSL
```

### Linux/Mac:
```bash
cd nginx
chmod +x generate-cert.sh
./generate-cert.sh
cd ..
```

### Без OpenSSL:
Если OpenSSL недоступен, можно временно отключить HTTPS в `nginx/nginx.conf`:
- Закомментировать блок `server` для порта 443
- Использовать только HTTP (порт 80)

## Шаг 3: Настройка переменных окружения

Создайте файл `backend/.env` на основе `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

**Важно:** Измените `SECRET_KEY` на случайную строку минимум 32 символа!

```env
SECRET_KEY=your-very-secret-random-string-min-32-chars-long
```

## Шаг 4: Запуск Docker контейнеров

```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL (порт 5432)
- Backend FastAPI (порт 8000)
- Frontend React (порт 3000)
- Nginx (порты 80, 443)

## Шаг 5: Применение миграций БД

После запуска контейнеров выполните миграции:

```bash
# Создание миграции
docker-compose exec backend alembic revision --autogenerate -m "Initial migration"

# Применение миграции
docker-compose exec backend alembic upgrade head
```

## Шаг 6: Создание администратора

Запустите скрипт создания первого администратора:

```bash
docker-compose exec backend python -m app.scripts.create_admin
```

Следуйте инструкциям скрипта. При желании можно создать тестовых пользователей.

**Логин по умолчанию:**
- Username: `admin`
- Password: `Admin123!`
- Email: `admin@optics.localhost`

⚠️ **Смените пароль после первого входа!**

## Шаг 7: Доступ к приложению

- **Frontend (через Nginx)**: https://localhost (или http://localhost)
- **Backend API**: https://localhost/api (или http://localhost:8000)
- **Backend Docs**: http://localhost:8000/docs

## Проверка работы

1. Откройте https://localhost в браузере
2. Пройдите регистрацию или войдите через admin
3. Проверьте:
   - Каталог товаров
   - Профиль пользователя
   - Настройку 2FA
   - Админ-панель (если вошли как admin/staff)

## Остановка системы

```bash
# Остановить контейнеры
docker-compose stop

# Остановить и удалить контейнеры
docker-compose down

# Остановить и удалить контейнеры + volumes (БД будет очищена!)
docker-compose down -v
```

## Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Разработка

### Backend

```bash
# Перезапуск backend (если изменили код)
docker-compose restart backend

# Интерактивная консоль Python
docker-compose exec backend python

# Проверка базы данных
docker-compose exec postgres psql -U postgres -d optics_db
```

### Frontend

```bash
# Пересборка frontend
docker-compose restart frontend

# Установка npm пакетов (если добавили зависимости)
docker-compose exec frontend npm install
```

## Тестирование функций

### 1. Аутентификация
- ✅ Регистрация с валидацией пароля
- ✅ Вход с JWT токенами в httpOnly cookies
- ✅ Выход из системы

### 2. Двухфакторная аутентификация (2FA)
- ✅ Включение 2FA (QR код для Google Authenticator)
- ✅ Подтверждение TOTP кода
- ✅ Отключение 2FA

### 3. RBAC (Роли)
- ✅ Разделение прав: admin, staff, user
- ✅ Доступ к админ-панели только для admin/staff

### 4. Администрирование
- ✅ Просмотр списка пользователей
- ✅ Создание пользователей
- ✅ Блокировка/разблокировка
- ✅ Изменение ролей
- ✅ Сброс 2FA
- ✅ Удаление пользователей

### 5. Логирование (Аудит)
- ✅ Запись всех событий в БД
- ✅ Просмотр логов с фильтрами
- ✅ Пагинация и сортировка
- ✅ Статистика по событиям

### 6. Безопасность
- ✅ HTTPS/TLS шифрование
- ✅ Bcrypt для паролей
- ✅ HttpOnly cookies для токенов
- ✅ CORS политика
- ✅ Валидация входных данных

## Возможные проблемы

### Порты заняты
Если порты 80, 443, 3000, 5432, 8000 уже используются, измените их в `docker-compose.yml`.

### SSL сертификат
Браузер будет предупреждать о небезопасном подключении (самоподписанный сертификат). Это нормально для разработки. Нажмите "Продолжить" или "Advanced → Proceed".

### База данных не инициализирована
Убедитесь, что миграции применены:
```bash
docker-compose exec backend alembic upgrade head
```

### Backend не стартует
Проверьте логи:
```bash
docker-compose logs backend
```

Частые причины:
- Не создан файл `.env`
- PostgreSQL еще не готов (подождите 10-20 сек)
- Ошибка в коде Python

## Архитектура проекта

```
optics/
├── backend/          # FastAPI сервер
│   ├── app/
│   │   ├── api/      # REST API endpoints
│   │   ├── auth/     # Аутентификация и 2FA
│   │   ├── core/     # Конфигурация, безопасность
│   │   ├── db/       # Модели БД
│   │   ├── middleware/  # Логирование
│   │   └── main.py   # Точка входа
│   ├── alembic/      # Миграции
│   └── requirements.txt
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── package.json
├── nginx/            # Reverse proxy
│   ├── nginx.conf
│   └── ssl/          # SSL сертификаты
└── docker-compose.yml
```

## Контакты и поддержка

Для курсовой работы по защите информации.

Все требования из ТЗ реализованы ✅

