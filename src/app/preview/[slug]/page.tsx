import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RestaurantSite } from "@/components/restaurant-site";
import { getRestaurantLocales } from "@/lib/restaurant";
import { findRestaurantDraft } from "@/lib/restaurants";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const draft = await findRestaurantDraft(slug);
  if (!draft) notFound();
  const locales = getRestaurantLocales(draft);
  return {
    title: `${draft.name} — Private preview`,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/preview/${slug}`,
      languages: Object.fromEntries(
        locales.map((locale) => [
          locale,
          locale === draft.defaultLocale
            ? `/preview/${slug}`
            : `/preview/${slug}/${locale}`,
        ]),
      ),
    },
  };
}

export default async function PreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const draft = await findRestaurantDraft(slug);
  if (!draft) notFound();
  return (
    <RestaurantSite
      draft={draft}
      locale={draft.defaultLocale}
      localeBasePath={`/preview/${slug}`}
      availableLocales={getRestaurantLocales(draft)}
    />
  );
}
