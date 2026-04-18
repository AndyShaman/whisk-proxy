# Flow Image Generator — Reference

Detailed reference for the Flow Image Generator skill. For quick-start usage, see [SKILL.md](SKILL.md).

## Aspect Ratios

| Ratio | Resolution | Best for |
|-------|-----------|----------|
| `1:1` | 1024×1024 | Avatars, icons, social media posts |
| `16:9` | 1365×768 | Banners, covers, YouTube thumbnails |
| `9:16` | 768×1365 | Stories, reels, vertical posters |
| `4:3` | Classic landscape | Presentations, photos |
| `3:4` | Classic portrait | Portraits, book covers |

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "No valid token found" | Extension not connected | Install extension, click "Connect" on Flow page |
| "Token expired" | Session cookie expired (~30 days) | Click "Connect" again in extension |
| API Error 403 | Account lacks access | Use a personal Google account (not workspace) |
| API Error 429 | Rate limited | Wait a few minutes and retry |
| "Proxy server not running" | CLI not started | Run `generate.mjs` first — auth server starts automatically |

## Model Details

| Model | Internal ID | Notes |
|-------|------------|-------|
| Imagen 4 (`imagen4`) | `IMAGEN_3_5` | Highest quality, best for photorealistic output |
| Nano Banana (`banana`) | `GEM_PIX` | Faster generation, more creative/artistic style |
| Reference-to-Image (`r2i`) | `R2I` | Style transfer from reference images |

## Rate Limits

The API is free but rate-limited at the Google account level. There are no published rate limits — if you hit 429 errors, wait a few minutes. Prompts in English produce the best results across all models.
