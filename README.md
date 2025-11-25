# 🥽 Интернет-магазин Оптики с СЗИ

> Веб-система интернет-магазина с встроенной **Системой Защиты Информации** для курсовой работы

## 🚀 Быстрый старт

### Windows
```bash
# Запустите автоматический скрипт
START_WINDOWS.bat
```

### Linux/Mac
```bash
# Дайте права и запустите
chmod +x START_LINUX.sh
./START_LINUX.sh
```

### Вручную
```bash
# 1. SSL сертификаты
cd nginx && ./generate-cert.sh && cd ..

# 2. Запуск контейнеров
docker-compose up -d

# 3. Миграции БД (подождите 30 сек после запуска)
docker-compose exec backend alembic revision --autogenerate -m "Initial"
docker-compose exec backend alembic upgrade head

# 4. Создание администратора
docker-compose exec backend python -m app.scripts.create_admin
```

**Готово!** Откройте https://localhost

---

## 📚 Документация

- **[QUICKSTART.md](QUICKSTART.md)** - быстрый старт и основные команды
- **[SETUP.md](SETUP.md)** - подробная инструкция по развертыванию
- **[FEATURES.md](FEATURES.md)** - полное описание функций СЗИ
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - структура проекта
- **[tz.txt](tz.txt)** - техническое задание

---

## 🏗️ Архитектура

```
┌─────────────┐      HTTPS      ┌─────────────┐
│   Browser   │ ◄──────────────► │    Nginx    │
└─────────────┘                  │ (TLS/Proxy) │
                                 └──────┬──────┘
                                        │
                        ┌───────────────┼───────────────┐
                        │               │               │
                   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
                   │ React   │    │ FastAPI │    │Postgres │
                   │Frontend │    │ Backend │    │   DB    │
                   └─────────┘    └─────────┘    └─────────┘
```

**Технологии:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy 2.0 + Alembic
- **Database**: PostgreSQL
- **Proxy**: Nginx (HTTPS/TLS)
- **Deploy**: Docker + Docker Compose

---

## 🔐 Система защиты информации

### ✅ Аутентификация
- JWT токены (Access + Refresh)
- HttpOnly cookies для защиты от XSS
- TOTP 2FA через Google Authenticator
- Валидация надежности паролей
- Bcrypt хэширование (cost: 12)

### ✅ Авторизация (RBAC)
- **Administrator** - полный доступ
- **Staff** - ограниченные админские функции
- **User** - базовые функции
- Проверка ролей на уровне API и UI

### ✅ Логирование (Audit)
- Запись всех событий в БД
- Фильтрация по 10+ параметрам
- Пагинация и сортировка
- Статистика событий
- Трекинг IP адресов

### ✅ Защита данных
- HTTPS/TLS шифрование
- SQL Injection protection (ORM)
- XSS protection (HttpOnly cookies)
- CSRF protection (SameSite)
- CORS политика

---

## 👥 Роли и доступ

| Функция | Admin | Staff | User |
|---------|:-----:|:-----:|:----:|
| Каталог товаров | ✅ | ✅ | ✅ |
| Регистрация/Вход | ✅ | ✅ | ✅ |
| Профиль + 2FA | ✅ | ✅ | ✅ |
| Просмотр логов | ✅ | ✅ | ❌ |
| Управление пользователями | ✅ | ❌ | ❌ |
| Изменение ролей | ✅ | ❌ | ❌ |
| Блокировка/Удаление | ✅ | ❌ | ❌ |

---

## 🧪 Тестовые аккаунты

После запуска скрипта `create_admin`:

| Username | Password | Роль |
|----------|----------|------|
| `admin` | `Admin123!` | Administrator |
| `staff_user` | `Staff123!` | Staff |
| `regular_user` | `User123!` | User |

---

## 📡 API Endpoints

**Документация:** http://localhost:8000/docs

### Аутентификация
```
POST /auth/register    - Регистрация
POST /auth/login       - Вход (+ 2FA)
POST /auth/logout      - Выход
POST /auth/refresh     - Обновление токена
GET  /auth/me          - Текущий пользователь
```

### 2FA
```
POST /2fa/enable       - Включить (получить QR)
POST /2fa/verify       - Подтвердить код
POST /2fa/disable      - Отключить (требует пароль)
```

### Администрирование
```
GET    /admin/users           - Список пользователей
POST   /admin/users           - Создать пользователя
PUT    /admin/users/{id}      - Обновить
DELETE /admin/users/{id}      - Удалить
PUT    /admin/users/{id}/role - Изменить роль
POST   /admin/users/{id}/reset-2fa - Сбросить 2FA
```

### Логи
```
GET /admin/logs               - Журнал (фильтры, пагинация)
GET /admin/logs/{id}          - Детали события
GET /admin/logs/stats/summary - Статистика
```

### Каталог
```
GET /products       - Список товаров
GET /products/{id}  - Детали товара
```

---

## 📊 Что можно протестировать

### 1. Регистрация и вход
- ✅ Регистрация с валидацией пароля
- ✅ Вход с JWT токенами
- ✅ Автоматический refresh токена
- ✅ Выход из системы

### 2. Двухфакторная аутентификация
- ✅ Включение 2FA (QR код)
- ✅ Подтверждение TOTP кода
- ✅ Вход с 2FA
- ✅ Отключение 2FA

### 3. RBAC
- ✅ Разделение по ролям
- ✅ Ограничение доступа к админ-панели
- ✅ Проверка прав на уровне API

### 4. Администрирование
- ✅ CRUD пользователей
- ✅ Блокировка/разблокировка
- ✅ Изменение ролей
- ✅ Сброс 2FA
- ✅ Защита от самоудаления

### 5. Логирование
- ✅ Все события в БД
- ✅ Фильтры (дата, пользователь, операция, статус)
- ✅ Сортировка
- ✅ Пагинация
- ✅ Статистика

### 6. UI/UX
- ✅ Адаптивный дизайн
- ✅ Защищенные маршруты
- ✅ Индикаторы загрузки
- ✅ Обработка ошибок
- ✅ Подтверждение действий

---

## 🔧 Полезные команды

```bash
# Логи
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Перезапуск
docker-compose restart backend

# Остановка
docker-compose stop

# Остановка + удаление контейнеров
docker-compose down

# Полная очистка (включая БД)
docker-compose down -v

# Подключение к БД
docker-compose exec postgres psql -U postgres -d optics_db

# Python консоль
docker-compose exec backend python
```

---

## 📁 Структура проекта

```
optics/
├── backend/              # FastAPI сервер
│   ├── app/
│   │   ├── api/         # REST API endpoints
│   │   ├── auth/        # Аутентификация + 2FA
│   │   ├── core/        # Конфигурация, JWT, bcrypt
│   │   ├── db/          # SQLAlchemy модели
│   │   ├── middleware/  # Логирование
│   │   └── main.py      # FastAPI app
│   ├── alembic/         # Миграции БД
│   └── requirements.txt
│
├── frontend/            # React SPA
│   ├── src/
│   │   ├── components/  # Компоненты
│   │   ├── pages/       # Страницы
│   │   ├── services/    # API клиент + Auth контекст
│   │   └── App.tsx      # Роутинг
│   └── package.json
│
├── nginx/               # Reverse proxy
│   ├── nginx.conf       # HTTPS/TLS конфигурация
│   └── ssl/             # SSL сертификаты
│
├── docker-compose.yml   # Оркестрация сервисов
├── QUICKSTART.md        # Быстрый старт
├── SETUP.md             # Детальная инструкция
└── FEATURES.md          # Описание СЗИ
```

---

## ✅ Соответствие ТЗ

Все требования из [tz.txt](tz.txt) **реализованы на 100%**:

- ✅ FastAPI backend с REST API
- ✅ React SPA frontend
- ✅ PostgreSQL + Alembic миграции
- ✅ Docker окружение (4 контейнера)
- ✅ JWT аутентификация (httpOnly cookies)
- ✅ 2FA TOTP (Google Authenticator)
- ✅ RBAC (admin/staff/user)
- ✅ Полное логирование (audit_log)
- ✅ Админ-панель (управление + логи)
- ✅ Фильтры и пагинация логов
- ✅ HTTPS/TLS + CORS
- ✅ Bcrypt для паролей
- ✅ Валидация надежности паролей
- ✅ Защита от CSRF, XSS, SQL injection

---

## 🎓 Для курсовой работы

**Преподаватель может проверить:**
1. Регистрацию с валидацией пароля
2. Вход с JWT токенами
3. Настройку 2FA через QR код
4. Ролевую модель (RBAC)
5. Создание пользователей администратором
6. Журнал событий с фильтрами
7. Все логи в БД (таблица audit_log)
8. HTTPS шифрование
9. Безопасное хранение токенов (httpOnly)
10. Миграции Alembic

**Демо:**
1. Войти как admin (`admin` / `Admin123!`)
2. Открыть Админ-панель → Журнал событий
3. Показать логи всех действий
4. Создать нового пользователя
5. Изменить роль
6. Показать логирование этих действий

---

## 📞 Поддержка

При проблемах:
1. Проверьте логи: `docker-compose logs -f`
2. Убедитесь, что миграции применены: `docker-compose exec backend alembic current`
3. Пересоздайте контейнеры: `docker-compose down && docker-compose up -d`

---

**Готово к защите курсовой! 🎓✅**

Все требования СЗИ выполнены. Система протестирована и готова к демонстрации.

