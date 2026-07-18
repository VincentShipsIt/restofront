import { randomBytes } from "node:crypto";
import { resolve4, resolveCname } from "node:dns/promises";
import { z } from "zod";
import { getCurrentSession } from "@/lib/current-session";
import { getDb } from "@/lib/db";

const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) =>
    value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, ""),
  )
  .pipe(
    z
      .string()
      .min(4)
      .max(253)
      .regex(
        /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
        "Enter a valid domain name",
      ),
  );

async function attachToVercel(hostname: string) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  const teamId = process.env.VERCEL_TEAM_ID;
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${query}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: hostname }),
    },
  );
  const result = (await response.json()) as {
    verified?: boolean;
    verification?: Array<{ type: string; domain: string; value: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(result.error?.message ?? "Vercel rejected this domain");
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    const body = (await request.json()) as {
      hostname?: string;
      restaurantSlug?: string;
    };
    const hostname = hostnameSchema.parse(body.hostname);
    const restaurantSlug = body.restaurantSlug ?? session?.restaurantSlug;
    if (!restaurantSlug) {
      return Response.json({ error: "Sign in to connect a domain" }, { status: 401 });
    }
    if (session && session.restaurantSlug !== restaurantSlug) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const vercel = await attachToVercel(hostname);
    const verificationToken = randomBytes(24).toString("base64url");
    if (process.env.DATABASE_URL) {
      const restaurant = await getDb().restaurant.findUnique({
        where: { slug: restaurantSlug },
        select: { id: true },
      });
      if (restaurant) {
        await getDb().domain.upsert({
          where: { hostname },
          update: { restaurantId: restaurant.id },
          create: {
            hostname,
            restaurantId: restaurant.id,
            verificationToken,
          },
        });
      }
    }

    const isApex = hostname.split(".").length === 2;
    return Response.json({
      hostname,
      attached: Boolean(vercel),
      verified: vercel?.verified ?? false,
      records:
        vercel?.verification?.map((record) => ({
          type: record.type,
          name: record.domain,
          value: record.value,
        })) ??
        (isApex
          ? [{ type: "A", name: "@", value: "76.76.21.21" }]
          : [
              {
                type: "CNAME",
                name: hostname.split(".")[0],
                value: "cname.vercel-dns-0.com",
              },
            ]),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Domain could not be added",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const hostname = hostnameSchema.parse(
      new URL(request.url).searchParams.get("hostname"),
    );
    const [aResult, cnameResult] = await Promise.allSettled([
      resolve4(hostname),
      resolveCname(hostname),
    ]);
    const addresses = aResult.status === "fulfilled" ? aResult.value : [];
    const cnames = cnameResult.status === "fulfilled" ? cnameResult.value : [];
    const verified =
      addresses.includes("76.76.21.21") ||
      cnames.some((value) => value.includes("vercel-dns"));

    if (verified && process.env.DATABASE_URL) {
      await getDb().domain.updateMany({
        where: { hostname },
        data: { verified: true, verifiedAt: new Date() },
      });
    }

    return Response.json({ hostname, verified, addresses, cnames });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "DNS could not be checked",
      },
      { status: 400 },
    );
  }
}
