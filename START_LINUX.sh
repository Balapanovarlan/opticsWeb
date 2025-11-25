#!/bin/bash

# Скрипт быстрого запуска для Linux/Mac

set -e

echo "================================================"
echo " OPTICS - Интернет-магазин с СЗИ"
echo " Быстрый запуск для Linux/Mac"
echo "================================================"
echo ""

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker не найден!"
    echo "Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "[ERROR] Docker Compose не найден!"
    exit 1
fi

echo "[1/5] Генерация SSL сертификатов..."
cd nginx
if [ ! -f "ssl/cert.crt" ]; then
    chmod +x generate-cert.sh
    ./generate-cert.sh
else
    echo "SSL сертификаты уже существуют, пропускаем"
fi
cd ..

echo ""
echo "[2/5] Запуск Docker контейнеров..."
docker-compose up -d

echo ""
echo "[3/5] Ожидание запуска PostgreSQL (30 секунд)..."
sleep 30

echo ""
echo "[4/5] Создание миграции БД..."
docker-compose exec -T backend alembic revision --autogenerate -m "Initial migration"
docker-compose exec -T backend alembic upgrade head

echo ""
echo "[5/5] Создание администратора..."
docker-compose exec backend python -m app.scripts.create_admin

echo ""
echo "================================================"
echo " ГОТОВО!"
echo "================================================"
echo ""
echo "Откройте в браузере:"
echo "  https://localhost (или http://localhost)"
echo ""
echo "Тестовые аккаунты:"
echo "  admin / Admin123!"
echo "  staff_user / Staff123!"
echo "  regular_user / User123!"
echo ""
echo "Backend API Docs:"
echo "  http://localhost:8000/docs"
echo ""
echo "Для остановки:"
echo "  docker-compose stop"
echo ""
echo "Для просмотра логов:"
echo "  docker-compose logs -f"
echo ""
echo "================================================"

