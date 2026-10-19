export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Simpleng proteksyon: /api/debug-ai?token=XXXX
  const token = new URL(request.url).searchParams.get("token");
  if (!process.env.DEBUG_TOKEN || token !== process.env.DEBUG_TOKEN) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  async function probe(label, headers) {
    try {
      const res = await fetch(`${base}/models`, {
        headers: { "User-Agent": "allerscan-ai/1.0", ...headers },
        signal: AbortSignal.timeout(15000),
      });
      const body = await res.text();
      return {
        label,
        status: res.status,
        contentType: res.headers.get("content-type"),
        cfMitigated: res.headers.get("cf-mitigated"),
        cfRay: res.headers.get("cf-ray"),
        isChallenge: /just a moment|cf-chl/i.test(body),
        snippet: body.slice(0, 150),
      };
    } catch (err) {
      return { label, error: String(err?.message || err) };
    }
  }

  const results = [
    await probe("no-auth", {}),
    await probe("with-key", { Authorization: `Bearer ${process.env.AI_API_KEY}` }),
  ];

  return Response.json({
    base,
    vercelRegion: process.env.VERCEL_REGION,
    time: new Date().toISOString(),
    results,
  });
}