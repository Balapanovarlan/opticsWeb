# Google OAuth 2.0 Setup

## Настройка Google Cloud Console

### 1. Создание проекта

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. В меню выберите "APIs & Services" → "Credentials"

### 2. Настройка OAuth Consent Screen

1. Перейдите в "OAuth consent screen"
2. Выберите "External" (для тестирования)
3. Заполните обязательные поля:
   - App name: Optics Shop
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Добавьте scopes:
   - `openid`
   - `email`
   - `profile`
5. Добавьте тестовых пользователей (для External apps)

### 3. Создание OAuth 2.0 Client ID

1. Перейдите в "Credentials" → "Create Credentials" → "OAuth Client ID"
2. Application type: "Web application"
3. Name: "Optics Web App"
4. Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost
   ```
5. Authorized redirect URIs:
   ```
   http://localhost:8000/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```
6. Нажмите "Create"
7. Скопируйте Client ID и Client Secret

### 4. Настройка .env файла

Создайте файл `backend/.env` и добавьте:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Existing config
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/optics_db
SECRET_KEY=your-secret-key-here-min-32-chars-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000
DEBUG=True
```

## Интеграция в приложение

### Backend

Эндпоинты уже созданы в `backend/app/api/google_oauth.py`:

- `GET /auth/google/login` - начало OAuth flow
- `GET /auth/google/callback` - callback от Google

Добавьте роутер в `backend/app/main.py`:

```python
from app.api import google_oauth

app.include_router(google_oauth.router)
```

### Frontend

Добавьте кнопку "Войти через Google" в `LoginPage.tsx`:

```tsx
<button
  onClick={() => window.location.href = 'http://localhost:8000/auth/google/login'}
  className="btn btn-secondary w-full flex items-center justify-center gap-2"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Войти через Google
</button>
```

## Тестирование

1. Запустите backend:
```bash
docker-compose up -d --build backend
```

2. Откройте браузер и перейдите:
```
http://localhost:8000/auth/google/login
```

3. Авторизуйтесь через Google
4. После успешной авторизации вы будете перенаправлены обратно с токенами

## Безопасность

### Production настройки:

1. **HTTPS обязателен:**
   - Google OAuth требует HTTPS для production
   - Используйте Let's Encrypt для SSL сертификатов

2. **Secure redirect URIs:**
   ```
   https://yourdomain.com/auth/google/callback
   ```

3. **Environment variables:**
   - НИКОГДА не коммитьте `.env` в git
   - Используйте `.gitignore`

4. **Scope минимизация:**
   - Запрашивайте только необходимые scopes
   - Текущие: `openid email profile`

## Отладка

### Логи backend:
```bash
docker-compose logs -f backend
```

### Проверка OAuth flow:

1. Проверьте Client ID и Secret в `.env`
2. Убедитесь, что redirect URI совпадает
3. Проверьте, что пользователь добавлен в тестовую группу (для External apps)

### Частые ошибки:

**"redirect_uri_mismatch":**
- Проверьте, что URI точно совпадает в Google Console и коде

**"invalid_client":**
- Неверный Client ID или Secret

**"access_denied":**
- Пользователь отменил авторизацию
- Или не добавлен в тестовую группу

## Дополнительная информация

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Authlib Documentation](https://docs.authlib.org/)

