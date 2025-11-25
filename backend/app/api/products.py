"""
API endpoints для каталога товаров (mock)
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.db.database import get_db
from app.db.models.user import User
from app.db.models.audit_log import OperationType, StatusType
from app.auth.dependencies import get_current_user
from app.middleware.logging import log_audit_event, get_client_ip
from pydantic import BaseModel

router = APIRouter(prefix="/products", tags=["Products"])


class Product(BaseModel):
    """Mock модель товара"""
    id: int
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    in_stock: bool = True


# Mock данные
MOCK_PRODUCTS = [
    Product(
        id=1,
        name="Очки Ray-Ban Aviator",
        description="Классические солнцезащитные очки",
        price=12999.00,
        category="Солнцезащитные",
        image_url="https://example.com/rayban-aviator.jpg",
        in_stock=True
    ),
    Product(
        id=2,
        name="Очки для чтения +2.5",
        description="Оправа металлическая, линзы антибликовые",
        price=1999.00,
        category="Для чтения",
        image_url="https://example.com/reading-glasses.jpg",
        in_stock=True
    ),
    Product(
        id=3,
        name="Спортивные очки Oakley",
        description="Для активного отдыха и спорта",
        price=15999.00,
        category="Спортивные",
        image_url="https://example.com/oakley-sport.jpg",
        in_stock=True
    ),
    Product(
        id=4,
        name="Компьютерные очки с фильтром",
        description="Защита от синего света компьютера",
        price=3499.00,
        category="Компьютерные",
        image_url="https://example.com/computer-glasses.jpg",
        in_stock=True
    ),
    Product(
        id=5,
        name="Детские очки Disney",
        description="Яркие оправы для детей 6-12 лет",
        price=2999.00,
        category="Детские",
        image_url="https://example.com/disney-kids.jpg",
        in_stock=False
    ),
]


@router.get("", response_model=List[Product])
async def get_products(
    request: Request,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Получение каталога товаров (mock данные)
    Доступно без авторизации
    """
    products = MOCK_PRODUCTS
    
    # Фильтрация по категории
    if category:
        products = [p for p in products if p.category.lower() == category.lower()]
    
    # Логирование просмотра (без привязки к пользователю если не авторизован)
    try:
        # Попытка получить текущего пользователя (если есть)
        user = None
        access_token = request.cookies.get("access_token")
        if access_token:
            # Можно добавить проверку токена, но для просмотра каталога не обязательно
            pass
        
        await log_audit_event(
            db=db,
            operation=OperationType.PRODUCT_VIEW,
            status=StatusType.SUCCESS,
            user=user,
            ip_address=get_client_ip(request),
            details=f"Просмотр каталога товаров, категория: {category or 'все'}"
        )
    except Exception:
        # Игнорируем ошибки логирования для публичных страниц
        pass
    
    return products


@router.get("/{product_id}", response_model=Product)
async def get_product(
    product_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Получение информации о конкретном товаре
    """
    product = next((p for p in MOCK_PRODUCTS if p.id == product_id), None)
    
    if not product:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Товар не найден"
        )
    
    # Логирование просмотра товара
    try:
        await log_audit_event(
            db=db,
            operation=OperationType.PRODUCT_VIEW,
            status=StatusType.SUCCESS,
            ip_address=get_client_ip(request),
            target_table="products",
            target_id=product_id,
            details=f"Просмотр товара: {product.name}"
        )
    except Exception:
        pass
    
    return product

