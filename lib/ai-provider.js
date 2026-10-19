// Provider-independent vision-model client.
//
// The rest of the app only calls runVisionPrompt(). To add another provider,
// add a function below and register it in PROVIDERS.
//
// Environment variables (server-side only):
//   AI_PROVIDER  "anthropic" (default) or "openai" (any OpenAI-compatible API)
//   AI_API_KEY   API key for the chosen provider
//   AI_MODEL     vision-capable model ID
//   AI_BASE_URL  optional base URL override
//   AI_TIMEOUT_MS optional request timeout (default 55000)

import { logger } from "./logger";

export class AIConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "AIConfigError";
  }
}

export class AIProviderError extends Error {
  constructor(message, { kind, status } = {}) {
    super(message);
    this.name = "AIProviderError";
    this.kind = kind || "unavailable"; // timeout | rate_limited | auth | bad_request | unavailable | empty
    this.status = status;
  }
}

export function getAIConfig() {
  const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || "", 10) || 55000;
  const baseUrl = process.env.AI_BASE_URL || "";
  return { provider, apiKey, model, timeoutMs, baseUrl };
}

export function isAIConfigured() {
  const { provider, apiKey, model } = getAIConfig();
  return Boolean(apiKey && model && PROVIDERS[provider]);
}

function assertConfigured() {
  const config = getAIConfig();
  if (!PROVIDERS[config.provider]) {
    throw new AIConfigError(
      `Unsupported AI_PROVIDER "${config.provider}". Use "anthropic" or "openai".`
    );
  }
  if (!config.apiKey) throw new AIConfigError("AI_API_KEY is not set.");
  if (!config.model) throw new AIConfigError("AI_MODEL is not set.");
  return config;
}

async function postJson(url, { headers, body, timeoutMs, provider }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new AIProviderError("The AI provider took too long to respond.", { kind: "timeout" });
    }
    logger.error("ai_provider_network_error", { provider, message: String(err?.message || err) });
    throw new AIProviderError("Could not reach the AI provider.", { kind: "unavailable" });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      // ignore
    }
    logger.error("ai_provider_http_error", { provider, status: res.status, detail });
    if (res.status === 401 || res.status === 403) {
      throw new AIProviderError("The AI provider rejected the server's credentials.", {
        kind: "auth",
        status: res.status,
      });
    }
    if (res.status === 429) {
      throw new AIProviderError("The AI provider is rate limiting requests.", {
        kind: "rate_limited",
        status: res.status,
      });
    }
    if (res.status >= 500) {
      throw new AIProviderError("The AI provider is temporarily unavailable.", {
        kind: "unavailable",
        status: res.status,
      });
    }
    throw new AIProviderError("The AI provider rejected the request.", {
      kind: "bad_request",
      status: res.status,
    });
  }

  try {
    return await res.json();
  } catch {
    throw new AIProviderError("The AI provider returned an unreadable response.", { kind: "empty" });
  }
}

async function callAnthropic({ system, text, images }, config) {
  const base = (config.baseUrl || "https://api.anthropic.com").replace(/\/$/, "");
  const content = [
    ...images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    })),
    { type: "text", text },
  ];

  const data = await postJson(`${base}/v1/messages`, {
    provider: "anthropic",
    timeoutMs: config.timeoutMs,
    headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
    body: {
      model: config.model,
      max_tokens: 3000,
      temperature: 0,
      system,
      messages: [{ role: "user", content }],
    },
  });

  const out = (data?.content || [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!out) throw new AIProviderError("The AI provider returned no text.", { kind: "empty" });
  return out;
}

async function callOpenAI({ system, text, images }, config) {
  const base = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const userContent = [
    { type: "text", text },
    ...images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
    })),
  ];

  const body = {
    model: config.model,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  };
  // Some OpenAI-compatible gateways do not support JSON mode. Set
  // AI_OPENAI_JSON_MODE=false to turn it off for those.
  if (process.env.AI_OPENAI_JSON_MODE !== "false") {
    body.response_format = { type: "json_object" };
  }
  // Optional: lower "thinking" effort on reasoning models to speed up scans
  // (e.g. "low" or "minimal"; accepted values depend on the provider/model).
  if (process.env.AI_REASONING_EFFORT) {
    body.reasoning_effort = process.env.AI_REASONING_EFFORT;
  }

  const data = await postJson(`${base}/chat/completions`, {
    provider: "openai",
    timeoutMs: config.timeoutMs,
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body,
  });

  const out = data?.choices?.[0]?.message?.content;
  if (typeof out !== "string" || !out.trim()) {
    throw new AIProviderError("The AI provider returned no text.", { kind: "empty" });
  }
  return out.trim();
}

const PROVIDERS = {
  anthropic: callAnthropic,
  openai: callOpenAI,
};

/**
 * Send a prompt plus images to the configured vision model and return raw text.
 * images: [{ mediaType: "image/jpeg", base64: "..." }]
 */
export async function runVisionPrompt({ system, text, images }) {
  const config = assertConfigured();
  return PROVIDERS[config.provider]({ system, text, images }, config);
}
