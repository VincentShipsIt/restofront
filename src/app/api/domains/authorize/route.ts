import { z } from "zod";
import { getDb } from "@/lib/db";

const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
  );

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = hostnameSchema.safeParse(
    new URL(request.url).searchParams.get("domain"),
  );
  if (!parsed.success || !process.env.DATABASE_URL) {
    return new Response(null, { status: 403 });
  }

  const domain = await getDb().domain.findUnique({
    where: { hostname: parsed.data },
    select: { verified: true },
  });
  return new Response(null, { status: domain?.verified ? 200 : 403 });
}
