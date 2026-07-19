import type { Metadata } from "next";
import { RestaurantSite } from "@/components/restaurant-site";
import { getRestaurantLocales } from "@/lib/restaurant";
import { getRestaurantDraft } from "@/lib/restaurants";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const draft = await getRestaurantDraft(slug);
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
  const draft = await getRestaurantDraft(slug);
  return (
    <RestaurantSite
      draft={draft}
      locale={draft.defaultLocale}
      localeBasePath={`/preview/${slug}`}
      availableLocales={getRestaurantLocales(draft)}
    />
  );
}
