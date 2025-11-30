#!/bin/bash
# Скрипт для резервного копирования базы данных PostgreSQL

# Конфигурация
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="optics_db_backup_${DATE}.sql"
CONTAINER_NAME="optics_postgres"
DB_NAME="optics_db"
DB_USER="postgres"

# Создание директории для backup если не существует
mkdir -p ${BACKUP_DIR}

echo "=== Резервное копирование БД ==="
echo "Дата: $(date)"
echo "Файл: ${BACKUP_FILE}"
echo "================================="

# Создание backup
docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✅ Backup успешно создан: ${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Сжатие backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "✅ Backup сжат: ${BACKUP_DIR}/${BACKUP_FILE}.gz"
    
    # Удаление старых backup (старше 30 дней)
    find ${BACKUP_DIR} -name "*.gz" -type f -mtime +30 -delete
    echo "✅ Старые backup удалены (>30 дней)"
    
    # Вывод размера backup
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo "📦 Размер backup: ${BACKUP_SIZE}"
else
    echo "❌ Ошибка при создании backup"
    exit 1
fi

echo "================================="
echo "✅ Резервное копирование завершено"

