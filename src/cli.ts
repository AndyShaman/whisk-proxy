#!/usr/bin/env node
/**
 * Whisk CLI - Генерация изображений через командную строку
 *
 * Использование:
 *   npx tsx cli.ts generate "prompt" [options]
 *   npx tsx cli.ts status
 *   npx tsx cli.ts help
 */

import { generateImage } from "./whisk-api.js";
import { getAccessToken, getAuthStatus, validateToken } from "./token-manager.js";
import { saveImage, generateFilename } from "./file-utils.js";
import { startAuthServer, stopAuthServer } from "./auth-server.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Store tokens in user's home directory for cross-platform compatibility
const AUTH_DIR = path.join(os.homedir(), ".whisk-proxy");
const TOKEN_FILE = path.join(AUTH_DIR, "token.json");

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
Whisk CLI - Генерация изображений через Google Imagen 3.5

КОМАНДЫ:
  generate <prompt>   Сгенерировать изображение
  status              Проверить статус подключения
  help                Показать эту справку

ОПЦИИ ДЛЯ generate:
  --count, -c         Количество изображений (1-10, по умолчанию 1)
  --ratio, -r         Соотношение сторон (1:1, 16:9, 9:16, по умолчанию 1:1)
  --output, -o        Папка для сохранения (по умолчанию ./whisk-images)

ПРИМЕРЫ:
  npx tsx cli.ts generate "кот в космосе"
  npx tsx cli.ts generate "логотип кофейни" -c 3 -r 1:1
  npx tsx cli.ts generate "пейзаж" --ratio 16:9 --output ./images

ФОРМАТЫ:
  1:1   - Квадрат (1024x1024)
  16:9  - Горизонтальный (1365x768)
  9:16  - Вертикальный (768x1365)

АВТОРИЗАЦИЯ:
  При первом запуске CLI автоматически запустит сервер авторизации.
  Откройте https://labs.google/fx/tools/whisk и нажмите Connect в расширении.
`);
}

async function checkStatus() {
  const status = await getAuthStatus();

  if (status.connected) {
    console.log(`✓ Подключено к Whisk API`);
    console.log(`  Токен действителен: ${status.tokenExpires}`);
  } else {
    console.log(`✗ Не подключено`);
    console.log(`  Откройте labs.google/fx/tools/whisk и нажмите Connect в расширении`);
  }
}

/**
 * Ожидание авторизации через расширение Chrome
 */
async function waitForAuth(): Promise<string | null> {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║           ТРЕБУЕТСЯ АВТОРИЗАЦИЯ                            ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║  1. Откройте в Chrome: https://labs.google/fx/tools/whisk  ║");
  console.log("║  2. Войдите в Google аккаунт (если не вошли)               ║");
  console.log("║  3. Нажмите на иконку расширения Whisk Proxy               ║");
  console.log("║  4. Нажмите кнопку \"Connect\"                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\nОжидание подключения...\n");

  // Запускаем auth-server
  await startAuthServer();

  // Ждём токен (максимум 5 минут)
  const startTime = Date.now();
  const timeout = 5 * 60 * 1000;
  let dotCount = 0;

  while (Date.now() - startTime < timeout) {
    // Проверяем, появился ли токен
    if (fs.existsSync(TOKEN_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
        const validation = await validateToken(data.accessToken);

        if (validation.valid) {
          console.log("\n✓ Подключено! Токен получен.\n");
          return data.accessToken;
        }
      } catch {
        // Файл ещё не готов
      }
    }

    // Показываем прогресс
    process.stdout.write(".");
    dotCount++;
    if (dotCount % 60 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(` (${elapsed}s)\n`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n✗ Таймаут ожидания. Попробуйте ещё раз.\n");
  return null;
}

async function generate() {
  // Парсим аргументы
  const promptParts: string[] = [];
  let count = 1;
  let ratio = "1:1";
  let outputDir = "./whisk-images";

  let i = 1;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-c" || arg === "--count") {
      count = Math.min(10, Math.max(1, parseInt(args[++i]) || 1));
    } else if (arg === "-r" || arg === "--ratio") {
      ratio = args[++i] || "1:1";
    } else if (arg === "-o" || arg === "--output") {
      outputDir = args[++i] || "./whisk-images";
    } else if (!arg.startsWith("-")) {
      promptParts.push(arg);
    }
    i++;
  }

  const prompt = promptParts.join(" ");

  if (!prompt) {
    console.error("Ошибка: не указан промпт");
    console.log("Использование: npx tsx cli.ts generate \"ваш промпт\"");
    process.exit(1);
  }

  // Проверяем токен
  let token = await getAccessToken();

  // Если токена нет — запускаем авторизацию
  if (!token) {
    token = await waitForAuth();

    if (!token) {
      console.error("✗ Не удалось авторизоваться");
      console.log("  Убедитесь, что:");
      console.log("  1. Расширение Whisk Proxy установлено в Chrome");
      console.log("  2. Вы открыли https://labs.google/fx/tools/whisk");
      console.log("  3. Вы вошли в Google аккаунт");
      console.log("  4. Вы нажали Connect в расширении");
      process.exit(1);
    }
  }

  console.log(`Генерация: "${prompt}"`);
  console.log(`Формат: ${ratio}, Количество: ${count}`);
  console.log("");

  const savedImages: string[] = [];

  for (let j = 0; j < count; j++) {
    if (count > 1) {
      console.log(`[${j + 1}/${count}] Генерация...`);
    }

    const result = await generateImage(prompt, ratio, token);

    if (result.success && result.images && result.images.length > 0) {
      const filename = generateFilename(prompt, savedImages.length);
      const filePath = await saveImage(result.images[0], outputDir, filename);
      savedImages.push(filePath);
      console.log(`✓ Сохранено: ${filePath}`);
    } else {
      console.error(`✗ Ошибка: ${result.error}`);

      // Если ошибка авторизации — пробуем переавторизоваться
      if (result.error?.includes("401") || result.error?.includes("auth")) {
        console.log("\nТокен истёк. Требуется повторная авторизация...");
        token = await waitForAuth();

        if (token) {
          // Повторяем попытку
          j--;
          continue;
        }
      }
    }

    // Задержка между запросами
    if (j < count - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log("");
  console.log(`Готово! Сгенерировано ${savedImages.length} изображений`);

  // Останавливаем auth-server если он запущен
  await stopAuthServer();
}

async function main() {
  switch (command) {
    case "generate":
    case "gen":
    case "g":
      await generate();
      break;

    case "status":
    case "s":
      await checkStatus();
      break;

    case "help":
    case "-h":
    case "--help":
    case undefined:
      printHelp();
      break;

    default:
      console.error(`Неизвестная команда: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Ошибка:", error.message);
  stopAuthServer().finally(() => process.exit(1));
});
