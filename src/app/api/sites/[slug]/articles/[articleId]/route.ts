import { accessFailureResponse, getSiteAccess } from "@/lib/authorization";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sites/[slug]/articles/[articleId]">,
) {
  const { slug, articleId } = await params;
  const access = await getSiteAccess(slug);
  const notFound = () => Response.json(
    { error: "Article not found." },
    { status: 404, headers: { "Cache-Control": "private, no-store" } },
  );
  if (!access.ok) {
    return access.status === 403 ? notFound() : accessFailureResponse(access);
  }
  const article = await getDb().article.findFirst({
    where: { id: articleId, siteId: access.site.id },
    select: { id: true, title: true, bodyMarkdown: true, status: true },
  });
  if (!article) return notFound();
  return Response.json({ article }, { headers: { "Cache-Control": "private, no-store" } });
}
