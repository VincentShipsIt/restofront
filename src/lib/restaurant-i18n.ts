import type { RestaurantTemplate } from "@/lib/restaurant-templates";

export type SupportedUiLocale = "en" | "fr";

const dictionaries = {
  en: {
    language: "Language",
    reservationsVia: "Reservations via",
    bookingPartner: "our booking partner",
    seasonalNotice: "Menu and availability may change with the season.",
    diningRoomAlt: "Dining room at",
  },
  fr: {
    language: "Langue",
    reservationsVia: "Réservations via",
    bookingPartner: "notre partenaire de réservation",
    seasonalNotice:
      "Le menu et les disponibilités peuvent évoluer au fil des saisons.",
    diningRoomAlt: "Salle du restaurant",
  },
} satisfies Record<string, Record<string, string>>;

export function getRestaurantDictionary(locale: string) {
  return dictionaries[toUiLocale(locale)];
}

export function getRestaurantTemplateCopy(
  template: RestaurantTemplate,
  locale: string,
) {
  return template.copy[toUiLocale(locale)];
}

export function localizeIntegrationUrl(url: string, locale: string): string {
  try {
    const localizedUrl = new URL(url);
    if (!localizedUrl.searchParams.has("lang")) return url;
    localizedUrl.searchParams.set("lang", locale.split("-")[0].toLowerCase());
    return localizedUrl.toString();
  } catch {
    return url;
  }
}

function toUiLocale(locale: string): SupportedUiLocale {
  return locale.toLowerCase().startsWith("fr") ? "fr" : "en";
}
