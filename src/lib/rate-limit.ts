import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let importRatelimit: Ratelimit | undefined;

function getImportRatelimit(): Ratelimit | null {
  if (importRatelimit) return importRatelimit;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  importRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "restofront:preview",
  });
  return importRatelimit;
}

export async function limitPublicPreview(request: Request): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  reason?: "limited" | "unavailable";
}> {
  const limiter = getImportRatelimit();
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + 60_000,
        reason: "unavailable",
      };
    }
    return { success: true, remaining: 5, reset: Date.now() + 60 * 60_000 };
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const address =
    request.headers.get("x-real-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "unknown";
  const identifier = createHash("sha256").update(address).digest("hex");
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      reason: result.success ? undefined : "limited",
    };
  } catch {
    return {
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      reason: "unavailable",
    };
  }
}
