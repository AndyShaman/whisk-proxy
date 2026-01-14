# Whisk Proxy

**Генерируйте изображения с помощью Google Whisk AI прямо из Claude Code**

Generate images with Google Whisk AI directly from Claude Code

---

## Что это? | What is this?

Whisk Proxy позволяет генерировать изображения через нейросеть **Google Imagen 3.5** прямо из Claude Code. Просто напишите "сгенерируй картинку кота в космосе" — и получите готовое изображение.

Whisk Proxy lets you generate images using **Google Imagen 3.5** directly from Claude Code. Just ask "generate an image of a cat in space" — and get your image.

---

# Установка | Installation

## Шаг 1: Установите Node.js | Install Node.js

### Windows

1. Откройте https://nodejs.org/
2. Скачайте **LTS** версию (большая зелёная кнопка)
3. Запустите скачанный файл и следуйте инструкциям
4. Перезагрузите компьютер

**Проверка:** откройте **PowerShell** или **Командную строку** и напишите:
```
node --version
```
Если видите номер версии (например, `v20.10.0`) — всё работает!

### Mac

1. Откройте https://nodejs.org/
2. Скачайте **LTS** версию
3. Запустите скачанный `.pkg` файл

**Проверка:** откройте **Терминал** и напишите:
```
node --version
```

### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Или через nvm (рекомендуется)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

---

## Шаг 2: Скачайте Whisk Proxy | Download Whisk Proxy

### Вариант A: Через Git (рекомендуется)

Откройте терминал (PowerShell на Windows) и выполните:

```bash
git clone https://github.com/AndyShaman/whisk-proxy.git
cd whisk-proxy
npm install
```

### Вариант B: Скачать ZIP

1. Откройте https://github.com/AndyShaman/whisk-proxy
2. Нажмите зелёную кнопку **Code** → **Download ZIP**
3. Распакуйте архив в удобную папку
4. Откройте терминал в этой папке и выполните:
```bash
npm install
```

---

## Шаг 3: Установите глобально | Install Globally

Это главный шаг! Выполните в папке проекта:

```bash
npm install -g .
```

**Что это делает:** добавляет команду `whisk` в систему. После этого вы сможете использовать её из любой папки.

**Проверка:**
```bash
whisk --help
```

Если видите справку по командам — установка успешна!

---

## Шаг 4: Установите расширение Chrome | Install Chrome Extension

1. Откройте Chrome
2. Введите в адресной строке: `chrome://extensions/`
3. Включите **Режим разработчика** (переключатель в правом верхнем углу)
4. Нажмите **Загрузить распакованное расширение**
5. Выберите папку `extension` внутри скачанного проекта whisk-proxy

Вы увидите новое расширение **Whisk Proxy** в списке.

---

## Шаг 5: Установите Skill для Claude Code | Install Skill

Скопируйте папку skill:

### Mac/Linux
```bash
mkdir -p ~/.claude/skills
cp -r skills/whisk ~/.claude/skills/
```

### Windows (PowerShell)
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse skills\whisk "$env:USERPROFILE\.claude\skills\"
```

---

# Использование | Usage

## Первый запуск | First Run

1. Откройте Claude Code в любом проекте
2. Попросите: **"Сгенерируй изображение кота в космосе"**
3. Claude покажет инструкции по авторизации:
   - Откройте https://labs.google/fx/tools/whisk в Chrome
   - Войдите в свой Google аккаунт (если не вошли)
   - Нажмите на иконку расширения Whisk Proxy
   - Нажмите кнопку **Connect**
4. Готово! Изображение сгенерируется автоматически

**Авторизация нужна только один раз.** Токен сохраняется локально.

---

## Примеры команд | Examples

```bash
# Простая генерация
whisk generate "закат над океаном, масляная живопись"

# Несколько вариантов
whisk generate "логотип кофейни, минимализм" -c 3

# Горизонтальный формат (для баннеров)
whisk generate "горы на рассвете" -r 16:9

# Вертикальный формат (для сторис)
whisk generate "портрет девушки, аниме стиль" -r 9:16

# Сохранить в определённую папку
whisk generate "абстрактный фон" -o ./my-images

# Проверить статус авторизации
whisk status
```

---

## Форматы изображений | Aspect Ratios

| Формат | Размер | Для чего |
|--------|--------|----------|
| `1:1` | 1024×1024 | Аватары, иконки, логотипы |
| `16:9` | 1365×768 | Баннеры, обложки, пейзажи |
| `9:16` | 768×1365 | Сторис, вертикальные постеры |

---

# Решение проблем | Troubleshooting

## "command not found: whisk"

Глобальная установка не сработала. Попробуйте:

```bash
# Переустановите
npm install -g .

# Или используйте npx (работает без глобальной установки)
npx whisk generate "your prompt"
```

## "Not authorized" / "Не авторизован"

1. Откройте https://labs.google/fx/tools/whisk в Chrome
2. Убедитесь, что вошли в Google аккаунт
3. Нажмите на расширение Whisk Proxy → **Connect**

## "Token expired" / "Токен истёк"

Просто нажмите **Reconnect** в расширении.

## Расширение не видит страницу Whisk

Убедитесь, что:
- Вы на странице https://labs.google/fx/tools/whisk
- Страница полностью загрузилась
- Вы вошли в Google аккаунт

## Проверить статус

```bash
whisk status
```

---

# Как это работает | How it Works

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code: "сгенерируй картинку кота"                    │
│                         ↓                                   │
│  Skill вызывает команду: whisk generate "кот"               │
│                         ↓                                   │
│  CLI проверяет токен:                                       │
│  ├── Есть токен? → Отправляет запрос в Google Whisk API     │
│  └── Нет токена? → Запускает сервер авторизации             │
│                         ↓                                   │
│  При первом запуске:                                        │
│  1. Пользователь открывает labs.google/fx/tools/whisk       │
│  2. Нажимает Connect в расширении Chrome                    │
│  3. Расширение отправляет токен на localhost:3847           │
│                         ↓                                   │
│  Изображение сгенерировано и сохранено!                     │
└─────────────────────────────────────────────────────────────┘
```

---

# Безопасность | Security

- **Токены хранятся только на вашем компьютере** — в папке `auth/`
- **Данные не отправляются на сторонние серверы** — только напрямую в Google API
- **Расширение работает только на localhost:3847** — недоступно извне
- **Исходный код полностью открыт** — проверьте каждую строку
- **Папка auth/ в .gitignore** — токены не попадут в git

---

# Структура проекта | Project Structure

```
whisk-proxy/
├── bin/
│   └── whisk.js           # Глобальная команда (кроссплатформенная)
├── extension/             # Расширение Chrome
│   ├── manifest.json
│   ├── popup.html
│   └── popup.js
├── skills/whisk/          # Skill для Claude Code
│   └── SKILL.md
└── src/
    ├── cli.ts             # CLI (основная логика)
    ├── auth-server.ts     # Сервер авторизации
    ├── whisk-api.ts       # API генерации изображений
    ├── token-manager.ts   # Управление токенами
    └── file-utils.ts      # Работа с файлами
```

---

# Обновление | Update

Чтобы обновить до последней версии:

```bash
cd путь/к/whisk-proxy
git pull
npm install
npm install -g .
```

---

# Лицензия | License

MIT

---

# Автор | Author

**AI Handler** — [Telegram](https://t.me/AI_Handler) | [YouTube](https://www.youtube.com/channel/UCLkP6wuW_P2hnagdaZMBtCw)

Создано с помощью Claude Code | Built with Claude Code
