import { NextResponse } from "next/server";
import { isAIConfigured } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lets the UI show a setup message when the AI key is missing.
// Only returns a boolean; never any configuration values.
export async function GET() {
  return NextResponse.json(
    { aiConfigured: isAIConfigured() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
