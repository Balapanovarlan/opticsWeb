"""
Google OAuth 2.0 аутентификация
"""
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from starlette.config import Config
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models.user import User, UserRole
from app.db.models.audit_log import OperationType, StatusType
from app.core.security import generate_session_token, create_access_token, create_refresh_token
from app.middleware.logging import log_audit_event, get_client_ip
from datetime import datetime, timezone
import secrets
import os

# Конфигурация OAuth
config = Config('.env')
oauth = OAuth(config)

# Получение FRONTEND_URL из env или используем default
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ВАЖНО: Для использования Google OAuth необходимо:
# 1. Создать проект в Google Cloud Console
# 2. Включить Google+ API
# 3. Создать OAuth 2.0 credentials
# 4. Добавить redirect URI: http://localhost:3000/auth/google/callback
# 5. Добавить в .env:
#    GOOGLE_CLIENT_ID=your_client_id
#    GOOGLE_CLIENT_SECRET=your_client_secret

try:
    oauth.register(
        name='google',
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
except Exception as e:
    print(f"Google OAuth not configured: {e}")

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])


@router.get("/login")
async def google_login(request: Request):
    """
    Перенаправление на Google для аутентификации
    """
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Callback от Google после успешной аутентификации
    Перенаправляет на фронтенд с токенами в URL
    """
    try:
        # Получение токена от Google
        token = await oauth.google.authorize_access_token(request)
        
        # Получение информации о пользователе
        user_info = token.get('userinfo')
        if not user_info:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=no_user_info"
            )
        
        email = user_info.get('email')
        name = user_info.get('name')
        google_id = user_info.get('sub')
        
        if not email:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=no_email"
            )
        
        # Поиск существующего пользователя
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        is_new_user = False
        if not user:
            # Создание нового пользователя
            username = email.split('@')[0] + '_' + secrets.token_hex(4)
            
            user = User(
                username=username,
                email=email,
                password_hash=secrets.token_hex(32),  # Случайный пароль (не используется)
                email_verified=True,  # Google уже подтвердил email
                role=UserRole.USER
            )
            db.add(user)
            await db.flush()
            is_new_user = True
        
        # Генерация session_token
        session_token = generate_session_token()
        user.session_token = session_token
        user.last_login = datetime.now(timezone.utc)
        
        # Логирование
        await log_audit_event(
            db=db,
            operation=OperationType.LOGIN_SUCCESS if not is_new_user else OperationType.REGISTRATION,
            status=StatusType.SUCCESS,
            user=user,
            ip_address=get_client_ip(request),
            details=f"Вход через Google OAuth. Email: {email}"
        )
        
        await db.commit()
        
        # Создание JWT токенов
        token_data = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role.value,
            "session": session_token
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Перенаправление на фронтенд с токенами в URL
        redirect_url = f"{FRONTEND_URL}/auth/google/success?access_token={access_token}&refresh_token={refresh_token}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        # В случае ошибки перенаправляем на страницу входа с сообщением
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=oauth_failed&message={str(e)}"
        )

