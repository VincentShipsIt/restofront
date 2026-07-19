import { getDb } from "@/lib/db";
import { leadDrafts } from "@/lib/lead-drafts";
import {
  restaurantDraftSchema,
  sampleRestaurant,
  type RestaurantDraft,
} from "@/lib/restaurant";

export async function getRestaurantDraft(
  slug: string,
): Promise<RestaurantDraft> {
  const leadDraft = leadDrafts[slug];
  if (!process.env.DATABASE_URL) {
    return leadDraft ?? { ...sampleRestaurant, slug };
  }

  const restaurant = await getDb().restaurant.findUnique({
    where: { slug },
    include: {
      integrations: { orderBy: { createdAt: "asc" } },
      menuSections: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
      siteVersions: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!restaurant) return leadDraft ?? { ...sampleRestaurant, slug };
  const latestTheme = restaurant.siteVersions[0]?.theme as
    | RestaurantDraft["palette"]
    | undefined;

  return restaurantDraftSchema.parse({
    slug: restaurant.slug,
    name: restaurant.name,
    eyebrow: `${restaurant.cuisine ?? "Independent restaurant"} · ${
      restaurant.address ?? "Local"
    }`,
    description: restaurant.description ?? sampleRestaurant.description,
    cuisine: restaurant.cuisine ?? "",
    address: restaurant.address ?? "",
    phone: restaurant.phone ?? "",
    sourceUrl: restaurant.sourceUrl,
    heroImageUrl: restaurant.heroImageUrl,
    heroOriginalImageUrl: restaurant.heroOriginalImageUrl,
    heroImageProvenance:
      restaurant.heroImageProvenance?.toLowerCase().replace("_", "-") ?? null,
    palette: latestTheme ?? sampleRestaurant.palette,
    showMenuImages: restaurant.showMenuImages,
    autoEnhanceImages: restaurant.autoEnhanceImages,
    defaultLocale: restaurant.defaultLocale,
    translations: restaurant.translations,
    menuSections: restaurant.menuSections.map((section) => ({
      name: section.name,
      description: section.description ?? "",
      items: section.items.map((item) => ({
        name: item.name,
        description: item.description ?? "",
        price: item.price === null ? null : Number(item.price),
        currency: item.currency,
        dietaryLabels: item.dietaryLabels,
        imageUrl: item.imageUrl,
        originalImageUrl: item.originalImageUrl,
        imageProvenance:
          item.imageProvenance?.toLowerCase().replace("_", "-") ?? null,
      })),
    })),
    integrations: restaurant.integrations.map((integration) => ({
      type: integration.type.toLowerCase(),
      label: integration.label,
      provider: integration.provider,
      url: integration.url,
    })),
  });
}
