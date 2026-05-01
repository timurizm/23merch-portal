#!/bin/bash
# Двойной клик на этот файл — откроет портал в браузере автоматически
cd "$(dirname "$0")"
echo "🚀 Запускаем 23merch Portal..."
echo ""

# Загружаем переменные из .env если файл существует
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
  echo "✓  .env загружен"
else
  echo "⚠️  Файл .env не найден — AI-ответы будут недоступны"
  echo "   Скопируйте .env.example → .env и вставьте GEMINI_API_KEY"
  echo ""
fi

# проверяем node_modules
if [ ! -d "node_modules" ]; then
  echo "📦 Первый запуск: устанавливаем зависимости..."
  npm install
fi

# убиваем старый процесс если висит
lsof -ti:3000 | xargs kill -9 2>/dev/null

# открываем браузер через секунду
(sleep 3 && open http://localhost:3000) &

# запускаем сервер
node backend/server.js
