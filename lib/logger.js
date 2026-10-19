// Minimal structured logger. Writes one JSON line per event, which Vercel's
// log viewer can search. Callers must only pass non-sensitive metadata:
// never image bytes, base64 data, user-provided text, or API keys.

const SENSITIVE_KEYS = new Set([
  "image", "images", "base64", "data", "apiKey", "api_key", "authorization", "context", "labelText",
]);

function clean(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    if (typeof value === "string" && value.length > 300) {
      out[key] = `${value.slice(0, 300)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function log(level, event, fields) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...clean(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event, fields) => log("info", event, fields),
  warn: (event, fields) => log("warn", event, fields),
  error: (event, fields) => log("error", event, fields),
};
