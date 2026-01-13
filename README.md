# Whisk Proxy

**Генерируйте изображения с помощью Google Whisk AI прямо из Claude Code**

Generate images with Google Whisk AI directly from Claude Code

---

## Что это такое? / What is this?

**RU:** Whisk Proxy — это инструмент, который позволяет генерировать изображения через нейросеть Google Imagen 3.5 прямо из Claude Code. Вы просто пишете текстовый запрос, и получаете готовое изображение.

**EN:** Whisk Proxy is a tool that lets you generate images using Google's Imagen 3.5 AI directly from Claude Code. Just describe what you want, and get an image.

---

## Возможности / Features

- Генерация изображений по текстовому описанию / Generate images from text
- Разные форматы: квадрат, горизонтальный, вертикальный / Multiple aspect ratios
- Автоматическое сохранение в папку проекта / Auto-save to project folder
- **Автоматическая авторизация** — CLI сам запускает сервер / **Auto auth** — CLI handles server automatically
- **Экономия контекста**: skill загружается только по запросу / **Context-efficient**: skill loads only when needed

---

## Как это работает / How it Works

```
┌────────────────────────────────────────────────────────────────┐
│  Claude Code просит сгенерировать изображение                  │
│                    ↓                                           │
│  Skill вызывает CLI команду                                    │
│                    ↓                                           │
│  CLI проверяет токен:                                          │
│  ├── Есть токен? → Генерация изображения                       │
│  └── Нет токена? → Автоматически запускает auth-server         │
│                    ↓                                           │
│  Пользователь нажимает Connect в расширении Chrome             │
│                    ↓                                           │
│  Токен получен → Генерация изображения                         │
└────────────────────────────────────────────────────────────────┘
```

---

# Инструкция по установке (Русский)

## Шаг 1: Установите Node.js

1. Откройте сайт: https://nodejs.org/
2. Скачайте версию **LTS** (большая зелёная кнопка)
3. Запустите установщик

**Проверка:** откройте Терминал и напишите `node --version`

## Шаг 2: Скачайте и установите Whisk Proxy

```bash
# Скачайте проект (или Download ZIP на GitHub)
git clone https://github.com/AndyShaman/whisk-proxy.git ~/Documents/whisk-proxy

# Перейдите в папку
cd ~/Documents/whisk-proxy

# Установите зависимости
npm install
```

## Шаг 3: Установите расширение Chrome

1. Откройте Chrome → `chrome://extensions/`
2. Включите **"Режим разработчика"** (Developer mode)
3. Нажмите **"Загрузить распакованное расширение"** (Load unpacked)
4. Выберите папку `~/Documents/whisk-proxy/extension`

## Шаг 4: Установите Skill для Claude Code

```bash
# Создайте папку skills
mkdir -p ~/.claude/skills

# Скопируйте skill
cp -r ~/Documents/whisk-proxy/skills/whisk ~/.claude/skills/

# Замените WHISK_PATH на реальный путь
sed -i '' 's|WHISK_PATH|~/Documents/whisk-proxy|g' ~/.claude/skills/whisk/SKILL.md
```

## Готово! Как пользоваться

Откройте Claude Code и попросите:

```
Сгенерируй изображение кота в космосе
```

**При первом запуске:**
1. CLI покажет инструкции по авторизации
2. Откройте https://labs.google/fx/tools/whisk в Chrome
3. Войдите в Google (если не вошли)
4. Нажмите на расширение Whisk Proxy → **Connect**
5. Готово! Изображение сгенерируется автоматически

---

# Installation Guide (English)

## Step 1: Install Node.js

1. Go to: https://nodejs.org/
2. Download the **LTS** version
3. Run the installer

**Verify:** open Terminal and type `node --version`

## Step 2: Download and Install Whisk Proxy

```bash
# Clone the project (or Download ZIP from GitHub)
git clone https://github.com/AndyShaman/whisk-proxy.git ~/Documents/whisk-proxy

# Navigate to folder
cd ~/Documents/whisk-proxy

# Install dependencies
npm install
```

## Step 3: Install Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **"Developer mode"**
3. Click **"Load unpacked"**
4. Select folder `~/Documents/whisk-proxy/extension`

## Step 4: Install Skill for Claude Code

```bash
# Create skills folder
mkdir -p ~/.claude/skills

# Copy skill
cp -r ~/Documents/whisk-proxy/skills/whisk ~/.claude/skills/

# Replace WHISK_PATH with actual path
sed -i '' 's|WHISK_PATH|~/Documents/whisk-proxy|g' ~/.claude/skills/whisk/SKILL.md
```

## Done! How to Use

Open Claude Code and ask:

```
Generate an image of a cat in space
```

**On first run:**
1. CLI will show authorization instructions
2. Open https://labs.google/fx/tools/whisk in Chrome
3. Log into Google (if not logged in)
4. Click Whisk Proxy extension → **Connect**
5. Done! Image will generate automatically

---

## Форматы изображений / Aspect Ratios

| Формат | Размер | Описание |
|--------|--------|----------|
| 1:1 | 1024x1024 | Квадрат / Square |
| 16:9 | 1365x768 | Горизонтальный / Landscape |
| 9:16 | 768x1365 | Вертикальный / Portrait |

---

## Решение проблем / Troubleshooting

### CLI не запускается / CLI doesn't start
```bash
cd ~/Documents/whisk-proxy && npm install
```

### "Token expired"
Нажмите **Reconnect** в расширении / Click **Reconnect** in extension

### Проверка статуса / Check status
```bash
npx tsx ~/Documents/whisk-proxy/src/cli.ts status
```

---

## Структура проекта / Project Structure

```
whisk-proxy/
├── extension/             # Chrome Extension
│   ├── manifest.json
│   ├── popup.html
│   └── popup.js
├── skills/whisk/          # Skill для Claude Code
│   └── SKILL.md
└── src/
    ├── cli.ts             # CLI (запускает auth-server автоматически)
    ├── auth-server.ts     # HTTP сервер для получения токена
    ├── whisk-api.ts       # API генерации
    ├── token-manager.ts   # Управление токенами
    └── file-utils.ts      # Работа с файлами
```

---

## Лицензия / License

MIT

---

## Автор / Author

Создано с помощью Claude Code / Built with Claude Code
