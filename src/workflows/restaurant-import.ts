import { getWritable } from "workflow";
import { getDb } from "@/lib/db";
import { generateRestaurantDraft } from "@/lib/ai/restaurant-generation";
import { inspectSource, type ExtractedRestaurant } from "@/lib/importer";
import type { RestaurantDraft } from "@/lib/restaurant";

export type RestaurantImportEvent =
  | {
      type: "progress";
      stage: "crawl" | "extract" | "compose" | "persist";
      progress: number;
      message: string;
    }
  | { type: "complete"; draft: RestaurantDraft }
  | { type: "failed"; message: string };

export async function restaurantImportWorkflow(
  source: string,
): Promise<RestaurantDraft> {
  "use workflow";

  console.log(`[restaurant-import] START source=${source}`);
  await emit({
    type: "progress",
    stage: "crawl",
    progress: 12,
    message: "Reading the current website",
  });
  const extracted = await crawlRestaurant(source);
  await emit({
    type: "progress",
    stage: "extract",
    progress: 42,
    message: "Recovering menu, contacts and existing links",
  });
  await emit({
    type: "progress",
    stage: "compose",
    progress: 65,
    message: "Composing the mobile-first preview",
  });
  const draft = await composeDraft(extracted);
  await emit({
    type: "progress",
    stage: "compose",
    progress: 88,
    message: "Checking every menu and integration",
  });
  await emit({
    type: "progress",
    stage: "persist",
    progress: 95,
    message: "Saving the private preview",
  });
  await persistDraft(draft);
  await emitComplete(draft);
  console.log(`[restaurant-import] DONE slug=${draft.slug}`);
  return draft;
}

async function emit(event: RestaurantImportEvent): Promise<void> {
  "use step";
  const writer = getWritable<RestaurantImportEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function crawlRestaurant(source: string): Promise<ExtractedRestaurant> {
  "use step";
  console.log(`[restaurant-import:crawl] START source=${source}`);
  const result = await inspectSource(source);
  console.log(
    `[restaurant-import:crawl] DONE name=${result.name} links=${result.links.length}`,
  );
  return result;
}

async function composeDraft(
  source: ExtractedRestaurant,
): Promise<RestaurantDraft> {
  "use step";
  console.log(`[restaurant-import:compose] START name=${source.name}`);
  const draft = await generateRestaurantDraft(source);
  console.log(
    `[restaurant-import:compose] DONE slug=${draft.slug} sections=${draft.menuSections.length}`,
  );
  return draft;
}

async function persistDraft(draft: RestaurantDraft): Promise<void> {
  "use step";
  console.log(`[restaurant-import:persist] START slug=${draft.slug}`);

  if (!process.env.DATABASE_URL) {
    console.log("[restaurant-import:persist] SKIP database-not-configured");
    return;
  }

  const db = getDb();
  await db.restaurant.upsert({
    where: { slug: draft.slug },
    update: {
      name: draft.name,
      description: draft.description,
      cuisine: draft.cuisine,
      address: draft.address,
      phone: draft.phone,
      sourceUrl: draft.sourceUrl,
      heroImageUrl: draft.heroImageUrl,
      status: "PREVIEW_READY",
      integrations: {
        deleteMany: {},
        create: draft.integrations.map((integration) => ({
          type: integration.type.toUpperCase() as
            | "BOOKING"
            | "ORDERING"
            | "DELIVERY"
            | "SOCIAL",
          label: integration.label,
          provider: integration.provider,
          url: integration.url,
        })),
      },
      menuSections: {
        deleteMany: {},
        create: draft.menuSections.map((section, sectionIndex) => ({
          name: section.name,
          description: section.description,
          position: sectionIndex,
          items: {
            create: section.items.map((item, itemIndex) => ({
              name: item.name,
              description: item.description,
              price: item.price,
              currency: item.currency,
              dietaryLabels: item.dietaryLabels,
              imageUrl: item.imageUrl,
              position: itemIndex,
            })),
          },
        })),
      },
    },
    create: {
      slug: draft.slug,
      name: draft.name,
      description: draft.description,
      cuisine: draft.cuisine,
      address: draft.address,
      phone: draft.phone,
      sourceUrl: draft.sourceUrl,
      heroImageUrl: draft.heroImageUrl,
      status: "PREVIEW_READY",
      integrations: {
        create: draft.integrations.map((integration) => ({
          type: integration.type.toUpperCase() as
            | "BOOKING"
            | "ORDERING"
            | "DELIVERY"
            | "SOCIAL",
          label: integration.label,
          provider: integration.provider,
          url: integration.url,
        })),
      },
      menuSections: {
        create: draft.menuSections.map((section, sectionIndex) => ({
          name: section.name,
          description: section.description,
          position: sectionIndex,
          items: {
            create: section.items.map((item, itemIndex) => ({
              name: item.name,
              description: item.description,
              price: item.price,
              currency: item.currency,
              dietaryLabels: item.dietaryLabels,
              imageUrl: item.imageUrl,
              position: itemIndex,
            })),
          },
        })),
      },
    },
  });
  console.log(`[restaurant-import:persist] DONE slug=${draft.slug}`);
}

async function emitComplete(draft: RestaurantDraft): Promise<void> {
  "use step";
  await emit({ type: "complete", draft });
}
