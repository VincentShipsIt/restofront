export const ARTICLE_BATCH_CADENCE_MS = 7 * 24 * 60 * 60_000;

export type OwnerArticleBatch = {
  id: string;
  workflowRunId: string | null;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "ZERO_OUTPUT" | "REJECTED" | "SKIPPED" | "FAILED";
  statusReason: string | null;
  requestedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  createdAt: string;
  completedAt: string | null;
};

export type OwnerArticleGeneration = {
  batch: OwnerArticleBatch | null;
  canGenerate: boolean;
  nextEligibleAt: string | null;
  unavailableReason: string | null;
};

export function isArticleBatchActive(batch: OwnerArticleBatch | null) {
  return batch?.status === "QUEUED" || batch?.status === "RUNNING";
}

export function articleBatchMessage(batch: OwnerArticleBatch): string {
  switch (batch.status) {
    case "QUEUED":
      return "Your batch is queued. You can leave this page; progress is saved.";
    case "RUNNING":
      return "Your articles are being written. Drafts will appear here automatically.";
    case "SUCCEEDED":
      return `${batch.acceptedCount} draft${batch.acceptedCount === 1 ? " is" : "s are"} ready to review.${batch.rejectedCount ? ` ${batch.rejectedCount} did not pass the content checks.` : ""}`;
    case "ZERO_OUTPUT":
      return "The batch finished without producing drafts.";
    case "REJECTED":
      return "The generated drafts did not pass the content checks. Nothing was published.";
    case "SKIPPED":
      return batch.statusReason === "SITE_INELIGIBLE"
        ? "Generation was skipped because this site is no longer eligible."
        : "Generation was skipped because no supported topics matched your business information. Add more detail before the next batch.";
    case "FAILED":
      return `Generation failed.${batch.acceptedCount ? ` ${batch.acceptedCount} saved draft${batch.acceptedCount === 1 ? " is" : "s are"} available to review.` : " No drafts were saved."} Nothing was published automatically.`;
  }
}

export function ownerArticleLiveHref(liveUrl: string, slug: string, isPublished: boolean): string | null {
  if (!isPublished) return null;
  try {
    const url = new URL(liveUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return new URL(`/blog/${encodeURIComponent(slug)}`, url.origin).href;
  } catch {
    return null;
  }
}
