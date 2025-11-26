"""
Зависимости для аутентификации и авторизации
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.db.database import get_db
from app.db.models.user import User, UserRole
from app.core.security import verify_token


# Bearer схема для токенов (auto_error=False чтобы не выбрасывать 403 автоматически)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Получение текущего пользователя из JWT токена в Authorization header
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Проверяем наличие credentials
    if not credentials:
        logger.warning("[AUTH] No Authorization header provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не предоставлен токен доступа",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Получаем токен из Authorization header
    access_token = credentials.credentials
    
    if not access_token:
        logger.warning("[AUTH] Empty token in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не предоставлен токен доступа",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"[AUTH] Token received, length: {len(access_token)}")
    
    # Проверяем токен
    payload = verify_token(access_token, token_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истекший токен"
        )
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен"
        )
    
    # Конвертируем строку в int
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен (неверный user_id)"
        )
    
    # Получаем пользователя из БД
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован"
        )
    
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Получение активного пользователя"""
    return current_user


def require_role(required_roles: list[UserRole]):
    """
    Dependency для проверки роли пользователя
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join([r.value for r in required_roles])}"
            )
        return current_user
    
    return role_checker


# Готовые dependencies для разных ролей
require_admin = require_role([UserRole.ADMIN])
require_staff = require_role([UserRole.ADMIN, UserRole.STAFF])
require_user = require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.USER])

