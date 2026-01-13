---
name: whisk
description: Use when user asks to generate, create, or draw an image, photo, picture, logo, illustration, or art. Triggers include 'сгенерируй', 'нарисуй', 'создай картинку', 'сделай фото', 'фотографию', 'изображение', 'иллюстрацию', 'логотип', 'generate image', 'create image', 'draw', 'make a picture', 'visualize'.
---

# Whisk - Image Generation via Google Imagen 3.5

Generate images using Google Whisk AI directly from Claude Code via CLI.

## When to Use

- User asks to generate/create/draw an image, photo, picture
- User wants a logo, illustration, art, or visualization
- Keywords: "нарисуй", "сгенерируй", "создай картинку", "сделай фото", "фотографию", "изображение", "generate", "draw", "create image"

## Workflow (IMPORTANT)

**Before generating an image, ALWAYS ask the user:**

1. **Output folder** — Where to save the image?
   - Default: `./whisk-images`
   - User may specify a different folder

Use `AskUserQuestion` tool with options:
- "По умолчанию (whisk-images)" / "Default (whisk-images)"
- "Указать другую папку" / "Specify another folder"

If user chooses default or doesn't respond, use `./whisk-images`.

## Context Optimization (CRITICAL)

**NEVER read generated images with the Read tool!**

Why: Reading PNG files converts them to base64 and consumes thousands of tokens from context window.

After generation:
1. ✅ Show only the file path to user
2. ✅ Tell user: "Изображение сохранено: <path>"
3. ❌ DO NOT use Read tool on generated .png files
4. ❌ DO NOT display the image inline

User can open the file manually in their file manager or image viewer.

## Quick Reference

| Command | Description |
|---------|-------------|
| `generate "prompt"` | Generate image |
| `generate "prompt" -c 3` | Generate 3 variants |
| `generate "prompt" -r 16:9` | Landscape format |
| `generate "prompt" -o ./folder` | Save to folder |
| `status` | Check auth status |

| Ratio | Size | Use Case |
|-------|------|----------|
| `1:1` | 1024x1024 | Avatars, icons, logos |
| `16:9` | 1365x768 | Banners, landscapes |
| `9:16` | 768x1365 | Stories, posters |

## CLI Usage

**Note:** `WHISK_PROXY_PATH` is the path where whisk-proxy is installed.

```bash
npx tsx WHISK_PROXY_PATH/src/cli.ts generate "your prompt" [options]
```

### Options

- `-c, --count <n>` — Number of images (1-10), default: 1
- `-r, --ratio <ratio>` — Aspect ratio (1:1, 16:9, 9:16), default: 1:1
- `-o, --output <dir>` — Output directory, default: ./whisk-images

### Examples

```bash
# Simple generation
npx tsx WHISK_PROXY_PATH/src/cli.ts generate "cat in space, digital art"

# Multiple variants
npx tsx WHISK_PROXY_PATH/src/cli.ts generate "minimalist coffee shop logo" -c 3

# Landscape banner
npx tsx WHISK_PROXY_PATH/src/cli.ts generate "sunset over ocean" -r 16:9

# Custom output folder
npx tsx WHISK_PROXY_PATH/src/cli.ts generate "abstract background" -o ./assets/bg
```

## Authorization Flow

**CLI handles authorization automatically:**

1. If no token exists, CLI starts auth-server on port 3847
2. CLI shows instructions to user
3. User opens labs.google/fx/tools/whisk in Chrome
4. User clicks Connect in Whisk Proxy extension
5. Extension sends token to localhost:3847
6. CLI receives token and continues generation

**No manual server startup required!**

## Prompt Tips

1. **Be specific:** "orange cat on windowsill" > "cat"
2. **Add style:** "digital art", "watercolor", "photorealistic", "minimalist"
3. **Composition:** "centered", "close-up", "wide angle"
4. **Atmosphere:** "cozy", "dramatic lighting", "vibrant colors"

## Troubleshooting

### "Not authorized" / "Не авторизован"
CLI will automatically show authorization instructions. Follow them:
1. Open https://labs.google/fx/tools/whisk in Chrome
2. Log into Google account
3. Click Connect in Whisk Proxy extension

### "Token expired"
CLI will automatically re-request authorization when token expires.

### Check status
```bash
npx tsx WHISK_PROXY_PATH/src/cli.ts status
```
