import { NextResponse } from "next/server";
import { AnalyzeRequestSchema } from "./schemas";
import {
  MAX_REQUEST_BYTES,
  MAX_SERVER_IMAGE_BYTES,
  MAX_SERVER_TOTAL_BYTES,
  sniffImageType,
} from "./image-validation";
import { checkRateLimit, clientKey } from "./rate-limit";
import { analyzeImages, AnalysisError } from "./allergen-analyzer";
import { AIConfigError, AIProviderError } from "./ai-provider";
import { logger } from "./logger";

export function errorResponse(status, code, message, extraHeaders = {}) {
  return NextResponse.json({ error: { code, message } }, { status, headers: extraHeaders });
}

// Which form fields carry images for each mode.
const IMAGE_FIELDS = {
  food: [{ field: "image", required: true }],
  label: [
    { field: "front", required: false },
    { field: "back", required: false },
  ],
};

async function readImages(formData, mode) {
  const images = [];
  let total = 0;

  for (const { field } of IMAGE_FIELDS[mode]) {
    const entry = formData.get(field);
    if (!entry || typeof entry === "string") continue;

    if (entry.size === 0) {
      return { error: errorResponse(400, "EMPTY_IMAGE", "One of the images was empty.") };
    }
    if (entry.size > MAX_SERVER_IMAGE_BYTES) {
      return {
        error: errorResponse(413, "IMAGE_TOO_LARGE", "An image is too large. Please try a smaller photo."),
      };
    }
    total += entry.size;
    if (total > MAX_SERVER_TOTAL_BYTES) {
      return { error: errorResponse(413, "IMAGES_TOO_LARGE", "The images together are too large.") };
    }

    const bytes = new Uint8Array(await entry.arrayBuffer());
    const realType = sniffImageType(bytes);
    if (!realType) {
      return {
        error: errorResponse(
          415,
          "UNSUPPORTED_IMAGE",
          "Unsupported or corrupted image. Please use a JPG, PNG or WebP photo."
        ),
      };
    }
    images.push({ mediaType: realType, base64: Buffer.from(bytes).toString("base64"), field });
  }

  if (images.length === 0) {
    return {
      error: errorResponse(
        400,
        "NO_IMAGE",
        mode === "label" ? "Please add at least one photo of the product label." : "Please add a food photo."
      ),
    };
  }
  return { images };
}

function parseFormFields(formData) {
  let userAllergens = [];
  const rawAllergens = formData.get("userAllergens");
  if (typeof rawAllergens === "string" && rawAllergens) {
    try {
      const parsed = JSON.parse(rawAllergens);
      if (Array.isArray(parsed)) userAllergens = parsed;
    } catch {
      // Falls through to schema validation with an empty list.
    }
  }
  const market = formData.get("market");
  const context = formData.get("context");
  return AnalyzeRequestSchema.safeParse({
    market: typeof market === "string" && market ? market : undefined,
    context: typeof context === "string" && context ? context : undefined,
    userAllergens,
  });
}

export async function handleAnalyze(request, mode) {
  const started = Date.now();
  const ip = clientKey(request);

  const limit = await checkRateLimit(`${mode}:${ip}`);
  if (!limit.allowed) {
    logger.warn("rate_limited", { mode });
    return errorResponse(429, "RATE_LIMITED", "Too many scans. Please wait a minute and try again.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_REQUEST_BYTES) {
    return errorResponse(413, "REQUEST_TOO_LARGE", "The upload is too large. Please use smaller images.");
  }

  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("multipart/form-data")) {
    return errorResponse(415, "BAD_CONTENT_TYPE", "Send the request as multipart/form-data.");
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "BAD_FORM", "The upload could not be read.");
  }

  const fields = parseFormFields(formData);
  if (!fields.success) {
    return errorResponse(400, "INVALID_INPUT", "Some of the submitted details were invalid.");
  }

  const { images, error } = await readImages(formData, mode);
  if (error) return error;

  try {
    const result = await analyzeImages({
      mode,
      images: images.map(({ mediaType, base64 }) => ({ mediaType, base64 })),
      market: fields.data.market,
      context: fields.data.context,
      userAllergens: fields.data.userAllergens,
    });

    logger.info("analysis_ok", {
      mode,
      market: fields.data.market,
      imageCount: images.length,
      ms: Date.now() - started,
      overall: result.overallAssessment,
    });
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return mapError(err, mode, started);
  }
}

function mapError(err, mode, started) {
  const ms = Date.now() - started;

  if (err instanceof AIConfigError) {
    logger.error("ai_not_configured", { mode, reason: err.message });
    return errorResponse(
      503,
      "AI_NOT_CONFIGURED",
      "The AI service is not configured on this server. Set AI_API_KEY and AI_MODEL (see the README), then redeploy."
    );
  }
  if (err instanceof AnalysisError) {
    logger.warn("analysis_rejected", { mode, code: err.code, ms });
    return errorResponse(err.status, err.code, err.message);
  }
  if (err instanceof AIProviderError) {
    logger.error("ai_provider_failure", { mode, kind: err.kind, status: err.status, ms });
    switch (err.kind) {
      case "timeout":
        return errorResponse(504, "AI_TIMEOUT", "The analysis took too long. Please try again.");
      case "rate_limited":
        return errorResponse(503, "AI_BUSY", "The AI service is busy right now. Please try again shortly.");
      case "auth":
        return errorResponse(502, "AI_AUTH", "The server could not authenticate with the AI service. The site owner needs to check the API key.");
      case "bad_request":
        return errorResponse(
          502,
          "AI_REQUEST_REJECTED",
          "The AI service rejected the request. Most often AI_MODEL is wrong or does not support images, or AI_BASE_URL is incorrect. Check the server terminal for the provider's message. No result was produced."
        );
      default:
        return errorResponse(502, "AI_UNAVAILABLE", "The AI service could not complete the analysis. No result was produced. Please try again.");
    }
  }

  logger.error("analysis_unexpected_error", { mode, ms, message: String(err?.message || err) });
  return errorResponse(500, "INTERNAL_ERROR", "Something went wrong. No result was produced.");
}
