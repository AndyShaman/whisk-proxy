/**
 * Whisk API - адаптировано из расширения v7.6.0/injector.js
 */

// API Endpoints
const ENDPOINTS = {
  generate: "https://aisandbox-pa.googleapis.com/v1/whisk:generateImage",
  recipe: "https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe",
  upload: "https://labs.google/fx/api/trpc/backbone.uploadImage",
  caption: "https://labs.google/fx/api/trpc/backbone.captionImage",
};

// Модели
const MODELS = {
  default: "IMAGEN_3_5",
  refSingle: "GEM_PIX",
  refMultiple: "R2I",
};

// Маппинг aspect ratio (user-friendly -> API format)
const ASPECT_RATIO_MAP: Record<string, string> = {
  "1:1": "IMAGE_ASPECT_RATIO_SQUARE",
  "16:9": "IMAGE_ASPECT_RATIO_LANDSCAPE",
  "9:16": "IMAGE_ASPECT_RATIO_PORTRAIT",
  "4:3": "IMAGE_ASPECT_RATIO_LANDSCAPE", // fallback
  "3:4": "IMAGE_ASPECT_RATIO_PORTRAIT", // fallback
  // Также поддерживаем прямые значения API
  "IMAGE_ASPECT_RATIO_SQUARE": "IMAGE_ASPECT_RATIO_SQUARE",
  "IMAGE_ASPECT_RATIO_LANDSCAPE": "IMAGE_ASPECT_RATIO_LANDSCAPE",
  "IMAGE_ASPECT_RATIO_PORTRAIT": "IMAGE_ASPECT_RATIO_PORTRAIT",
};

function normalizeAspectRatio(ratio: string): string {
  return ASPECT_RATIO_MAP[ratio] || "IMAGE_ASPECT_RATIO_SQUARE";
}

export interface GenerateOptions {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  count?: number;
}

export interface ReferenceImage {
  base64: string;
  category: string;
  mediaId?: string;
  caption?: string;
}

export interface GenerateResult {
  success: boolean;
  images?: string[]; // base64 encoded images
  error?: string;
}

/**
 * Генерация изображения через Whisk API
 */
export async function generateImage(
  prompt: string,
  aspectRatio: string,
  accessToken: string
): Promise<GenerateResult> {
  try {
    const sessionId = ";" + Date.now();
    const seed = Math.floor(Math.random() * 2147483647);

    const payload = {
      clientContext: {
        workflowId: "",
        tool: "BACKBONE",
        sessionId,
      },
      imageModelSettings: {
        imageModel: MODELS.default,
        aspectRatio: normalizeAspectRatio(aspectRatio),
      },
      prompt,
      mediaCategory: "MEDIA_CATEGORY_BOARD",
      seed,
    };

    const response = await fetch(ENDPOINTS.generate, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Origin: "https://labs.google",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    const panels = data.imagePanels || [];

    if (panels.length > 0 && panels[0].generatedImages?.length > 0) {
      const images = panels[0].generatedImages.map(
        (img: { encodedImage: string }) => img.encodedImage
      );
      return { success: true, images };
    }

    return { success: false, error: "No image data in response" };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Загрузка референсного изображения
 */
export async function uploadReferenceImage(
  base64Data: string,
  category: string,
  accessToken: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    const sessionId = ";" + Date.now();

    const payload = {
      json: {
        clientContext: {
          workflowId: "",
          sessionId,
        },
        uploadMediaInput: {
          mediaCategory: category,
          rawBytes: base64Data,
        },
      },
    };

    const response = await fetch(ENDPOINTS.upload, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Origin: "https://labs.google",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Upload HTTP ${response.status}` };
    }

    const data = await response.json();
    const mediaId = data?.result?.data?.json?.result?.uploadMediaGenerationId;

    if (mediaId) {
      return { success: true, mediaId };
    }

    return { success: false, error: "No Media ID returned" };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Получение caption для изображения
 */
export async function getCaptionForImage(
  base64Data: string,
  category: string,
  accessToken: string
): Promise<{ success: boolean; caption?: string; error?: string }> {
  try {
    const sessionId = ";" + Date.now();

    const payload = {
      json: {
        clientContext: {
          workflowId: "",
          sessionId,
        },
        captionInput: {
          candidatesCount: 1,
          mediaInput: {
            mediaCategory: category,
            rawBytes: base64Data,
          },
        },
      },
    };

    const response = await fetch(ENDPOINTS.caption, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Origin: "https://labs.google",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Caption HTTP ${response.status}` };
    }

    const data = await response.json();
    const candidates = data?.result?.data?.json?.result?.candidates;

    if (candidates && candidates.length > 0) {
      return { success: true, caption: candidates[0].output || "" };
    }

    return { success: true, caption: "" };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Генерация с референсным изображением
 */
export async function generateWithReference(
  prompt: string,
  aspectRatio: string,
  accessToken: string,
  references: ReferenceImage[]
): Promise<GenerateResult> {
  try {
    const sessionId = ";" + Date.now();
    const seed = Math.floor(Math.random() * 2147483647);

    const recipeMediaInputs = references.map((ref) => ({
      caption: ref.caption || "",
      mediaInput: {
        mediaCategory: ref.category,
        mediaGenerationId: ref.mediaId,
      },
    }));

    const payload = {
      clientContext: {
        workflowId: "",
        tool: "BACKBONE",
        sessionId,
      },
      imageModelSettings: {
        imageModel: references.length === 1 ? MODELS.refSingle : MODELS.refMultiple,
        aspectRatio: normalizeAspectRatio(aspectRatio),
      },
      userInstruction: prompt,
      recipeMediaInputs,
      seed,
    };

    const response = await fetch(ENDPOINTS.recipe, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Origin: "https://labs.google",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const panels = data.imagePanels || [];

    if (panels.length > 0 && panels[0].generatedImages?.length > 0) {
      const images = panels[0].generatedImages.map(
        (img: { encodedImage: string }) => img.encodedImage
      );
      return { success: true, images };
    }

    return { success: false, error: "No image data in response" };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Загрузка и анализ референса (upload + caption)
 */
export async function uploadAndAnalyzeReference(
  base64Data: string,
  category: string,
  accessToken: string
): Promise<{ success: boolean; mediaId?: string; caption?: string; error?: string }> {
  // Получаем caption
  const captionResult = await getCaptionForImage(base64Data, category, accessToken);
  const caption = captionResult.success ? captionResult.caption : "";

  // Загружаем изображение
  const uploadResult = await uploadReferenceImage(base64Data, category, accessToken);

  if (uploadResult.success) {
    return {
      success: true,
      mediaId: uploadResult.mediaId,
      caption,
    };
  }

  return { success: false, error: uploadResult.error };
}
