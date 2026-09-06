import assert from "node:assert/strict";
import { mock } from "bun:test";

let authorized = true;
let articleExists = true;
let queried = 0;
let paid = false;
let batchStatus = "RUNNING";
let gated = false;
const createdAt = new Date();
mock.module("@/lib/authorization", () => ({
  getSiteAccess: async () => authorized ? { ok: true, site: { id: "site-owned" } } : { ok: false, status: 403 },
  accessFailureResponse: () => new Response(null, { status: 403 }),
}));
mock.module("@/lib/db", () => ({
  getDb: () => ({
    article: { findFirst: async (input: { where: unknown }) => {
      queried += 1;
      assert.deepEqual(input.where, { id: "article-1", siteId: "site-owned" });
      return articleExists ? { id: "article-1", bodyMarkdown: "Complete private body", status: "DRAFT" } : null;
    } },
    site: { findUnique: async (input: { where: unknown }) => {
      assert.deepEqual(input.where, { id: "site-owned" });
      return { status: "CLAIMED", subscription: paid ? { status: "ACTIVE" } : null };
    } },
    articleBatch: { findFirst: async (input: { where: unknown }) => {
      assert.deepEqual(input.where, { siteId: "site-owned" });
      return { id: "batch-1", status: batchStatus, createdAt, workflowRunId: "run-1", acceptedCount: 2, rejectedCount: 1 };
    } },
  }),
}));
mock.module("@/lib/articles/start-batch", () => ({ startArticleBatch: async () => ({ ok: true, runId: "run-1" }) }));
mock.module("@/lib/articles/generation", () => ({ articleGenerationConfigured: () => true }));
mock.module("@/lib/articles/mutation-gate", () => ({ areArticleMutationsGated: async () => gated, ARTICLE_MUTATION_GATE_REASON: "Paused" }));

const detail = await import("../../src/app/api/sites/[slug]/articles/[articleId]/route");
const generation = await import("../../src/app/api/sites/[slug]/articles/generate/route");
const request = new Request("https://factory.example/api/sites/bakery/articles/article-1");
const context = { params: Promise.resolve({ slug: "bakery", articleId: "article-1" }) };
let response = await detail.GET(request, context);
assert.equal(response.status, 200);
assert.match(response.headers.get("cache-control") ?? "", /private, no-store/);
assert.equal((await response.json()).article.bodyMarkdown, "Complete private body");
articleExists = false;
response = await detail.GET(request, context);
assert.equal(response.status, 404);
const missingBody = await response.text();
authorized = false;
response = await detail.GET(request, context);
assert.equal(response.status, 404);
assert.equal(await response.text(), missingBody);
assert.equal(queried, 2, "Unauthorized requests must not query articles");
response = await generation.GET(request, context);
assert.equal(response.status, 403);
authorized = true;
response = await generation.GET(request, context);
let data = await response.json();
assert.equal(data.batch.workflowRunId, "run-1");
assert.equal(data.canGenerate, false, "Reload must recover and block an active batch");
assert.equal(data.nextEligibleAt, new Date(createdAt.getTime() + 7 * 24 * 60 * 60_000).toISOString());
batchStatus = "SUCCEEDED";
data = await (await generation.GET(request, context)).json();
assert.equal(data.canGenerate, false, "Unpaid terminal batches must retain cadence");
paid = true;
data = await (await generation.GET(request, context)).json();
assert.equal(data.canGenerate, true);
assert.equal(data.nextEligibleAt, null);
gated = true;
data = await (await generation.GET(request, context)).json();
assert.equal(data.canGenerate, false);
assert.equal(data.unavailableReason, "Paused");
console.log("owner article routes passed");
