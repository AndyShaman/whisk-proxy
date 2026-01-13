#!/usr/bin/env node
/**
 * Whisk Proxy - MCP Server для генерации изображений через Google Whisk AI
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  generateImage,
  generateWithReference,
  uploadAndAnalyzeReference,
  ReferenceImage,
} from "./whisk-api.js";
import { getAccessToken, getAuthStatus, interactiveLogin } from "./token-manager.js";
import { saveImage, generateFilename, readImageAsBase64 } from "./file-utils.js";
import { startAuthServer } from "./auth-server.js";
import * as path from "path";

const server = new Server(
  {
    name: "whisk-proxy",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Определение инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "whisk_generate",
        description:
          "Generate images using Google Whisk AI (Imagen 3.5). Saves images to the specified directory.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The text prompt for image generation",
            },
            count: {
              type: "number",
              description: "Number of images to generate (1-10)",
              default: 1,
            },
            aspectRatio: {
              type: "string",
              enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
              description: "Aspect ratio of generated images",
              default: "1:1",
            },
            outputDir: {
              type: "string",
              description:
                "Directory to save images. Default: ./whisk-images in current working directory",
              default: "./whisk-images",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "whisk_generate_with_ref",
        description:
          "Generate images using a reference image. The AI will use the reference as inspiration.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The text prompt describing what to generate",
            },
            referenceImage: {
              type: "string",
              description: "Path to the reference image file",
            },
            count: {
              type: "number",
              description: "Number of images to generate (1-10)",
              default: 1,
            },
            aspectRatio: {
              type: "string",
              enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
              default: "1:1",
            },
            outputDir: {
              type: "string",
              default: "./whisk-images",
            },
          },
          required: ["prompt", "referenceImage"],
        },
      },
      {
        name: "whisk_status",
        description: "Check the connection status and token validity for Whisk API",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "whisk_login",
        description:
          "Open a browser window to log in to Google for Whisk API access. Use this if not authenticated.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Обработка вызовов инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "whisk_generate": {
      const prompt = args?.prompt as string;
      const count = Math.min(10, Math.max(1, (args?.count as number) || 1));
      const aspectRatio = (args?.aspectRatio as string) || "1:1";
      const outputDir = (args?.outputDir as string) || "./whisk-images";

      // Получаем токен
      const token = await getAccessToken();
      if (!token) {
        return {
          content: [
            {
              type: "text",
              text: "Not authenticated. Please run whisk_login first to log in to Google.",
            },
          ],
          isError: true,
        };
      }

      const savedImages: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < count; i++) {
        const result = await generateImage(prompt, aspectRatio, token);

        if (result.success && result.images && result.images.length > 0) {
          const filename = generateFilename(prompt, savedImages.length);
          const filePath = await saveImage(result.images[0], outputDir, filename);
          savedImages.push(filePath);
        } else {
          errors.push(result.error || "Unknown error");
        }

        // Небольшая задержка между запросами
        if (i < count - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (savedImages.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to generate images. Errors: ${errors.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Generated ${savedImages.length} image(s):\n${savedImages.map((p) => `- ${p}`).join("\n")}${errors.length > 0 ? `\n\nErrors: ${errors.join(", ")}` : ""}`,
          },
        ],
      };
    }

    case "whisk_generate_with_ref": {
      const prompt = args?.prompt as string;
      const refPath = args?.referenceImage as string;
      const count = Math.min(10, Math.max(1, (args?.count as number) || 1));
      const aspectRatio = (args?.aspectRatio as string) || "1:1";
      const outputDir = (args?.outputDir as string) || "./whisk-images";

      const token = await getAccessToken();
      if (!token) {
        return {
          content: [
            {
              type: "text",
              text: "Not authenticated. Please run whisk_login first.",
            },
          ],
          isError: true,
        };
      }

      // Читаем референсное изображение
      let refBase64: string;
      try {
        refBase64 = readImageAsBase64(refPath);
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to read reference image: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }

      // Загружаем и анализируем референс
      const uploadResult = await uploadAndAnalyzeReference(
        refBase64,
        "MEDIA_CATEGORY_SUBJECT",
        token
      );

      if (!uploadResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to upload reference: ${uploadResult.error}`,
            },
          ],
          isError: true,
        };
      }

      const reference: ReferenceImage = {
        base64: refBase64,
        category: "MEDIA_CATEGORY_SUBJECT",
        mediaId: uploadResult.mediaId,
        caption: uploadResult.caption,
      };

      const savedImages: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < count; i++) {
        const result = await generateWithReference(prompt, aspectRatio, token, [reference]);

        if (result.success && result.images && result.images.length > 0) {
          const filename = generateFilename(prompt, savedImages.length);
          const filePath = await saveImage(result.images[0], outputDir, filename);
          savedImages.push(filePath);
        } else {
          errors.push(result.error || "Unknown error");
        }

        if (i < count - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (savedImages.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to generate images. Errors: ${errors.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Generated ${savedImages.length} image(s) with reference:\n${savedImages.map((p) => `- ${p}`).join("\n")}`,
          },
        ],
      };
    }

    case "whisk_status": {
      const status = await getAuthStatus();

      if (status.connected) {
        return {
          content: [
            {
              type: "text",
              text: `✓ Connected to Whisk API\nToken expires: ${status.tokenExpires}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: "✗ Not connected. Please run whisk_login to authenticate.",
            },
          ],
        };
      }
    }

    case "whisk_login": {
      const result = await interactiveLogin();

      return {
        content: [
          {
            type: "text",
            text: result.success
              ? `✓ ${result.message}`
              : `✗ ${result.message}`,
          },
        ],
        isError: !result.success,
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// Запуск сервера
async function main() {
  // Запускаем HTTP сервер для авторизации через Chrome Extension
  await startAuthServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Whisk Proxy MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
