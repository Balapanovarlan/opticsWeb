"""
Модель пользователя
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    """Роли пользователей"""
    ADMIN = "admin"
    STAFF = "staff"
    USER = "user"


class User(Base):
    """
    Модель пользователя
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Роль пользователя
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    
    # 2FA настройки
    is_2fa_enabled = Column(Boolean, default=False, nullable=False)
    secret_2fa = Column(String(32), nullable=True)  # TOTP секретный ключ
    
    # Сессия (для инвалидации токенов на других устройствах)
    session_token = Column(String(64), nullable=True)  # Уникальный токен сессии
    
    # Статус аккаунта
    is_active = Column(Boolean, default=True, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    
    # Подтверждение email
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_code = Column(String(6), nullable=True)
    email_verification_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<User {self.username} ({self.role})>"

