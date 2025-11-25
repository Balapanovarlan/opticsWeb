FROM node:18-alpine

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование остальных файлов
COPY . .

# Порт приложения
EXPOSE 3000

# Запуск dev сервера
CMD ["npm", "start"]

