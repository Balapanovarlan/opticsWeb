"""
API endpoints для двухфакторной аутентификации (2FA)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models.user import User
from app.db.models.audit_log import OperationType, StatusType
from app.auth.dependencies import get_current_user
from app.auth.totp import (
    generate_totp_secret,
    get_totp_uri,
    generate_qr_code,
    verify_totp
)
from app.core.security import verify_password
from app.api.schemas import TwoFAEnable, TwoFAVerify, TwoFADisable, Message
from app.middleware.logging import log_audit_event, get_client_ip

router = APIRouter(prefix="/2fa", tags=["2FA"])


@router.post("/enable", response_model=TwoFAEnable)
async def enable_2fa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Включение двухфакторной аутентификации
    Возвращает секретный ключ и QR код для Google Authenticator
    """
    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA уже включен"
        )
    
    # Генерация секретного ключа
    secret = generate_totp_secret()
    
    # Генерация URI и QR кода
    uri = get_totp_uri(current_user.username, secret)
    qr_code = generate_qr_code(uri)
    
    # Сохранение секрета (пока не подтвержден)
    current_user.secret_2fa = secret
    await db.commit()
    
    # Логирование
    await log_audit_event(
        db=db,
        operation=OperationType.TWO_FA_ENABLED,
        status=StatusType.WARNING,
        user=current_user,
        ip_address=get_client_ip(request),
        details="2FA секрет сгенерирован, ожидается подтверждение"
    )
    
    return TwoFAEnable(
        secret=secret,
        qr_code=qr_code,
        message="Отсканируйте QR код в Google Authenticator и подтвердите с помощью /2fa/verify"
    )


@router.post("/verify", response_model=Message)
async def verify_2fa(
    verify_data: TwoFAVerify,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждение и активация 2FA
    """
    if not current_user.secret_2fa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сначала необходимо включить 2FA через /2fa/enable"
        )
    
    # Проверка TOTP кода
    if not verify_totp(current_user.secret_2fa, verify_data.totp_token):
        await log_audit_event(
            db=db,
            operation=OperationType.TWO_FA_FAILED,
            status=StatusType.FAILED,
            user=current_user,
            ip_address=get_client_ip(request),
            details="Неверный TOTP код при активации 2FA"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный TOTP код"
        )
    
    # Активация 2FA
    current_user.is_2fa_enabled = True
    await db.commit()
    
    # Логирование успешной активации
    await log_audit_event(
        db=db,
        operation=OperationType.TWO_FA_ENABLED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=current_user.id,
        details="2FA успешно активирован"
    )
    
    return Message(message="2FA успешно активирован")


@router.post("/disable", response_model=Message)
async def disable_2fa(
    disable_data: TwoFADisable,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Отключение двухфакторной аутентификации
    Требует подтверждение пароля
    """
    if not current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA не включен"
        )
    
    # Проверка пароля
    if not verify_password(disable_data.password, current_user.password_hash):
        await log_audit_event(
            db=db,
            operation=OperationType.TWO_FA_DISABLED,
            status=StatusType.FAILED,
            user=current_user,
            ip_address=get_client_ip(request),
            details="Неверный пароль при попытке отключить 2FA"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный пароль"
        )
    
    # Отключение 2FA
    current_user.is_2fa_enabled = False
    current_user.secret_2fa = None
    await db.commit()
    
    # Логирование
    await log_audit_event(
        db=db,
        operation=OperationType.TWO_FA_DISABLED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=current_user.id,
        details="2FA отключен"
    )
    
    return Message(message="2FA успешно отключен")

