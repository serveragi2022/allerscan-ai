import { handleAnalyze } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/analyze-food
// multipart/form-data: image (file), market, context (optional), userAllergens (JSON array, optional)
export async function POST(request) {
  return handleAnalyze(request, "food");
}
