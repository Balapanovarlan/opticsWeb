"""
API endpoints для просмотра логов аудита
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional
from datetime import datetime
from app.db.database import get_db
from app.db.models.user import User
from app.db.models.audit_log import AuditLog, OperationType, StatusType
from app.auth.dependencies import require_staff, get_current_user
from app.api.schemas import AuditLogResponse, AuditLogListResponse
from app.middleware.logging import log_audit_event, get_client_ip

router = APIRouter(prefix="/admin/logs", tags=["Admin - Logs"])


@router.get("", response_model=AuditLogListResponse)
async def get_logs(
    request: Request,
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(50, ge=1, le=200, description="Количество записей на странице"),
    from_date: Optional[datetime] = Query(None, description="Дата начала фильтра"),
    to_date: Optional[datetime] = Query(None, description="Дата окончания фильтра"),
    role: Optional[str] = Query(None, description="Фильтр по роли"),
    operation: Optional[OperationType] = Query(None, description="Фильтр по типу операции"),
    status: Optional[StatusType] = Query(None, description="Фильтр по статусу"),
    username: Optional[str] = Query(None, description="Фильтр по имени пользователя"),
    ip_address: Optional[str] = Query(None, description="Фильтр по IP адресу"),
    sort_by: str = Query("timestamp", regex="^(timestamp|username|role|operation|status)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение логов с фильтрацией, сортировкой и пагинацией
    Доступно для admin и staff
    """
    # Построение запроса с фильтрами
    query = select(AuditLog)
    filters = []
    
    if from_date:
        filters.append(AuditLog.timestamp >= from_date)
    
    if to_date:
        filters.append(AuditLog.timestamp <= to_date)
    
    if role:
        filters.append(AuditLog.role == role)
    
    if operation:
        filters.append(AuditLog.operation == operation)
    
    if status:
        filters.append(AuditLog.status == status)
    
    if username:
        filters.append(AuditLog.username.ilike(f"%{username}%"))
    
    if ip_address:
        filters.append(AuditLog.ip_address == ip_address)
    
    if filters:
        query = query.where(and_(*filters))
    
    # Подсчет общего количества
    count_query = select(func.count()).select_from(AuditLog)
    if filters:
        count_query = count_query.where(and_(*filters))
    
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Сортировка
    sort_column = getattr(AuditLog, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Пагинация
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    # Выполнение запроса
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Логирование просмотра логов
    await log_audit_event(
        db=db,
        operation=OperationType.LOGS_VIEWED,
        status=StatusType.SUCCESS,
        user=current_user,
        ip_address=get_client_ip(request),
        details=f"Просмотр логов: страница {page}, фильтры: role={role}, operation={operation}, status={status}"
    )
    
    return AuditLogListResponse(
        total=total,
        page=page,
        limit=limit,
        logs=[AuditLogResponse.model_validate(log) for log in logs]
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_log_detail(
    log_id: int,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение детальной информации о событии
    """
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Лог не найден"
        )
    
    return log


@router.get("/stats/summary")
async def get_logs_summary(
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение статистики по логам
    """
    filters = []
    
    if from_date:
        filters.append(AuditLog.timestamp >= from_date)
    
    if to_date:
        filters.append(AuditLog.timestamp <= to_date)
    
    # Общее количество событий
    total_query = select(func.count()).select_from(AuditLog)
    if filters:
        total_query = total_query.where(and_(*filters))
    
    result = await db.execute(total_query)
    total_events = result.scalar()
    
    # По статусам
    status_query = select(
        AuditLog.status,
        func.count(AuditLog.id).label("count")
    ).group_by(AuditLog.status)
    
    if filters:
        status_query = status_query.where(and_(*filters))
    
    result = await db.execute(status_query)
    by_status = {row.status.value: row.count for row in result}
    
    # По типам операций (топ 10)
    operation_query = select(
        AuditLog.operation,
        func.count(AuditLog.id).label("count")
    ).group_by(AuditLog.operation).order_by(func.count(AuditLog.id).desc()).limit(10)
    
    if filters:
        operation_query = operation_query.where(and_(*filters))
    
    result = await db.execute(operation_query)
    by_operation = {row.operation.value: row.count for row in result}
    
    # По пользователям (топ 10)
    user_query = select(
        AuditLog.username,
        func.count(AuditLog.id).label("count")
    ).where(AuditLog.username.isnot(None)).group_by(AuditLog.username).order_by(func.count(AuditLog.id).desc()).limit(10)
    
    if filters:
        user_query = user_query.where(and_(*filters))
    
    result = await db.execute(user_query)
    by_user = {row.username: row.count for row in result}
    
    return {
        "total_events": total_events,
        "by_status": by_status,
        "top_operations": by_operation,
        "top_users": by_user
    }

