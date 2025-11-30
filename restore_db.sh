#!/bin/bash
# Скрипт для восстановления базы данных из backup

# Конфигурация
BACKUP_DIR="./backups"
CONTAINER_NAME="optics_postgres"
DB_NAME="optics_db"
DB_USER="postgres"

echo "=== Восстановление БД из backup ==="
echo ""

# Список доступных backup файлов
echo "Доступные backup файлы:"
ls -lh ${BACKUP_DIR}/*.sql.gz 2>/dev/null || ls -lh ${BACKUP_DIR}/*.sql 2>/dev/null

echo ""
echo "Введите имя файла backup (например: optics_db_backup_20250101_120000.sql.gz):"
read BACKUP_FILE

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

if [ ! -f "${BACKUP_PATH}" ]; then
    echo "❌ Файл не найден: ${BACKUP_PATH}"
    exit 1
fi

echo ""
echo "⚠️  ВНИМАНИЕ: Это действие удалит все текущие данные в БД!"
echo "Продолжить? (yes/no)"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Операция отменена"
    exit 0
fi

echo ""
echo "=== Начало восстановления ==="

# Проверка, сжат ли файл
if [[ ${BACKUP_FILE} == *.gz ]]; then
    echo "📦 Распаковка backup..."
    gunzip -c "${BACKUP_PATH}" > "${BACKUP_DIR}/temp_restore.sql"
    RESTORE_FILE="${BACKUP_DIR}/temp_restore.sql"
else
    RESTORE_FILE="${BACKUP_PATH}"
fi

# Остановка backend для безопасности
echo "🛑 Остановка backend..."
docker-compose stop backend

# Удаление существующей БД и создание новой
echo "🗑️  Удаление старой БД..."
docker exec -t ${CONTAINER_NAME} psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec -t ${CONTAINER_NAME} psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"

# Восстановление из backup
echo "📥 Восстановление данных..."
cat "${RESTORE_FILE}" | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}

if [ $? -eq 0 ]; then
    echo "✅ БД успешно восстановлена"
    
    # Удаление временного файла
    if [ -f "${BACKUP_DIR}/temp_restore.sql" ]; then
        rm "${BACKUP_DIR}/temp_restore.sql"
    fi
    
    # Запуск backend
    echo "🚀 Запуск backend..."
    docker-compose start backend
    
    echo ""
    echo "================================="
    echo "✅ Восстановление завершено"
else
    echo "❌ Ошибка при восстановлении БД"
    docker-compose start backend
    exit 1
fi

