"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { ArticleMarkdown } from "@/components/article-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  articleBatchMessage,
  isArticleBatchActive,
  ownerArticleLiveHref,
  type OwnerArticleGeneration,
} from "@/lib/articles/owner-article-state";

export type DashboardArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  topicTitle: string;
  publishedAt: string | null;
  createdAt: string;
};

type ArticleDetail = Pick<DashboardArticle, "id" | "title" | "status"> & { bodyMarkdown: string };

export function ArticlesPanel({ siteSlug, liveUrl, isPublished, demo = false }: {
  siteSlug: string;
  liveUrl: string;
  isPublished: boolean;
  demo?: boolean;
}) {
  const [articles, setArticles] = useState<DashboardArticle[] | null>(null);
  const [generation, setGeneration] = useState<OwnerArticleGeneration | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const admissionPending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const baseUrl = `/api/sites/${encodeURIComponent(siteSlug)}/articles`;

  const load = useCallback(async (signal?: AbortSignal) => {
    const [articleResponse, generationResponse] = await Promise.all([
      fetch(baseUrl, { cache: "no-store", signal }),
      fetch(`${baseUrl}/generate`, { cache: "no-store", signal }),
    ]);
    if (!articleResponse.ok || !generationResponse.ok) throw new Error("Could not refresh articles.");
    const [data, status] = await Promise.all([
      articleResponse.json() as Promise<{ articles: DashboardArticle[] }>,
      generationResponse.json() as Promise<OwnerArticleGeneration>,
    ]);
    if (signal?.aborted) return;
    setArticles(data.articles);
    setGeneration(status);
    setRefreshError(null);
  }, [baseUrl]);

  const active = isArticleBatchActive(generation?.batch ?? null);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const refresh = async () => {
      let delay = active ? 3000 : 30_000;
      try {
        await load(controller.signal);
        failures = 0;
      } catch {
        if (controller.signal.aborted) return;
        failures += 1;
        delay = Math.min(delay * 2 ** failures, 60_000);
        setRefreshError(failures >= 5
          ? "Automatic refresh stopped after repeated failures. Retry to reconnect."
          : `Could not refresh articles. Retrying in ${delay / 1000} seconds.`);
      } finally {
        if (!controller.signal.aborted && failures < 5) timer = setTimeout(refresh, delay);
      }
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [load, active, demo, refreshAttempt]);

  const act = async (articleId: string, action: "publish" | "unpublish") => {
    setBusyId(articleId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, action }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "That action failed.");
      }
      setNotice(action === "publish"
        ? isPublished ? "Published. The article is available on your site." : "Approved. The article will be available when your site is published."
        : "Returned to draft. The article is no longer publicly available.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const generate = async () => {
    if (admissionPending.current || !generation?.canGenerate) return;
    admissionPending.current = true;
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 4 }),
      });
      const data = await response.json().catch(() => null) as { error?: string; runId?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Generation could not start.");
      setNotice("Your batch has started. Progress is saved even if you leave this page.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed.");
    } finally {
      // Read the ledger even after a lost response or duplicate admission.
      // The server may already have admitted this batch.
      try { await load(); } catch {
        setGeneration(null);
        setRefreshError("Could not confirm generation status. We will retry automatically.");
      }
      admissionPending.current = false;
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Blog articles</CardTitle>
        <CardDescription>
          Articles based on your business information. Read each draft in full and check the details before approving it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {refreshError ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{refreshError}</p> : null}
        {refreshError ? <Button variant="outline" size="sm" onClick={() => {
          setRefreshError(null);
          setRefreshAttempt((attempt) => attempt + 1);
        }}>Retry article refresh</Button> : null}
        {notice ? <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">{notice}</p> : null}
        {!isPublished ? <p className="text-sm text-muted-foreground">Your site is not public yet. Approved articles will become available when you publish the site.</p> : null}
        {demo ? <p className="text-sm text-muted-foreground">Article generation and review are available in your claimed workspace.</p> : articles === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading articles…</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No articles yet. Generate your first batch to create drafts for review.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {articles.map((article) => (
              <OwnerArticleReview key={article.id} article={article} baseUrl={baseUrl} liveUrl={liveUrl} isPublished={isPublished} busy={busyId !== null} onAction={act} />
            ))}
          </ul>
        )}
        {generation?.batch ? <p role="status" className="text-sm">{articleBatchMessage(generation.batch)}</p> : null}
        {generation?.unavailableReason ? <p className="text-sm text-muted-foreground">{generation.unavailableReason}</p> : null}
        {generation?.nextEligibleAt ? <p className="text-sm text-muted-foreground">Next batch available <time dateTime={generation.nextEligibleAt}>{new Date(generation.nextEligibleAt).toLocaleString()}</time>. An active subscription allows more frequent batches.</p> : null}
        <Button onClick={generate} disabled={demo || generating || Boolean(refreshError) || !generation?.canGenerate} size="sm">
          {generating || active ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles />}
          {generating || active ? "Batch in progress" : "Generate a batch of 4"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function OwnerArticleReview({ article, baseUrl, liveUrl, isPublished, busy, onAction }: {
  article: DashboardArticle;
  baseUrl: string;
  liveUrl: string;
  isPublished: boolean;
  busy: boolean;
  onAction: (articleId: string, action: "publish" | "unpublish") => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveHref = article.status === "PUBLISHED" ? ownerArticleLiveHref(liveUrl, article.slug, isPublished) : null;
  const reviewId = `article-review-${article.id}`;

  async function review() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    setLoading(true);
    setReviewed(false);
    setDetail(null);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/${encodeURIComponent(article.id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load the complete article. Close and reopen the review to try again.");
      const data = await response.json() as { article: ArticleDetail };
      setDetail(data.article);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the article.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{article.status === "DRAFT" ? "Draft" : isPublished ? "Live" : "Approved · pending site publication"}</Badge>
            <span className="text-xs text-muted-foreground">{article.topicTitle}</span>
          </div>
          <h3 id={`${reviewId}-title`} className="mt-1 font-medium">{article.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{article.excerpt}</p>
          {liveHref ? <a href={liveHref} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline underline-offset-4">View live page</a> : null}
        </div>
        <Button variant="outline" size="sm" aria-expanded={expanded} aria-controls={reviewId} disabled={loading} onClick={review}>{expanded ? "Close review" : "Review article"}</Button>
        {article.status === "PUBLISHED" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => onAction(article.id, "unpublish")}>{isPublished ? "Unpublish" : "Return to draft"}</Button> : null}
      </div>
      {expanded ? (
        <section id={reviewId} aria-labelledby={`${reviewId}-title`} className="space-y-4 rounded-lg border bg-background p-4">
          {loading ? <p role="status">Loading full article…</p> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {detail ? <>
            <ArticleMarkdown markdown={detail.bodyMarkdown} />
            {article.status === "DRAFT" ? <div className="space-y-3 border-t pt-4">
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />I have read the full article and checked the business details.</label>
              <Button size="sm" disabled={busy || !reviewed} onClick={() => onAction(article.id, "publish")}>{isPublished ? "Publish article" : "Approve article"}</Button>
            </div> : null}
          </> : null}
        </section>
      ) : null}
    </li>
  );
}
