/**
 * Token Manager - управление авторизацией через Playwright
 */

import { chromium, Browser, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "..", "auth");
const SESSION_FILE = path.join(AUTH_DIR, "session.json");
const TOKEN_FILE = path.join(AUTH_DIR, "token.json");

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenData | null = null;

/**
 * Проверка валидности токена
 */
export async function validateToken(token: string): Promise<{ valid: boolean; expiresIn?: number }> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
    );

    if (response.ok) {
      const data = await response.json();
      const expiresIn = parseInt(data.exp) * 1000 - Date.now();
      return { valid: expiresIn > 60000, expiresIn }; // Минимум 1 минута до истечения
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Получение токена из кэша или обновление
 */
export async function getAccessToken(): Promise<string | null> {
  // Проверяем кэшированный токен в памяти
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.accessToken;
  }

  // Проверяем токен из файла
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenData;
      if (data.expiresAt > Date.now() + 300000) {
        cachedToken = data;
        return data.accessToken;
      }
    } catch {
      // Файл повреждён, продолжаем
    }
  }

  // Пробуем обновить токен через сохранённую сессию
  const newToken = await refreshTokenFromSession();
  if (newToken) {
    return newToken;
  }

  return null;
}

/**
 * Обновление токена через сохранённую сессию Playwright
 */
async function refreshTokenFromSession(): Promise<string | null> {
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      channel: "chrome", // Используем установленный Chrome
    });
    const context = await browser.newContext({
      storageState: SESSION_FILE,
    });

    const page = await context.newPage();
    await page.goto("https://labs.google/fx/tools/whisk", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Получаем токен из сессии
    const token = await page.evaluate(async () => {
      try {
        const response = await fetch("https://labs.google/fx/api/auth/session");
        if (response.status === 200) {
          const data = await response.json();
          return data.access_token || data.accessToken;
        }
      } catch {
        return null;
      }
      return null;
    });

    await browser.close();

    if (token) {
      const validation = await validateToken(token);
      if (validation.valid) {
        const tokenData: TokenData = {
          accessToken: token,
          expiresAt: Date.now() + (validation.expiresIn || 3600000),
        };
        cachedToken = tokenData;
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
        return token;
      }
    }

    return null;
  } catch (error) {
    if (browser) await browser.close();
    console.error("Failed to refresh token:", error);
    return null;
  }
}

/**
 * Интерактивный логин через браузер
 */
export async function interactiveLogin(): Promise<{ success: boolean; message: string }> {
  let browser: Browser | null = null;

  try {
    // Убеждаемся, что папка auth существует
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    browser = await chromium.launch({
      headless: false,
      channel: "chrome", // Используем установленный Chrome вместо Playwright Chromium
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Обрабатываем закрытие браузера пользователем
    let browserClosed = false;
    browser.on("disconnected", () => {
      browserClosed = true;
    });

    await page.goto("https://labs.google/fx/tools/whisk", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    console.log("\n===========================================");
    console.log("Браузер открыт. Пожалуйста:");
    console.log("1. Войдите в свой Google аккаунт");
    console.log("2. Дождитесь загрузки страницы Whisk");
    console.log("3. Браузер закроется автоматически");
    console.log("===========================================\n");

    // Ждём пока пользователь залогинится (максимум 5 минут)
    let token: string | null = null;
    const startTime = Date.now();
    const timeout = 5 * 60 * 1000;

    while (!token && Date.now() - startTime < timeout && !browserClosed) {
      // Простая пауза
      await new Promise((resolve) => setTimeout(resolve, 3000));

      if (browserClosed) break;

      // Проверяем, что мы на правильном домене
      let currentUrl: string;
      try {
        currentUrl = page.url();
      } catch {
        break; // Страница закрыта
      }

      if (!currentUrl.includes("labs.google")) {
        console.log("Ожидание входа в Google...");
        continue;
      }

      try {
        token = await page.evaluate(async () => {
          try {
            const response = await fetch("https://labs.google/fx/api/auth/session");
            if (response.status === 200) {
              const data = await response.json();
              return data.access_token || data.accessToken || null;
            }
          } catch {
            return null;
          }
          return null;
        });
      } catch (e) {
        // Страница ещё загружается или навигация
        console.log("Ожидание загрузки страницы...");
        continue;
      }
    }

    if (token) {
      // Сохраняем сессию
      await context.storageState({ path: SESSION_FILE });

      // Сохраняем токен
      const validation = await validateToken(token);
      const tokenData: TokenData = {
        accessToken: token,
        expiresAt: Date.now() + (validation.expiresIn || 3600000),
      };
      cachedToken = tokenData;
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));

      if (!browserClosed) {
        await browser.close();
      }
      return { success: true, message: "Login successful! Session saved." };
    }

    if (!browserClosed) {
      await browser.close();
    }

    if (browserClosed) {
      return { success: false, message: "Browser was closed. Please try again and complete login." };
    }

    return { success: false, message: "Login timeout. Please try again." };
  } catch (error) {
    try {
      if (browser) await browser.close();
    } catch {}
    return { success: false, message: `Login failed: ${(error as Error).message}` };
  }
}

/**
 * Проверка статуса авторизации
 */
export async function getAuthStatus(): Promise<{
  connected: boolean;
  tokenExpires?: string;
  needsLogin: boolean;
}> {
  const token = await getAccessToken();

  if (!token) {
    return { connected: false, needsLogin: true };
  }

  const validation = await validateToken(token);

  if (!validation.valid) {
    return { connected: false, needsLogin: true };
  }

  const expiresIn = validation.expiresIn || 0;
  const minutes = Math.floor(expiresIn / 60000);

  return {
    connected: true,
    tokenExpires: `in ${minutes} minutes`,
    needsLogin: false,
  };
}

/**
 * Очистка сохранённой сессии
 */
export function clearSession(): void {
  cachedToken = null;
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}

/**
 * Ручное сохранение токена (когда пользователь вводит его сам)
 */
export async function saveTokenManually(
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Убеждаемся, что папка auth существует
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    // Валидируем токен
    const validation = await validateToken(token);

    if (!validation.valid) {
      return {
        success: false,
        message: "Токен недействителен или истёк. Попробуйте получить новый.",
      };
    }

    // Сохраняем токен
    const tokenData: TokenData = {
      accessToken: token,
      expiresAt: Date.now() + (validation.expiresIn || 3600000),
    };

    cachedToken = tokenData;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));

    const minutes = Math.floor((validation.expiresIn || 0) / 60000);
    return {
      success: true,
      message: `Токен сохранён! Действителен ещё ${minutes} минут.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Ошибка сохранения: ${(error as Error).message}`,
    };
  }
}
