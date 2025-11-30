"""
Конфигурация приложения
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Настройки приложения"""
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/optics_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 часа (было 30 минут)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 дней (было 7)
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://localhost:3000,http://localhost,https://localhost,http://127.0.0.1:3000"
    
    @property
    def cors_origins(self) -> List[str]:
        """Парсинг разрешенных origins"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    # Application
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "Optics Security System"
    VERSION: str = "1.0.0"
    
    # Rate Limiting
    LOGIN_ATTEMPTS_LIMIT: int = 5
    LOGIN_ATTEMPTS_WINDOW: int = 300  # 5 minutes
    
    # Google OAuth (optional)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

