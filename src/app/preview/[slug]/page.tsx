import type { Metadata } from "next";
import { RestaurantSite } from "@/components/restaurant-site";
import { sampleRestaurant } from "@/lib/restaurant";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${sampleRestaurant.name} — Private preview`,
    robots: { index: false, follow: false },
    alternates: { canonical: `/preview/${slug}` },
  };
}

export default async function PreviewPage({ params }: PageProps) {
  await params;
  return <RestaurantSite draft={sampleRestaurant} />;
}
