import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { z } from "zod";
import { generateRestaurantDraft } from "@/lib/ai/restaurant-generation";
import { inspectSource } from "@/lib/importer";
import { limitPublicPreview } from "@/lib/rate-limit";
import { importFailureMessage } from "@/lib/restaurant-import";
import {
  createImportJob,
  ImportConflictError,
  ImportDatabaseUnavailableError,
  persistRestaurantImport,
  recordImportFailure,
  updateImportJob,
} from "@/lib/restaurant-import-persistence";
import { restaurantImportWorkflow } from "@/workflows/restaurant-import";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  source: z.string().trim().min(2).max(500),
});

export async function POST(request: Request) {
  let importJobId: string | null = null;

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

    const importJob = await createImportJob(source);
    importJobId = importJob.id;

    if (process.env.WORKFLOW_ENABLED === "true") {
      const run = await start(restaurantImportWorkflow, [
        source,
        importJob.id,
      ]);
      await updateImportJob(importJob.id, { workflowRunId: run.runId });
      return NextResponse.json({
        mode: "workflow",
        runId: run.runId,
        importJobId: importJob.id,
      });
    }

    await updateImportJob(importJob.id, { status: "CRAWLING" });
    const extracted = await inspectSource(source);
    await updateImportJob(importJob.id, { status: "EXTRACTING" });
    await updateImportJob(importJob.id, { status: "GENERATING" });
    const draft = await generateRestaurantDraft(extracted);
    const persisted = await persistRestaurantImport({
      draft,
      source,
      importJobId: importJob.id,
    });
    return NextResponse.json({
      mode: "inline",
      ...persisted,
    });
  } catch (error) {
    if (importJobId) {
      try {
        await recordImportFailure(importJobId, error);
      } catch (recordError) {
        console.error("[restaurant-import] failed to record import error", {
          importJobId,
          error:
            recordError instanceof Error ? recordError.message : "unknown",
        });
      }
    }

    const status =
      error instanceof ImportDatabaseUnavailableError
        ? 503
        : error instanceof ImportConflictError
          ? 409
          : 400;
    const message = importFailureMessage(error);
    return NextResponse.json({ error: message, importJobId }, { status });
  }
}
