@echo off
REM Скрипт для генерации самоподписанных SSL сертификатов (Windows)

echo Генерация SSL сертификатов...
echo.

REM Создание папки ssl
if not exist "ssl" mkdir ssl

REM Проверка наличия OpenSSL
where openssl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] OpenSSL не найден!
    echo.
    echo Установите OpenSSL:
    echo 1. Через Git for Windows: https://git-scm.com/download/win
    echo 2. Через Chocolatey: choco install openssl
    echo 3. Через scoop: scoop install openssl
    echo 4. Вручную: https://slproweb.com/products/Win32OpenSSL.html
    echo.
    echo Или используйте WSL/Git Bash для запуска generate-cert.sh
    pause
    exit /b 1
)

REM Генерация сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
  -keyout ssl/cert.key ^
  -out ssl/cert.crt ^
  -subj "/C=RU/ST=Moscow/L=Moscow/O=Optics/CN=localhost"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] SSL сертификаты созданы в папке nginx\ssl\
    echo.
    echo [WARNING] Это самоподписанные сертификаты для разработки
    echo Браузер будет предупреждать о небезопасном подключении
    echo.
) else (
    echo [ERROR] Ошибка при генерации сертификатов
    pause
    exit /b 1
)

pause

