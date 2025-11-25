"""
Модель журнала аудита (логирование)
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class OperationType(str, enum.Enum):
    """Типы операций для логирования"""
    # Аутентификация
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    
    # 2FA
    TWO_FA_ENABLED = "2fa_enabled"
    TWO_FA_DISABLED = "2fa_disabled"
    TWO_FA_FAILED = "2fa_failed"
    
    # Пользователи
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_BLOCKED = "user_blocked"
    USER_UNBLOCKED = "user_unblocked"
    
    # Роли
    ROLE_CHANGED = "role_changed"
    
    # Безопасность
    PASSWORD_RESET_ADMIN = "password_reset_admin"
    FORBIDDEN_ACCESS = "forbidden_access"
    
    # Данные
    PRODUCT_VIEW = "product_view"
    DATA_CREATED = "data_created"
    DATA_UPDATED = "data_updated"
    DATA_DELETED = "data_deleted"
    
    # Логи
    LOGS_VIEWED = "logs_viewed"
    
    # Регистрация
    REGISTRATION = "registration"
    
    # Прочее
    UNKNOWN_ACTION = "unknown_action"


class StatusType(str, enum.Enum):
    """Статус операции"""
    SUCCESS = "success"
    FAILED = "failed"
    WARNING = "warning"


class AuditLog(Base):
    """
    Модель журнала аудита
    Хранит все события в системе для обеспечения информационной безопасности
    """
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Информация о пользователе
    user_id = Column(Integer, nullable=True)  # NULL если неаутентифицированный
    username = Column(String(50), nullable=True)  # Логин (даже если вход неуспешен)
    role = Column(String(20), nullable=True)  # Роль на момент события
    
    # Информация об операции
    operation = Column(SQLEnum(OperationType), nullable=False, index=True)
    target_table = Column(String(50), nullable=True)  # Таблица/сущность
    target_id = Column(Integer, nullable=True)  # ID записи
    
    # Статус и детали
    status = Column(SQLEnum(StatusType), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 или IPv6
    details = Column(Text, nullable=True)  # Текстовое описание
    
    def __repr__(self):
        return f"<AuditLog {self.timestamp} - {self.operation} by {self.username}>"

