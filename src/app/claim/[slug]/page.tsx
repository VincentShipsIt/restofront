import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { ClaimPanel } from "@/app/claim/[slug]/claim-panel";
import { Button } from "@/components/ui/button";
import { sampleRestaurant } from "@/lib/restaurant";

export const metadata: Metadata = {
  title: "Claim this restaurant",
  robots: { index: false, follow: false },
};

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen">
      <header className="flex h-16 items-center gap-4 border-b px-5">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/create">
            <ArrowLeft />
          </Link>
        </Button>
        <Brand />
      </header>
      <ClaimPanel slug={slug} fallbackDraft={sampleRestaurant} />
    </main>
  );
}
