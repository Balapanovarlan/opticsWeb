@echo off
REM Скрипт быстрого запуска для Windows

echo ================================================
echo  OPTICS - Интернет-магазин с СЗИ
echo  Быстрый запуск для Windows
echo ================================================
echo.

REM Проверка Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker не найден!
    echo Установите Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Проверка Docker Compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose не найден!
    pause
    exit /b 1
)

echo [1/5] Генерация SSL сертификатов...
cd nginx
set USE_HTTPS=0
if not exist "ssl\cert.crt" (
    echo Попытка генерации SSL сертификатов...
    call generate-cert.bat
    if %ERRORLEVEL% EQU 0 (
        set USE_HTTPS=1
        echo SSL сертификаты успешно созданы
    ) else (
        echo.
        echo [WARNING] OpenSSL не найден, SSL сертификаты не созданы
        echo Система будет работать по HTTP (без HTTPS)
        echo Для HTTPS установите OpenSSL или используйте Git Bash/WSL
        echo.
    )
) else (
    set USE_HTTPS=1
    echo SSL сертификаты уже существуют
)

REM Выбор конфигурации nginx
if %USE_HTTPS%==1 (
    if exist "nginx.conf.https" (
        copy /Y nginx.conf.https nginx.conf >nul
        echo Используем HTTPS конфигурацию nginx
    )
) else (
    copy /Y nginx.conf.http nginx.conf >nul
    echo Используем HTTP конфигурацию nginx
)
cd ..

echo.
echo [2/5] Запуск Docker контейнеров...
docker-compose up -d

echo.
echo [3/5] Ожидание запуска PostgreSQL (30 секунд)...
timeout /t 30 /nobreak

echo.
echo [4/5] Создание миграции БД...
docker-compose exec backend alembic revision --autogenerate -m "Initial migration"
docker-compose exec backend alembic upgrade head

echo.
echo [5/5] Создание администратора...
docker-compose exec backend python -m app.scripts.create_admin

echo.
echo ================================================
echo  ГОТОВО!
echo ================================================
echo.
echo Откройте в браузере:
if exist "nginx\ssl\cert.crt" (
    echo   https://localhost (HTTPS)
) else (
    echo   http://localhost (HTTP - без SSL)
)
echo   или напрямую: http://localhost:3000 (frontend) / http://localhost:8000 (backend)
echo.
echo Тестовые аккаунты:
echo   admin / Admin123!
echo   staff_user / Staff123!
echo   regular_user / User123!
echo.
echo Backend API Docs:
echo   http://localhost:8000/docs
echo.
echo Для остановки:
echo   docker-compose stop
echo.
echo Для просмотра логов:
echo   docker-compose logs -f
echo.
echo ================================================
pause

