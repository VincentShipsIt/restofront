import type { Metadata } from "next";
import { RestaurantSite } from "@/components/restaurant-site";
import { getRestaurantDraft } from "@/lib/restaurants";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const draft = await getRestaurantDraft(slug);
  return {
    title: `${draft.name} — Private preview`,
    robots: { index: false, follow: false },
    alternates: { canonical: `/preview/${slug}` },
  };
}

export default async function PreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const draft = await getRestaurantDraft(slug);
  return <RestaurantSite draft={draft} />;
}
