import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OwnerArticleReview, type DashboardArticle } from "@/components/articles-panel";
import { articleBatchMessage, isArticleBatchActive, ownerArticleLiveHref, type OwnerArticleBatch } from "./owner-article-state";

const article: DashboardArticle = {
  id: "article-1", slug: "bread-guide", title: "Bread guide", excerpt: "Fresh bread",
  locale: "en", status: "DRAFT", topicTitle: "Bread", publishedAt: null, createdAt: "2026-09-06T00:00:00.000Z",
};
const batch: OwnerArticleBatch = {
  id: "batch-1", workflowRunId: "run-1", status: "RUNNING", statusReason: null,
  requestedCount: 4, acceptedCount: 2, rejectedCount: 1,
  createdAt: article.createdAt, completedAt: null,
};

describe("owner article publication and ledger presentation", () => {
  it("requires review before offering approval and never renders bodies in the closed list", () => {
    const html = renderToStaticMarkup(<OwnerArticleReview article={article} baseUrl="/api/sites/bakery/articles" liveUrl="https://bakery.example" isPublished={false} busy={false} onAction={async () => {}} />);
    expect(html).toContain("Review article");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Publish article");
    expect(html).not.toContain("Approve article");
  });
  it("shows pending approval without a live link for private sites", () => {
    const html = renderToStaticMarkup(<OwnerArticleReview article={{ ...article, status: "PUBLISHED" }} baseUrl="/api/sites/bakery/articles" liveUrl="https://bakery.example" isPublished={false} busy={false} onAction={async () => {}} />);
    expect(html).toContain("Approved · pending site publication");
    expect(html).toContain("Return to draft");
    expect(html).not.toContain("View live page");
  });
  it("builds a canonical customer-origin article link", () => {
    expect(ownerArticleLiveHref("https://bakery.example/old?x=1", "bread-guide", true)).toBe("https://bakery.example/blog/bread-guide");
    expect(ownerArticleLiveHref("https://bakery.example", "bread-guide", false)).toBeNull();
    expect(ownerArticleLiveHref("javascript:alert(1)", "bread-guide", true)).toBeNull();
    const html = renderToStaticMarkup(<OwnerArticleReview article={{ ...article, status: "PUBLISHED" }} baseUrl="/api/sites/bakery/articles" liveUrl="https://bakery.example" isPublished busy={false} onAction={async () => {}} />);
    expect(html).toContain('href="https://bakery.example/blog/bread-guide"');
  });
  it("recognizes active batches and explains every durable terminal outcome", () => {
    for (const status of ["QUEUED", "RUNNING"] as const) expect(isArticleBatchActive({ ...batch, status })).toBe(true);
    for (const status of ["SUCCEEDED", "ZERO_OUTPUT", "REJECTED", "SKIPPED", "FAILED"] as const) {
      expect(isArticleBatchActive({ ...batch, status })).toBe(false);
      expect(articleBatchMessage({ ...batch, status }).length).toBeGreaterThan(20);
    }
    expect(articleBatchMessage({ ...batch, status: "SUCCEEDED" })).toContain("2 drafts are ready");
    expect(articleBatchMessage({ ...batch, status: "FAILED" })).toContain("2 saved drafts");
    expect(articleBatchMessage({ ...batch, status: "SKIPPED", statusReason: "SITE_INELIGIBLE" })).toContain("no longer eligible");
  });
  it("provides the shared article surface with publication context on every supported dashboard", async () => {
    for (const file of ["dashboard", "food-retail-dashboard", "local-service-dashboard"]) {
      const source = await Bun.file(new URL(`../../app/dashboard/${file}.tsx`, import.meta.url)).text();
      expect(source).toContain("<ArticlesPanel siteSlug={draft.slug} liveUrl=");
      expect(source).toContain("isPublished={");
      expect(source).toContain("isOwnerOperationEnabled(ownerOperations.articles)");
    }
  });
  it("enforces authorized detail and site-scoped ledger reads in an isolated process", async () => {
    const probe = Bun.spawn([process.execPath, "tests/owner-articles/routes.probe.ts"], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([new Response(probe.stdout).text(), new Response(probe.stderr).text(), probe.exited]);
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0);
    expect(stdout).toContain("owner article routes passed");
  });
});
