"""
Middleware для логирования запросов
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from app.db.models.audit_log import AuditLog, OperationType, StatusType
from app.db.models.user import User
from typing import Optional
from datetime import datetime, timezone


async def log_audit_event(
    db: AsyncSession,
    operation: OperationType,
    status: StatusType,
    user: Optional[User] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    target_table: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[str] = None
):
    """
    Создание записи в журнале аудита
    
    Args:
        db: Сессия базы данных
        operation: Тип операции
        status: Статус операции (success/failed/warning)
        user: Объект пользователя (если аутентифицирован)
        username: Имя пользователя (для неуспешных входов)
        ip_address: IP адрес клиента
        target_table: Таблица/сущность над которой выполнялось действие
        target_id: ID записи
        details: Дополнительные детали операции
    """
    try:
        log_entry = {
            "timestamp": datetime.now(timezone.utc),
            "user_id": user.id if user else None,
            "username": user.username if user else username,
            "role": user.role.value if user else None,
            "operation": operation,
            "target_table": target_table,
            "target_id": target_id,
            "status": status,
            "ip_address": ip_address,
            "details": details
        }
        
        stmt = insert(AuditLog).values(**log_entry)
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        # Логируем ошибку, но не прерываем основной процесс
        print(f"Error logging audit event: {e}")
        await db.rollback()


def get_client_ip(request) -> str:
    """
    Получение IP адреса клиента с учетом прокси
    """
    # Проверяем заголовки прокси
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback на прямой IP
    if request.client:
        return request.client.host
    
    return "unknown"

