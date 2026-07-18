import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { z } from "zod";
import { generateRestaurantDraft } from "@/lib/ai/restaurant-generation";
import { inspectSource } from "@/lib/importer";
import { limitPublicPreview } from "@/lib/rate-limit";
import { restaurantImportWorkflow } from "@/workflows/restaurant-import";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  source: z.string().trim().min(2).max(500),
});

export async function POST(request: Request) {
  try {
    const { source } = requestSchema.parse(await request.json());
    const rateLimit = await limitPublicPreview(request);
    if (!rateLimit.success) {
      const unavailable = rateLimit.reason === "unavailable";
      return NextResponse.json(
        {
          error: unavailable
            ? "Preview generation is temporarily unavailable"
            : "Too many previews from this connection. Try again later.",
        },
        {
          status: unavailable ? 503 : 429,
          headers: {
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.reset),
          },
        },
      );
    }

    if (process.env.WORKFLOW_ENABLED === "true") {
      const run = await start(restaurantImportWorkflow, [source]);
      return NextResponse.json({
        mode: "workflow",
        runId: run.runId,
      });
    }

    const extracted = await inspectSource(source);
    const draft = await generateRestaurantDraft(extracted);
    return NextResponse.json({ mode: "inline", draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import this restaurant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
