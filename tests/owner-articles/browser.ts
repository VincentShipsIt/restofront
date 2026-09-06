import { chromium, expect } from "@playwright/test";

const bundle = await Bun.build({ entrypoints: ["tests/owner-articles/client.fixture.tsx"], target: "browser", minify: true });
if (!bundle.success) throw new Error(bundle.logs.join("\n"));
const server = Bun.serve({
  hostname: "127.0.0.1", port: 0,
  fetch: (request) => new URL(request.url).pathname === "/client.js"
    ? new Response(bundle.outputs[0], { headers: { "Content-Type": "text/javascript" } })
    : new Response('<html><body><div id="root"></div><script type="module" src="/client.js"></script></body></html>', { headers: { "Content-Type": "text/html" } }),
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let articles: Array<Record<string, unknown>> = [];
  let postCount = 0;
  let detailCount = 0;
  let failRefresh = false;
  let failedRefreshCount = 0;
  let batch: Record<string, unknown> | null = { id: "batch-1", workflowRunId: "run-1", status: "RUNNING", acceptedCount: 0, rejectedCount: 0, requestedCount: 4 };
  let canGenerate = false;
  let nextEligibleAt: string | null = null;
  await page.route("**/api/sites/bakery/articles**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/generate")) {
      if (route.request().method() === "POST") {
        postCount += 1;
        batch = { ...batch, status: "RUNNING" };
        canGenerate = false;
        await route.fulfill({ json: { ok: true, runId: "run-2" } });
      } else if (failRefresh) {
        failedRefreshCount += 1;
        await route.fulfill({ status: 503, json: { error: "Unavailable" } });
      } else await route.fulfill({ json: { batch, canGenerate, nextEligibleAt, unavailableReason: null } });
    } else if (path.endsWith("/article-1")) {
      detailCount += 1;
      await route.fulfill({ json: { article: { ...articles[0], bodyMarkdown: "# Full private body\n\nEvery business detail to review.\n\n<script>alert('unsafe')</script>" } } });
    } else if (route.request().method() === "POST") {
      articles = articles.map((article) => ({ ...article, status: route.request().postDataJSON().action === "publish" ? "PUBLISHED" : "DRAFT" }));
      await route.fulfill({ json: { ok: true } });
    } else await route.fulfill({ json: { articles } });
  });
  await page.goto(server.url.href);
  await expect(page.getByRole("button", { name: "Batch in progress" })).toBeDisabled();
  await expect(page.getByText("Your articles are being written.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Batch in progress" })).toBeDisabled();
  expect(postCount).toBe(0);
  articles = [{ id: "article-1", slug: "bread-guide", title: "Bread guide", excerpt: "A short excerpt", topicTitle: "Bread", status: "DRAFT", locale: "en" }];
  batch = { ...batch, status: "SUCCEEDED", acceptedCount: 1 };
  canGenerate = true;
  await expect(page.getByText("1 draft is ready to review.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Review article" })).toBeVisible();
  expect(detailCount).toBe(0);
  await expect(page.getByRole("button", { name: "Approve article" })).toHaveCount(0);
  await page.getByRole("button", { name: "Review article" }).click();
  await expect(page.getByRole("heading", { name: "Full private body" })).toBeVisible();
  await expect(page.getByText("Every business detail to review.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve article" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Approve article" }).click();
  await expect(page.getByText("Approved · pending site publication")).toBeVisible();
  await expect(page.getByText("Approved. The article will be available when your site is published.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View live page" })).toHaveCount(0);
  await page.goto(`${server.url.href}?live`);
  await expect(page.getByRole("link", { name: "View live page" })).toHaveAttribute("href", "https://bakery.example/blog/bread-guide");
  await page.getByRole("button", { name: "Generate a batch of 4" }).click();
  await expect(page.getByRole("button", { name: "Batch in progress" })).toBeDisabled();
  expect(postCount).toBe(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "Batch in progress" })).toBeDisabled();
  expect(postCount).toBe(1);
  for (const [status, message] of [
    ["ZERO_OUTPUT", "The batch finished without producing drafts."],
    ["REJECTED", "The generated drafts did not pass the content checks."],
    ["SKIPPED", "Generation was skipped because no supported topics"],
    ["FAILED", "Generation failed."],
  ]) {
    batch = { ...batch, status, acceptedCount: 0 };
    nextEligibleAt = "2099-01-01T00:00:00.000Z";
    await page.reload();
    await expect(page.getByText(message!, { exact: false })).toBeVisible();
    await expect(page.getByText("Next batch available", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate a batch of 4" })).toBeDisabled();
  }
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  batch = { ...batch, status: "RUNNING" };
  await page.reload();
  await expect(page.getByText("Your articles are being written.", { exact: false })).toBeVisible();
  await page.waitForLoadState("networkidle");
  failRefresh = true;
  await page.clock.runFor(3000);
  await expect(page.getByText("Could not refresh articles. Retrying in 6 seconds.")).toBeVisible();
  expect(failedRefreshCount).toBe(1);
  for (const [delay, nextDelay, failureCount] of [[6000, 12, 2], [12000, 24, 3], [24000, 48, 4]]) {
    await page.clock.runFor(delay! - 1);
    expect(failedRefreshCount).toBe(failureCount! - 1);
    await page.clock.runFor(1);
    await expect(page.getByText(`Could not refresh articles. Retrying in ${nextDelay} seconds.`)).toBeVisible();
    expect(failedRefreshCount).toBe(failureCount!);
  }
  await page.clock.runFor(48_000);
  await expect(page.getByText("Automatic refresh stopped after repeated failures. Retry to reconnect.")).toBeVisible();
  expect(failedRefreshCount).toBe(5);
  await page.clock.runFor(120_000);
  expect(failedRefreshCount).toBe(5);
  failRefresh = false;
  const reconnected = page.waitForResponse((response) => response.url().endsWith("/generate") && response.status() === 200);
  await page.getByRole("button", { name: "Retry article refresh" }).click();
  await reconnected;
  await expect(page.getByRole("button", { name: "Retry article refresh" })).toHaveCount(0);
  failRefresh = true;
  await page.clock.runFor(3000);
  await expect(page.getByText("Could not refresh articles. Retrying in 6 seconds.")).toBeVisible();
  expect(failedRefreshCount).toBe(6);
  failRefresh = false;
  await page.clock.runFor(6000);
  await expect(page.getByRole("button", { name: "Retry article refresh" })).toHaveCount(0);
  failRefresh = true;
  await page.clock.runFor(3000);
  await expect(page.getByText("Could not refresh articles. Retrying in 6 seconds.")).toBeVisible();
  expect(failedRefreshCount).toBe(7);
  expect(errors).toEqual([]);
  console.log("Owner article browser checks passed: full safe review, approval, live link, restored active generation, duplicate prevention, automatic drafts, every terminal outcome, cadence, bounded exponential refresh backoff, manual recovery and success reset.");
} finally {
  await browser.close();
  server.stop(true);
}
