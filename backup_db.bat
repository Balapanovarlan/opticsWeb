@echo off
REM Скрипт для резервного копирования базы данных PostgreSQL (Windows)

REM Конфигурация
set BACKUP_DIR=backups
set CONTAINER_NAME=optics_postgres
set DB_NAME=optics_db
set DB_USER=postgres

REM Получение текущей даты и времени
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set DATE=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=optics_db_backup_%DATE%.sql

REM Создание директории для backup если не существует
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo === Резервное копирование БД ===
echo Дата: %date% %time%
echo Файл: %BACKUP_FILE%
echo =================================

REM Создание backup
docker exec -t %CONTAINER_NAME% pg_dump -U %DB_USER% %DB_NAME% > "%BACKUP_DIR%\%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo ✅ Backup успешно создан: %BACKUP_DIR%\%BACKUP_FILE%
    echo 📦 Backup сохранен
) else (
    echo ❌ Ошибка при создании backup
    exit /b 1
)

echo =================================
echo ✅ Резервное копирование завершено
pause

