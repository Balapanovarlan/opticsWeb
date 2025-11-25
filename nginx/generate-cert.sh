#!/bin/bash

# Скрипт для генерации самоподписанных SSL сертификатов

mkdir -p ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/cert.key \
  -out ssl/cert.crt \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=Optics/CN=localhost"

echo "✅ SSL сертификаты созданы в папке nginx/ssl/"
echo "⚠️  Это самоподписанные сертификаты для разработки"
echo "   Браузер будет предупреждать о небезопасном подключении"

