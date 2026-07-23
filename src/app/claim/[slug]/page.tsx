import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { ClaimPanel } from "@/app/claim/[slug]/claim-panel";
import { Button } from "@/components/ui/button";
import { findRestaurantDraft } from "@/lib/restaurants";

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
  const draft = await findRestaurantDraft(slug);
  if (!draft) notFound();

  return (
    <main className="min-h-screen">
      <header className="flex h-16 items-center gap-4 border-b px-5">
        <Button
          render={<Link href="/create" />}
          variant="ghost"
          size="icon-sm"
        >
          <ArrowLeft />
        </Button>
        <Brand />
      </header>
      <ClaimPanel slug={slug} fallbackDraft={draft} />
    </main>
  );
}
