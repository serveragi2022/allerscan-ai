import { handleAnalyze } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/analyze-label
// multipart/form-data: front (file, optional), back (file, optional; at least one required),
// market, context (optional), userAllergens (JSON array, optional)
export async function POST(request) {
  return handleAnalyze(request, "label");
}
