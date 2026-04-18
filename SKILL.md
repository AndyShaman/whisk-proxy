---
name: whisk-proxy
description: "Generate images with Google Imagen 4 and Nano Banana for free via Flow API. No API key, no paid subscription — just a Google account and Chrome extension. Use when the user asks to generate, create, or make an image, picture, illustration, logo, banner, or avatar. Triggers: generate image, create picture, make illustration, нарисуй, сгенерируй картинку, создай изображение. Do NOT use for image editing, upscaling, background removal, video generation, or non-Google AI models (DALL-E, Midjourney, Stable Diffusion)."
---

# Flow Image Generator

Generate images using **Google Imagen 4, Nano Banana, and Reference-to-Image** for free. No API key — uses Chrome extension for OAuth.

## Quick Start

```bash
# Generate 4 images (Imagen 4, default)
node {baseDir}/scripts/generate.mjs -p "a cat astronaut floating in space"

# Nano Banana (fast, creative)
node {baseDir}/scripts/generate.mjs -p "abstract painting in neon colors" -m banana

# Reference-to-Image (style transfer)
node {baseDir}/scripts/generate.mjs -p "watercolor portrait" -m r2i

# Portrait format, 1 image
node {baseDir}/scripts/generate.mjs -p "anime girl with headphones" -r 9:16 -c 1

# Save to specific folder
node {baseDir}/scripts/generate.mjs -p "sunset over mountains" -o ./images
```

## Models

| Model | Flag | Best for |
|-------|------|----------|
| Imagen 4 | `-m imagen4` (default) | Highest quality, photorealistic |
| Nano Banana | `-m banana` | Fast, creative generation |
| Reference-to-Image | `-m r2i` | Style transfer |

## Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | required | Image description (English works best) |
| `--model` | `-m` | `imagen4` | Model: imagen4, banana, r2i |
| `--count` | `-c` | `4` | Number of images (1-4) |
| `--ratio` | `-r` | `1:1` | Aspect ratio: `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| `--output` | `-o` | `.` | Output directory |
| `--seed` | `-s` | random | Seed for reproducibility |

## Aspect Ratios

Supported: `1:1` (default), `16:9`, `9:16`, `4:3`, `3:4`. See [REFERENCE.md](REFERENCE.md) for resolutions and use cases.

## Authentication

Token stored in `~/.flow-proxy/token.json`. The Chrome extension handles auth automatically.

### Check token status

```bash
node {baseDir}/scripts/status.mjs
```

### First-time setup

1. Install the Chrome extension from `{baseDir}/extension/` (load unpacked)
2. Open https://labs.google/fx/tools/flow
3. Sign in with Google
4. Click the Flow Proxy extension icon → "Connect"

Token auto-refreshes via session cookie (~30 days). After that, repeat step 4.

### If token is expired

The CLI script auto-detects expired tokens and starts a local auth server.
Just click "Connect" in the Chrome extension — no manual token copying needed.

The agent should check `status.mjs` first. If token is expired, run `generate.mjs` — it will start the auth server and wait for the extension. Tell the user to click "Connect" in the extension.

## Important

- Prompts in **English** produce best results
- The API is free but rate-limited (Google account level)
- Images saved as PNG
- Do NOT read generated PNG files into context — they consume thousands of tokens

See [README.md](README.md) for detailed setup instructions and [REFERENCE.md](REFERENCE.md) for troubleshooting and model details.
