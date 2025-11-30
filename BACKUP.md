# Резервное копирование и восстановление БД

## Автоматическое резервное копирование

### Linux/Mac

1. **Создание backup:**
```bash
chmod +x backup_db.sh
./backup_db.sh
```

2. **Автоматизация (cron):**
```bash
# Открыть crontab
crontab -e

# Добавить задачу (каждый день в 3:00 AM)
0 3 * * * /path/to/project/backup_db.sh

# Каждые 6 часов
0 */6 * * * /path/to/project/backup_db.sh
```

### Windows

1. **Создание backup:**
```batch
backup_db.bat
```

2. **Автоматизация (Task Scheduler):**
- Открыть Task Scheduler
- Create Basic Task
- Name: "Optics DB Backup"
- Trigger: Daily at 3:00 AM
- Action: Start a program
- Program: `C:\path\to\project\backup_db.bat`

## Восстановление из backup

### Linux/Mac

```bash
chmod +x restore_db.sh
./restore_db.sh
```

Скрипт покажет список доступных backup и попросит выбрать файл для восстановления.

### Ручное восстановление

```bash
# Список backup
ls -lh backups/

# Распаковать (если .gz)
gunzip backups/optics_db_backup_20250101_120000.sql.gz

# Остановить backend
docker-compose stop backend

# Восстановить БД
cat backups/optics_db_backup_20250101_120000.sql | \
  docker exec -i optics_postgres psql -U postgres -d optics_db

# Запустить backend
docker-compose start backend
```

## Структура backup

```
backups/
├── optics_db_backup_20250101_030000.sql.gz
├── optics_db_backup_20250102_030000.sql.gz
└── optics_db_backup_20250103_030000.sql.gz
```

## Политика хранения

- **Автоматическое удаление:** backup старше 30 дней удаляются автоматически
- **Сжатие:** все backup сжимаются gzip для экономии места
- **Рекомендация:** хранить backup на отдельном диске или в облаке

## Облачное хранение backup (опционально)

### AWS S3

```bash
# Установить AWS CLI
pip install awscli

# Настроить credentials
aws configure

# Загрузить backup
aws s3 cp backups/optics_db_backup_*.sql.gz s3://your-bucket/backups/
```

### Google Drive (rclone)

```bash
# Установить rclone
curl https://rclone.org/install.sh | sudo bash

# Настроить Google Drive
rclone config

# Синхронизация
rclone sync backups/ gdrive:optics_backups/
```

## Проверка целостности backup

```bash
# Проверить backup
gunzip -t backups/optics_db_backup_20250101_120000.sql.gz

# Если OK, вывод будет пустым
# Если ошибка, будет сообщение об ошибке
```

## Восстановление на новом сервере

1. Скопировать backup на новый сервер
2. Развернуть проект (docker-compose up)
3. Запустить restore_db.sh
4. Выбрать backup файл

## Частота backup

**Рекомендации:**

- **Development:** 1 раз в день
- **Production:** каждые 6 часов
- **Critical systems:** каждый час + continuous WAL archiving

## Мониторинг backup

Добавить в cron уведомления:

```bash
#!/bin/bash
./backup_db.sh

if [ $? -eq 0 ]; then
    echo "✅ Backup успешен" | mail -s "DB Backup OK" admin@example.com
else
    echo "❌ Backup FAILED" | mail -s "DB Backup FAILED" admin@example.com
fi
```

## Размер backup

Средний размер backup (в зависимости от данных):

- Пустая БД: ~1-2 KB
- С данными (1000 пользователей + логи): ~100-500 KB
- Год работы системы: ~5-10 MB

Сжатие gzip уменьшает размер в 5-10 раз.

