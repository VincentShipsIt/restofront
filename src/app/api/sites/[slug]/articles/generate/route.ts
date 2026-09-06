import { z } from "zod";
import {
  accessFailureResponse,
  getSiteAccess,
} from "@/lib/authorization";
import { isSameOriginMutation } from "@/lib/request-origin";
import { startArticleBatch } from "@/lib/articles/start-batch";
import { getDb } from "@/lib/db";
import { articleGenerationConfigured } from "@/lib/articles/generation";
import { ARTICLE_BATCH_CADENCE_MS } from "@/lib/articles/owner-article-state";
import {
  ARTICLE_MUTATION_GATE_REASON,
  areArticleMutationsGated,
} from "@/lib/articles/mutation-gate";

const generateSchema = z.object({
  count: z.number().int().min(1).max(8).default(4),
});

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sites/[slug]/articles/generate">,
) {
  const { slug } = await params;
  const access = await getSiteAccess(slug);
  if (!access.ok) return accessFailureResponse(access);
  const db = getDb();
  const [site, batch, gated] = await Promise.all([
    db.site.findUnique({
      where: { id: access.site.id },
      select: { status: true, subscription: { select: { status: true } } },
    }),
    db.articleBatch.findFirst({
      where: { siteId: access.site.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, workflowRunId: true, status: true, statusReason: true,
        requestedCount: true, acceptedCount: true, rejectedCount: true,
        createdAt: true, completedAt: true,
      },
    }),
    areArticleMutationsGated(),
  ]);
  const active = batch?.status === "QUEUED" || batch?.status === "RUNNING";
  const eligibleAt = batch && site?.subscription?.status !== "ACTIVE"
    ? new Date(batch.createdAt.getTime() + ARTICLE_BATCH_CADENCE_MS)
    : null;
  const nextEligibleAt = eligibleAt && eligibleAt.getTime() > Date.now() ? eligibleAt : null;
  const unavailableReason = gated ? ARTICLE_MUTATION_GATE_REASON
    : !articleGenerationConfigured() ? "Article generation is not configured."
    : site?.status !== "CLAIMED" && site?.status !== "LIVE" ? "Articles are available once the site is claimed."
    : null;
  return Response.json({
    batch,
    canGenerate: !active && !nextEligibleAt && !unavailableReason,
    nextEligibleAt,
    unavailableReason,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sites/[slug]/articles/generate">,
) {
  if (!isSameOriginMutation(request, { requireOrigin: true })) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { slug } = await params;
  const access = await getSiteAccess(slug);
  if (!access.ok) return accessFailureResponse(access);
  if (await areArticleMutationsGated()) {
    return Response.json(
      { error: ARTICLE_MUTATION_GATE_REASON },
      { status: 503 },
    );
  }

  const parsed = generateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Batch size must be between 1 and 8." },
      { status: 400 },
    );
  }

  const result = await startArticleBatch({
    siteId: access.site.id,
    slug,
    requestedBy: access.user.id,
    count: parsed.data.count,
  });
  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: result.status });
  }
  return Response.json({ ok: true, runId: result.runId });
}
