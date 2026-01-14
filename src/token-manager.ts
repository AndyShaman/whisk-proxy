/**
 * Token Manager - управление токенами авторизации
 * Работает через Chrome Extension (без Playwright)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "..", "auth");
const TOKEN_FILE = path.join(AUTH_DIR, "token.json");

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenData | null = null;

/**
 * Проверка валидности токена через Google API
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
 * Получение токена из кэша или файла
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

      // Проверяем срок действия
      if (data.expiresAt > Date.now() + 300000) {
        // Валидируем токен через Google API
        const validation = await validateToken(data.accessToken);

        if (validation.valid) {
          cachedToken = data;
          return data.accessToken;
        }
      }
    } catch {
      // Файл повреждён
    }
  }

  return null;
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
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}
