# Структура проекта

```
optics/
│
├── README.md                      # Описание проекта
├── SETUP.md                       # Подробная инструкция по развертыванию
├── QUICKSTART.md                  # Быстрый старт
├── tz.txt                         # Техническое задание
├── .gitignore                     # Игнорируемые файлы
│
├── docker-compose.yml             # Конфигурация Docker
├── docker-compose.override.yml    # Override для разработки
│
├── backend/                       # Backend (FastAPI)
│   ├── Dockerfile                 # Docker образ backend
│   ├── requirements.txt           # Python зависимости
│   ├── .env.example              # Пример переменных окружения
│   ├── alembic.ini               # Конфигурация Alembic
│   │
│   ├── app/                       # Основное приложение
│   │   ├── __init__.py
│   │   ├── main.py               # Точка входа FastAPI
│   │   │
│   │   ├── api/                   # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py        # Pydantic схемы
│   │   │   ├── auth.py           # Аутентификация
│   │   │   ├── twofa.py          # 2FA endpoints
│   │   │   ├── admin.py          # Управление пользователями
│   │   │   ├── logs.py           # Журнал событий
│   │   │   └── products.py       # Каталог (mock)
│   │   │
│   │   ├── auth/                  # Модуль аутентификации
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py   # Auth dependencies
│   │   │   └── totp.py           # TOTP 2FA
│   │   │
│   │   ├── core/                  # Ядро приложения
│   │   │   ├── __init__.py
│   │   │   ├── config.py         # Конфигурация
│   │   │   └── security.py       # JWT, bcrypt, валидация
│   │   │
│   │   ├── db/                    # База данных
│   │   │   ├── __init__.py
│   │   │   ├── database.py       # Подключение к БД
│   │   │   └── models/
│   │   │       ├── __init__.py
│   │   │       ├── user.py       # Модель User
│   │   │       └── audit_log.py  # Модель AuditLog
│   │   │
│   │   ├── middleware/            # Middleware
│   │   │   ├── __init__.py
│   │   │   └── logging.py        # Логирование
│   │   │
│   │   └── scripts/               # Утилиты
│   │       ├── __init__.py
│   │       └── create_admin.py   # Создание админа
│   │
│   └── alembic/                   # Миграции БД
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│           └── __init__.py
│
├── frontend/                      # Frontend (React + TypeScript)
│   ├── Dockerfile                 # Docker образ frontend
│   ├── package.json               # npm зависимости
│   ├── tsconfig.json             # TypeScript конфигурация
│   ├── tsconfig.node.json
│   ├── vite.config.ts            # Vite конфигурация
│   ├── tailwind.config.js        # Tailwind CSS
│   ├── postcss.config.js
│   ├── index.html                # Главный HTML
│   │
│   ├── public/                    # Статические файлы
│   │   └── vite.svg
│   │
│   └── src/                       # Исходный код
│       ├── main.tsx              # Точка входа React
│       ├── App.tsx               # Главный компонент + роутинг
│       │
│       ├── components/            # Компоненты
│       │   └── layouts/
│       │       ├── MainLayout.tsx     # Основной layout
│       │       └── AdminLayout.tsx    # Админ layout
│       │
│       ├── pages/                 # Страницы
│       │   ├── HomePage.tsx           # Главная
│       │   ├── LoginPage.tsx          # Вход
│       │   ├── RegisterPage.tsx       # Регистрация
│       │   ├── ProfilePage.tsx        # Профиль + 2FA
│       │   ├── ProductsPage.tsx       # Каталог
│       │   └── admin/                 # Админские страницы
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminUsersPage.tsx
│       │       └── AdminLogsPage.tsx
│       │
│       ├── services/              # Сервисы
│       │   ├── api.ts            # API клиент (axios)
│       │   └── auth.tsx          # Auth контекст
│       │
│       └── styles/                # Стили
│           └── index.css         # Tailwind + custom CSS
│
├── nginx/                         # Reverse proxy
│   ├── nginx.conf                # Конфигурация Nginx
│   ├── generate-cert.sh          # Скрипт генерации SSL
│   └── ssl/                      # SSL сертификаты (не в git)
│       ├── cert.crt
│       └── cert.key
│
└── logs/                          # Логи приложения
    └── app.log
```

## Ключевые файлы

### Backend
- `app/main.py` - FastAPI приложение, middleware, роутеры
- `app/core/security.py` - JWT, bcrypt, валидация паролей
- `app/auth/totp.py` - TOTP для 2FA
- `app/db/models/user.py` - Модель пользователя
- `app/db/models/audit_log.py` - Модель журнала аудита
- `app/api/auth.py` - Регистрация, вход, выход
- `app/api/admin.py` - CRUD пользователей
- `app/api/logs.py` - Просмотр логов с фильтрами

### Frontend
- `src/App.tsx` - Роутинг, защищенные маршруты
- `src/services/api.ts` - API клиент с interceptors
- `src/services/auth.tsx` - Контекст аутентификации
- `src/pages/ProfilePage.tsx` - Управление 2FA
- `src/pages/admin/*` - Админ-панель

### Docker
- `docker-compose.yml` - Описание сервисов
- `backend/Dockerfile` - Python образ
- `frontend/Dockerfile` - Node образ

### Конфигурация
- `backend/alembic.ini` - Настройки миграций
- `nginx/nginx.conf` - Reverse proxy, HTTPS
- `frontend/vite.config.ts` - Dev сервер, proxy

## Технологический стек

### Backend
- **FastAPI** - веб-фреймворк
- **SQLAlchemy 2.0** - ORM (async)
- **Alembic** - миграции БД
- **PostgreSQL** - СУБД
- **PyJWT** - JWT токены
- **Passlib + bcrypt** - хэширование паролей
- **PyOTP** - TOTP 2FA
- **Pydantic** - валидация данных

### Frontend
- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик и dev сервер
- **React Router** - роутинг
- **Axios** - HTTP клиент
- **Tailwind CSS** - стили
- **qrcode.react** - QR коды для 2FA

### DevOps
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация
- **Nginx** - reverse proxy, HTTPS

## Архитектурные паттерны

### Backend
- **Repository Pattern** - работа с БД через SQLAlchemy
- **Dependency Injection** - FastAPI Depends
- **Middleware Pattern** - логирование, CORS
- **Service Layer** - бизнес-логика в API endpoints

### Frontend
- **Context API** - глобальное состояние (auth)
- **Protected Routes** - проверка авторизации
- **Axios Interceptors** - автоматический refresh токенов
- **Component Composition** - переиспользуемые компоненты

### Безопасность
- **HTTPS/TLS** - шифрование трафика
- **HttpOnly Cookies** - защита JWT токенов
- **CORS Policy** - контроль доступа
- **RBAC** - контроль прав доступа
- **Audit Logging** - полное логирование

## Соответствие ТЗ

| Требование | Файл | Статус |
|------------|------|--------|
| JWT аутентификация | `backend/app/core/security.py` | ✅ |
| 2FA TOTP | `backend/app/auth/totp.py` | ✅ |
| RBAC | `backend/app/auth/dependencies.py` | ✅ |
| Audit logging | `backend/app/middleware/logging.py` | ✅ |
| PostgreSQL | `backend/app/db/database.py` | ✅ |
| Alembic миграции | `backend/alembic/` | ✅ |
| React SPA | `frontend/src/` | ✅ |
| Админ-панель | `frontend/src/pages/admin/` | ✅ |
| Docker окружение | `docker-compose.yml` | ✅ |
| HTTPS | `nginx/nginx.conf` | ✅ |

**Все требования ТЗ выполнены!** ✅

