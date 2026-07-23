import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RestaurantSite } from "@/components/restaurant-site";
import {
  getRestaurantLocales,
  localizeRestaurantDraft,
} from "@/lib/restaurant";
import { findRestaurantDraft } from "@/lib/restaurants";

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const draft = await findRestaurantDraft(slug);
  if (!draft) notFound();
  const locales = getRestaurantLocales(draft);
  if (!locales.includes(locale)) notFound();

  return {
    title: `${draft.name} — Private preview`,
    robots: { index: false, follow: false },
    alternates: {
      canonical:
        locale === draft.defaultLocale
          ? `/preview/${slug}`
          : `/preview/${slug}/${locale}`,
      languages: Object.fromEntries(
        locales.map((availableLocale) => [
          availableLocale,
          availableLocale === draft.defaultLocale
            ? `/preview/${slug}`
            : `/preview/${slug}/${availableLocale}`,
        ]),
      ),
    },
  };
}

export default async function LocalizedPreviewPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const draft = await findRestaurantDraft(slug);
  if (!draft) notFound();
  const locales = getRestaurantLocales(draft);
  if (!locales.includes(locale)) notFound();

  return (
    <RestaurantSite
      draft={localizeRestaurantDraft(draft, locale)}
      locale={locale}
      localeBasePath={`/preview/${slug}`}
      availableLocales={locales}
    />
  );
}
