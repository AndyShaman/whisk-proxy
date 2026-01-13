/**
 * Утилита сохранения изображений
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Сохранение base64 изображения в файл
 */
export async function saveImage(
  base64Data: string,
  outputDir: string,
  filename: string
): Promise<string> {
  // Создаём папку если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Убираем префикс data:image/png;base64, если есть
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

  const filePath = path.join(outputDir, filename);
  const buffer = Buffer.from(cleanBase64, "base64");

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Генерация имени файла
 */
export function generateFilename(prompt: string, index: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const cleanPrompt = prompt
    .substring(0, 30)
    .replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `${cleanPrompt}_${index + 1}_${timestamp}.png`;
}

/**
 * Чтение изображения из файла в base64
 */
export function readImageAsBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString("base64");
}
