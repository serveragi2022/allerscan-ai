// Rate limiting for the analyze endpoints.
//
// Production: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (for
// example through the Upstash Redis integration in the Vercel Marketplace).
// That gives one shared counter across all serverless instances.
//
// Without those variables an in-memory limiter is used. It only protects a
// single warm instance, so it is a best-effort safeguard, not a guarantee.

const WINDOW_SECONDS = 60;

function getLimit() {
  const n = Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

const memoryBuckets = new Map();

function memoryLimit(key, limit) {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets) {
      if (v.resetAt <= now) memoryBuckets.delete(k);
    }
  }

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfter: WINDOW_SECONDS };
  }
  bucket.count += 1;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter,
  };
}

async function upstashLimit(key, limit) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redisKey = `allerscan:rl:${key}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}`;

  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, WINDOW_SECONDS],
    ]),
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
  const data = await res.json();
  const count = Number(data?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error("Unexpected Upstash response");
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: WINDOW_SECONDS,
  };
}

export async function checkRateLimit(key) {
  const limit = getLimit();
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashLimit(key, limit);
    } catch {
      // Fall back to the in-memory limiter rather than failing the request.
      return memoryLimit(key, limit);
    }
  }
  return memoryLimit(key, limit);
}

export function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip");
  return ip || "unknown";
}
