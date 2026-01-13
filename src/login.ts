#!/usr/bin/env node
/**
 * Скрипт для получения токена из Google
 * Запуск: npm run login
 */

import { getAuthStatus, saveTokenManually } from "./token-manager.js";
import * as readline from "readline";

async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║       Whisk Proxy - Авторизация            ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Проверяем текущий статус
  const status = await getAuthStatus();

  if (status.connected) {
    console.log(`✓ Уже авторизован! Токен истекает ${status.tokenExpires}`);
    console.log("Если хотите перелогиниться, удалите папку auth/ и запустите снова.");
    return;
  }

  console.log("Для авторизации выполните следующие шаги:\n");
  console.log("1. Откройте в браузере: https://labs.google/fx/tools/whisk");
  console.log("2. Войдите в свой Google аккаунт (если ещё не вошли)");
  console.log("3. Откройте DevTools (F12 или Cmd+Option+I)");
  console.log("4. Перейдите на вкладку Console");
  console.log("5. Вставьте и выполните эту команду:\n");
  console.log("   fetch('https://labs.google/fx/api/auth/session').then(r=>r.json()).then(d=>console.log(d.accessToken||d.access_token))\n");
  console.log("6. Скопируйте полученный токен (начинается с 'ya29.')\n");

  const token = await askQuestion("Вставьте токен сюда: ");

  if (!token) {
    console.log("\n✗ Токен не введён");
    process.exit(1);
  }

  if (!token.startsWith("ya29.")) {
    console.log("\n⚠ Токен выглядит некорректно (должен начинаться с 'ya29.')");
    const proceed = await askQuestion("Продолжить всё равно? (y/n): ");
    if (proceed.toLowerCase() !== "y") {
      process.exit(1);
    }
  }

  const result = await saveTokenManually(token);

  if (result.success) {
    console.log(`\n✓ ${result.message}`);
    console.log("\nТеперь вы можете использовать Whisk Proxy!");
  } else {
    console.log(`\n✗ ${result.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Ошибка:", error);
  process.exit(1);
});
