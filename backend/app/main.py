"""
Главный файл приложения FastAPI
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import logging
from logging.handlers import RotatingFileHandler
import os

from app.core.config import settings
from app.db.database import engine
from app.api import auth, twofa, admin, logs, products, google_oauth


# Настройка логирования в файл
os.makedirs("logs", exist_ok=True)

file_handler = RotatingFileHandler(
    "logs/app.log",
    maxBytes=10485760,  # 10MB
    backupCount=10
)
file_handler.setLevel(logging.INFO)
file_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
file_handler.setFormatter(file_formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[
        file_handler,
        logging.StreamHandler()  # Также вывод в консоль
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events"""
    logger.info("Starting up application...")
    logger.info(f"Database URL: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'N/A'}")
    
    # Startup
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await engine.dispose()


# Создание приложения
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Интернет-магазин оптики с системой защиты информации",
    lifespan=lifespan
)


# Session middleware (необходим для Google OAuth)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Глобальный обработчик ошибок
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Обработка всех необработанных исключений"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Внутренняя ошибка сервера"}
    )


# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Логирование всех HTTP запросов"""
    logger.info(f"{request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
    
    try:
        response = await call_next(request)
        logger.info(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {e}", exc_info=True)
        raise


# Подключение роутеров
app.include_router(auth.router)
app.include_router(twofa.router)
app.include_router(admin.router)
app.include_router(logs.router)
app.include_router(products.router)
app.include_router(google_oauth.router)


# Health check
@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.VERSION
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "version": settings.VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

