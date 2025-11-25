"""
API endpoints для аутентификации
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.db.database import get_db
from app.db.models.user import User
from app.db.models.audit_log import OperationType, StatusType
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    verify_token
)
from app.auth.totp import verify_totp
from app.auth.dependencies import get_current_user
from app.api.schemas import UserRegister, UserLogin, UserResponse, Message, TokenRefresh
from app.middleware.logging import log_audit_event, get_client_ip

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация нового пользователя
    """
    # Проверка надежности пароля
    is_valid, message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    
    # Проверка существования пользователя
    result = await db.execute(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        await log_audit_event(
            db=db,
            operation=OperationType.REGISTRATION,
            status=StatusType.FAILED,
            username=user_data.username,
            ip_address=get_client_ip(request),
            details="Пользователь с таким username или email уже существует"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username или email уже существует"
        )
    
    # Создание пользователя
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    
    db.add(new_user)
    await db.flush()  # Получаем ID
    
    # Логирование успешной регистрации
    await log_audit_event(
        db=db,
        operation=OperationType.REGISTRATION,
        status=StatusType.SUCCESS,
        user=new_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=new_user.id,
        details=f"Зарегистрирован новый пользователь: {new_user.username}"
    )
    
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.post("/login")
async def login(
    credentials: UserLogin,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Вход в систему
    """
    # Поиск пользователя
    result = await db.execute(select(User).where(User.username == credentials.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        await log_audit_event(
            db=db,
            operation=OperationType.LOGIN_FAILED,
            status=StatusType.FAILED,
            username=credentials.username,
            ip_address=get_client_ip(request),
            details="Неверный username или пароль"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный username или пароль"
        )
    
    # Проверка статуса аккаунта
    if not user.is_active:
        await log_audit_event(
            db=db,
            operation=OperationType.LOGIN_FAILED,
            status=StatusType.FAILED,
            user=user,
            ip_address=get_client_ip(request),
            details="Аккаунт деактивирован"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован"
        )
    
    if user.is_blocked:
        await log_audit_event(
            db=db,
            operation=OperationType.LOGIN_FAILED,
            status=StatusType.FAILED,
            user=user,
            ip_address=get_client_ip(request),
            details="Аккаунт заблокирован"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован"
        )
    
    # Проверка 2FA если включен
    if user.is_2fa_enabled:
        if not credentials.totp_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Требуется 2FA код"
            )
        
        if not verify_totp(user.secret_2fa, credentials.totp_token):
            await log_audit_event(
                db=db,
                operation=OperationType.TWO_FA_FAILED,
                status=StatusType.FAILED,
                user=user,
                ip_address=get_client_ip(request),
                details="Неверный TOTP код"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный 2FA код"
            )
    
    # Создание токенов
    token_data = {"sub": user.id, "username": user.username, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Обновление времени последнего входа
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Логирование успешного входа
    await log_audit_event(
        db=db,
        operation=OperationType.LOGIN_SUCCESS,
        status=StatusType.SUCCESS,
        user=user,
        ip_address=get_client_ip(request),
        details="Успешный вход в систему"
    )
    
    # Логирование для отладки
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[LOGIN] Tokens created - access: {len(access_token)} chars, refresh: {len(refresh_token)} chars")
    
    # Возвращаем токены в JSON ответе (без cookies)
    response_data = {
        "message": "Успешный вход",
        "user": UserResponse.model_validate(user),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
    
    logger.info(f"[LOGIN] Response prepared, has access_token: {bool(access_token)}, has refresh_token: {bool(refresh_token)}")
    
    return response_data


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Выход из системы
    """
    # Логирование выхода
    await log_audit_event(
        db=db,
        operation=OperationType.LOGOUT,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        details="Выход из системы"
    )
    
    return {"message": "Успешный выход"}


@router.post("/refresh")
async def refresh_token(
    refresh_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление access токена с помощью refresh токена
    """
    refresh_token_value = refresh_data.refresh_token
    
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh токен не предоставлен"
        )
    
    # Проверка refresh токена
    payload = verify_token(refresh_token_value, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh токен"
        )
    
    user_id = payload.get("sub")
    
    # Получаем пользователя
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active or user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или заблокирован"
        )
    
    # Создание нового access токена
    token_data = {"sub": user.id, "username": user.username, "role": user.role.value}
    new_access_token = create_access_token(token_data)
    
    return {
        "message": "Токен обновлен",
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получение информации о текущем пользователе
    """
    return current_user

