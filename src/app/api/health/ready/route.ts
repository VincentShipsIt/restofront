import {
  createCachedPlatformReadiness,
  isPlatformReadinessAuthorized,
} from "@/lib/platform-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getPlatformReadiness = createCachedPlatformReadiness();

export async function GET(request: Request) {
  if (!isPlatformReadinessAuthorized(request)) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  const readiness = await getPlatformReadiness();

  return Response.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
