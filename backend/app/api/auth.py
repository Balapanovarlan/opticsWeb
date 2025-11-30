"""
API endpoints для аутентификации
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models.user import User
from app.db.models.audit_log import OperationType, StatusType
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    verify_token,
    generate_session_token
)
from app.auth.totp import verify_totp
from app.auth.dependencies import get_current_user
from app.api.schemas import UserRegister, UserLogin, UserResponse, Message, TokenRefresh
from app.middleware.logging import log_audit_event, get_client_ip
from app.core.email import generate_verification_code, get_verification_expiry, send_verification_email

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
    verification_code = generate_verification_code()
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        email_verification_code=verification_code,
        email_verification_expires=get_verification_expiry(),
        email_verified=False  # Требует подтверждения
    )
    
    db.add(new_user)
    await db.flush()  # Получаем ID
    
    # Отправка email с кодом
    email_sent = await send_verification_email(
        email=new_user.email,
        code=verification_code,
        username=new_user.username
    )
    
    # Логирование успешной регистрации
    await log_audit_event(
        db=db,
        operation=OperationType.REGISTRATION,
        status=StatusType.SUCCESS,
        user=new_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=new_user.id,
        details=f"Зарегистрирован новый пользователь: {new_user.username}. Email: {'отправлен' if email_sent else 'не отправлен'}"
    )
    
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.post("/verify-email", response_model=Message)
async def verify_email(
    username: str = Query(..., description="Имя пользователя"),
    code: str = Query(..., description="Код подтверждения"),
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждение email с помощью кода
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    if user.email_verified:
        return Message(message="Email уже подтвержден")
    
    if not user.email_verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код подтверждения не найден. Запросите новый код."
        )
    
    # Проверка истечения кода
    if user.email_verification_expires and datetime.now(timezone.utc) > user.email_verification_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код подтверждения истек. Запросите новый код."
        )
    
    # Проверка кода
    if user.email_verification_code != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код подтверждения"
        )
    
    # Подтверждение email
    user.email_verified = True
    user.email_verification_code = None
    user.email_verification_expires = None
    await db.commit()
    
    return Message(message="Email успешно подтвержден! Теперь вы можете войти в систему.")


@router.post("/resend-verification", response_model=Message)
async def resend_verification(
    username: str = Query(..., description="Имя пользователя"),
    db: AsyncSession = Depends(get_db)
):
    """
    Повторная отправка кода подтверждения
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    if user.email_verified:
        return Message(message="Email уже подтвержден")
    
    # Генерация нового кода
    verification_code = generate_verification_code()
    user.email_verification_code = verification_code
    user.email_verification_expires = get_verification_expiry()
    await db.commit()
    
    # Отправка email
    await send_verification_email(
        email=user.email,
        code=verification_code,
        username=user.username
    )
    
    return Message(message="Новый код подтверждения отправлен на ваш email")


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
    if not user.email_verified:
        await log_audit_event(
            db=db,
            operation=OperationType.LOGIN_FAILED,
            status=StatusType.FAILED,
            user=user,
            ip_address=get_client_ip(request),
            details="Email не подтвержден"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email не подтвержден. Проверьте вашу почту и введите код подтверждения."
        )
    
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
    
    # Генерация нового session_token (инвалидирует старые токены)
    session_token = generate_session_token()
    user.session_token = session_token
    
    # Создание токенов (sub должен быть строкой!)
    token_data = {
        "sub": str(user.id), 
        "username": user.username, 
        "role": user.role.value,
        "session": session_token  # Добавляем session_token
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    # Обновление времени последнего входа
    user.last_login = datetime.now(timezone.utc)
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
    
    user_id_str = payload.get("sub")
    
    # Конвертируем строку в int
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh токен"
        )
    
    # Получаем пользователя
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active or user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или заблокирован"
        )
    
    # Создание нового access токена (sub должен быть строкой!)
    token_data = {"sub": str(user.id), "username": user.username, "role": user.role.value}
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

