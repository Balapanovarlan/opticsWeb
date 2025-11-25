"""
Pydantic схемы для валидации данных
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re
from app.db.models.user import UserRole
from app.db.models.audit_log import OperationType, StatusType


def validate_email(email: str) -> str:
    """Валидация email с поддержкой .local доменов для разработки"""
    if not email:
        raise ValueError("Email не может быть пустым")
    
    # Нормализуем email
    email = email.lower().strip()
    
    # Базовый паттерн для email (более мягкий, разрешает .local, .localhost и другие)
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        raise ValueError("Некорректный формат email")
    
    return email


# ============= Аутентификация =============

class UserRegister(BaseModel):
    """Схема регистрации пользователя"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=8)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_email(v)


class UserLogin(BaseModel):
    """Схема входа"""
    username: str
    password: str
    totp_token: Optional[str] = None  # TOTP код если включен 2FA


class Token(BaseModel):
    """Схема токена"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Схема обновления токена"""
    refresh_token: str


# ============= Пользователь =============

class UserBase(BaseModel):
    """Базовая схема пользователя"""
    username: str
    email: str
    role: UserRole
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_email(v)


class UserResponse(UserBase):
    """Схема ответа с информацией о пользователе"""
    id: int
    is_2fa_enabled: bool
    is_active: bool
    is_blocked: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Создание пользователя администратором"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.USER
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_email(v)


class UserUpdate(BaseModel):
    """Обновление пользователя"""
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    is_active: Optional[bool] = None
    is_blocked: Optional[bool] = None
    role: Optional[UserRole] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validate_email(v)


class UserRoleUpdate(BaseModel):
    """Обновление роли пользователя"""
    role: UserRole


# ============= 2FA =============

class TwoFAEnable(BaseModel):
    """Ответ при включении 2FA"""
    secret: str
    qr_code: str
    message: str


class TwoFAVerify(BaseModel):
    """Проверка TOTP кода"""
    totp_token: str


class TwoFADisable(BaseModel):
    """Отключение 2FA"""
    password: str  # Требуем пароль для отключения 2FA


# ============= Логи =============

class AuditLogResponse(BaseModel):
    """Схема записи в журнале аудита"""
    id: int
    timestamp: datetime
    user_id: Optional[int]
    username: Optional[str]
    role: Optional[str]
    operation: OperationType
    target_table: Optional[str]
    target_id: Optional[int]
    status: StatusType
    ip_address: Optional[str]
    details: Optional[str]
    
    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    """Фильтры для журнала аудита"""
    page: int = Field(1, ge=1)
    limit: int = Field(50, ge=1, le=200)
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    role: Optional[str] = None
    operation: Optional[OperationType] = None
    status: Optional[StatusType] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    sort_by: str = Field("timestamp", pattern="^(timestamp|username|role|operation|status)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class AuditLogListResponse(BaseModel):
    """Список логов с пагинацией"""
    total: int
    page: int
    limit: int
    logs: list[AuditLogResponse]


# ============= Прочее =============

class Message(BaseModel):
    """Общая схема сообщения"""
    message: str


class ErrorResponse(BaseModel):
    """Схема ошибки"""
    detail: str

