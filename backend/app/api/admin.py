"""
API endpoints для администрирования пользователей
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from app.db.database import get_db
from app.db.models.user import User, UserRole
from app.db.models.audit_log import OperationType, StatusType
from app.auth.dependencies import require_admin, require_staff, get_current_user
from app.core.security import hash_password, validate_password_strength
from app.api.schemas import (
    UserResponse,
    UserCreate,
    UserUpdate,
    UserRoleUpdate,
    Message
)
from app.middleware.logging import log_audit_event, get_client_ip

router = APIRouter(prefix="/admin/users", tags=["Admin - Users"])


@router.get("", response_model=List[UserResponse])
async def get_users(
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка всех пользователей
    Доступно для admin и staff
    """
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение информации о конкретном пользователе
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Создание нового пользователя администратором
    Доступно только для admin
    """
    # Проверка надежности пароля
    is_valid, message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    
    # Проверка существования
    result = await db.execute(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username или email уже существует"
        )
    
    # Создание пользователя
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    
    db.add(new_user)
    await db.flush()
    
    # Логирование
    await log_audit_event(
        db=db,
        operation=OperationType.USER_CREATED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=new_user.id,
        details=f"Администратор создал пользователя {new_user.username} с ролью {new_user.role.value}"
    )
    
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление пользователя
    Доступно только для admin
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Обновление полей
    update_details = []
    
    if user_data.email is not None:
        # Проверка уникальности email
        result = await db.execute(
            select(User).where(User.email == user_data.email, User.id != user_id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email уже используется"
            )
        user.email = user_data.email
        update_details.append(f"email={user_data.email}")
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
        update_details.append(f"is_active={user_data.is_active}")
    
    if user_data.is_blocked is not None:
        old_blocked = user.is_blocked
        user.is_blocked = user_data.is_blocked
        update_details.append(f"is_blocked={user_data.is_blocked}")
        
        # Отдельное логирование блокировки/разблокировки
        if old_blocked != user_data.is_blocked:
            operation = OperationType.USER_BLOCKED if user_data.is_blocked else OperationType.USER_UNBLOCKED
            await log_audit_event(
                db=db,
                operation=operation,
                status=StatusType.SUCCESS,
                user=current_user,
                ip_address=get_client_ip(request),
                target_table="users",
                target_id=user.id,
                details=f"Пользователь {user.username} {'заблокирован' if user_data.is_blocked else 'разблокирован'}"
            )
    
    if user_data.role is not None:
        old_role = user.role
        user.role = user_data.role
        update_details.append(f"role={user_data.role.value}")
        
        # Отдельное логирование изменения роли
        if old_role != user_data.role:
            await log_audit_event(
                db=db,
                operation=OperationType.ROLE_CHANGED,
                status=StatusType.SUCCESS,
                user=current_user,
                ip_address=get_client_ip(request),
                target_table="users",
                target_id=user.id,
                details=f"Роль пользователя {user.username} изменена с {old_role.value} на {user_data.role.value}"
            )
    
    await db.commit()
    await db.refresh(user)
    
    # Общее логирование обновления
    if update_details:
        await log_audit_event(
            db=db,
            operation=OperationType.USER_UPDATED,
            status=StatusType.SUCCESS,
            user=current_user,
            ip_address=get_client_ip(request),
            target_table="users",
            target_id=user.id,
            details=f"Обновлены поля: {', '.join(update_details)}"
        )
    
    return user


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Изменение роли пользователя
    Доступно только для admin
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    old_role = user.role
    user.role = role_data.role
    
    await db.commit()
    await db.refresh(user)
    
    # Логирование
    await log_audit_event(
        db=db,
        operation=OperationType.ROLE_CHANGED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=user.id,
        details=f"Роль пользователя {user.username} изменена с {old_role.value} на {role_data.role.value}"
    )
    
    return user


@router.delete("/{user_id}", response_model=Message)
async def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Удаление пользователя
    Доступно только для admin
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить самого себя"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    username = user.username
    
    # Удаление
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    
    # Логирование
    await log_audit_event(
        db=db,
        operation=OperationType.USER_DELETED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=user_id,
        details=f"Удален пользователь {username}"
    )
    
    return Message(message=f"Пользователь {username} успешно удален")


@router.post("/{user_id}/reset-2fa", response_model=Message)
async def reset_2fa(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Сброс 2FA для пользователя
    Доступно только для admin
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    if not user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У пользователя не включен 2FA"
        )
    
    user.is_2fa_enabled = False
    user.secret_2fa = None
    
    await db.commit()
    
    # Логирование
    await log_audit_event(
        db=db,
        operation=OperationType.TWO_FA_DISABLED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        target_table="users",
        target_id=user.id,
        details=f"Администратор сбросил 2FA для пользователя {user.username}"
    )
    
    return Message(message=f"2FA сброшен для пользователя {user.username}")

