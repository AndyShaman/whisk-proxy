/**
 * Auth Server - HTTP сервер для получения токена от Chrome Extension
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { validateToken } from "./token-manager.js";

// Store tokens in user's home directory for cross-platform compatibility
const AUTH_DIR = path.join(os.homedir(), ".whisk-proxy");
const TOKEN_FILE = path.join(AUTH_DIR, "token.json");

const AUTH_PORT = 3847;

let server: http.Server | null = null;

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

/**
 * Запуск HTTP сервера для авторизации
 */
export function startAuthServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve();
      return;
    }

    // Убеждаемся, что папка auth существует
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      // Preflight
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://localhost:${AUTH_PORT}`);

      // POST /auth - получение токена от расширения
      if (req.method === "POST" && url.pathname === "/auth") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const token = data.token || data.accessToken;

            if (!token) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: "No token provided" }));
              return;
            }

            // Валидация токена
            const validation = await validateToken(token);

            if (!validation.valid) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: "Token is invalid or expired" }));
              return;
            }

            // Сохраняем токен
            const tokenData: TokenData = {
              accessToken: token,
              expiresAt: Date.now() + (validation.expiresIn || 3600000),
            };

            fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));

            const minutes = Math.floor((validation.expiresIn || 0) / 60000);
            console.log(`[Auth] Token received and saved. Valid for ${minutes} minutes.`);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: true,
                message: `Connected! Token valid for ${minutes} minutes.`,
                expiresIn: validation.expiresIn,
              })
            );
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
          }
        });
        return;
      }

      // GET /status - проверка статуса
      if (req.method === "GET" && url.pathname === "/status") {
        try {
          if (!fs.existsSync(TOKEN_FILE)) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ connected: false, message: "Not connected" }));
            return;
          }

          const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenData;
          const validation = await validateToken(data.accessToken);

          if (!validation.valid) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ connected: false, message: "Token expired" }));
            return;
          }

          const minutes = Math.floor((validation.expiresIn || 0) / 60000);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              connected: true,
              message: `Connected. Token valid for ${minutes} minutes.`,
              expiresIn: validation.expiresIn,
            })
          );
        } catch {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ connected: false, message: "Error reading token" }));
        }
        return;
      }

      // GET / - простая страница для проверки
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Whisk Proxy</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              h1 { color: #333; }
              .status { padding: 10px; border-radius: 5px; margin: 20px 0; }
              .connected { background: #d4edda; color: #155724; }
              .disconnected { background: #f8d7da; color: #721c24; }
            </style>
          </head>
          <body>
            <h1>Whisk Proxy</h1>
            <div id="status" class="status disconnected">Checking...</div>
            <script>
              fetch('/status')
                .then(r => r.json())
                .then(data => {
                  const el = document.getElementById('status');
                  el.textContent = data.message;
                  el.className = 'status ' + (data.connected ? 'connected' : 'disconnected');
                })
                .catch(() => {
                  document.getElementById('status').textContent = 'Error checking status';
                });
            </script>
          </body>
          </html>
        `);
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.log(`[Auth] Port ${AUTH_PORT} already in use, server may already be running`);
        resolve();
      } else {
        reject(err);
      }
    });

    server.listen(AUTH_PORT, () => {
      console.log(`[Auth] Server listening on http://localhost:${AUTH_PORT}`);
      resolve();
    });
  });
}

/**
 * Остановка сервера
 */
export function stopAuthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Проверка, запущен ли сервер
 */
export function isAuthServerRunning(): boolean {
  return server !== null;
}
