# Чеджу · 13–20 мая 2026

Личный одностраничный гайд для поездки на остров Чеджу.

## Что внутри

- **`index.html`** — весь сайт в одном файле. Никаких зависимостей кроме Google Fonts (Fraunces + DM Sans).
- Часы MSK / KST в реальном времени
- Подсветка текущего дня поездки
- Чек-лист действий с сохранением в `localStorage`
- Печатная вёрстка (`@media print`) — можно распечатать как pdf

## Как открыть локально

```bash
# Просто открыть в браузере
open index.html      # macOS
xdg-open index.html  # Linux
start index.html     # Windows
```

Или поднять простой dev-сервер:

```bash
python3 -m http.server 8080
# открыть http://localhost:8080
```

## Как залить на GitHub и захостить через GitHub Pages

```bash
# 1. На github.com создаешь новый репозиторий (например, "jeju-trip")
# 2. В этой папке выполняешь:

git remote add origin https://github.com/USERNAME/jeju-trip.git
git branch -M main
git push -u origin main

# 3. В Settings → Pages выбираешь:
#    Source: Deploy from a branch
#    Branch: main / (root)
#    Save

# 4. Через 1-2 минуты сайт будет доступен по адресу:
#    https://USERNAME.github.io/jeju-trip/
```

## Альтернативы для деплоя

- **Vercel** — drag-and-drop эту папку на vercel.com (5 секунд, кастомный домен)
- **Netlify** — drag-and-drop на app.netlify.com/drop
- **Cloudflare Pages** — подключить репозиторий с GitHub

## Структура

```
jeju-trip/
├── index.html      # всё здесь
├── README.md
└── .gitignore
```

## Что можно править

- Контент дней — секции `<article class="day">` в HTML
- Цветовая палитра — CSS-переменные в `:root`
- Чек-лист — список `<ul class="checklist">`

## Локальное хранение

Чек-боксы сохраняются в браузере под ключом `jeju-trip-checks-v1`. Очистить:

```js
localStorage.removeItem('jeju-trip-checks-v1');
```
