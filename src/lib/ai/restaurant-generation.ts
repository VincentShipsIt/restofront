import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import {
  restaurantDraftSchema,
  sampleRestaurant,
  slugify,
  type RestaurantDraft,
} from "@/lib/restaurant";
import type { ExtractedRestaurant } from "@/lib/importer";
import { shouldShowMenuImagesByDefault } from "@/lib/restaurant-templates";

function textAiIsConfigured(): boolean {
  return Boolean(
    process.env.OPENROUTER_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.AI_GATEWAY_API_KEY,
  );
}

function imageAiIsConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY,
  );
}

function getTextModel() {
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      compatibility: "strict",
      headers: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "https://restofront.com",
        "X-Title": "Restofront",
      },
    });
    return openrouter.chat(
      process.env.OPENROUTER_TEXT_MODEL ?? "openrouter/auto",
      {
        extraBody: {
          provider: { require_parameters: true },
          plugins: [{ id: "response-healing" }],
        },
        usage: { include: true },
      },
    );
  }

  return process.env.AI_TEXT_MODEL ?? "openai/gpt-5.4";
}

function deterministicDraft(source: ExtractedRestaurant): RestaurantDraft {
  const name = source.name || source.source;
  return restaurantDraftSchema.parse({
    ...sampleRestaurant,
    slug: slugify(name) || sampleRestaurant.slug,
    name,
    description: source.description || sampleRestaurant.description,
    address: source.address || sampleRestaurant.address,
    phone: source.phone || sampleRestaurant.phone,
    sourceUrl: source.sourceUrl,
    heroImageUrl: source.heroImageUrl,
    heroOriginalImageUrl: source.heroImageUrl,
    heroImageProvenance: source.heroImageUrl ? "official" : null,
    autoEnhanceImages: true,
    defaultLocale: source.sourceLocale ?? "en",
    translations: [],
    menuSections: sampleRestaurant.menuSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        imageUrl: null,
        originalImageUrl: null,
        imageProvenance: null,
      })),
    })),
    integrations:
      source.links.length > 0 ? source.links : sampleRestaurant.integrations,
  });
}

export async function generateRestaurantDraft(
  source: ExtractedRestaurant,
): Promise<RestaurantDraft> {
  if (!textAiIsConfigured()) return deterministicDraft(source);

  const { output } = await generateText({
    model: getTextModel(),
    output: Output.object({
      schema: restaurantDraftSchema,
      name: "restaurant_website_draft",
      description:
        "A faithful structured restaurant website and menu draft extracted from source material.",
    }),
    maxRetries: 2,
    timeout: { totalMs: 55_000, stepMs: 45_000 },
    prompt: `Create a polished but strictly factual mobile-first restaurant website draft.

Rules:
- Never invent booking, ordering, delivery, address, phone, opening-hour, allergen, or price facts.
- Existing booking and ordering systems must remain external links; do not rename their providers.
- Preserve every menu item and price that can be recovered.
- Treat ${source.sourceLocale ?? "the detected source language"} as the canonical locale and put the source wording in the main fields.
- Set defaultLocale to the canonical source locale using a two-letter language code.
- When the canonical locale is not English, include one complete "en" translation. When it is English, do not duplicate it in translations.
- A translation is a linguistic overlay only: its menu sections, items and integrationLabels must have exactly the same order and counts as the canonical data.
- Translate customer-facing cuisine, eyebrow, description, menu names, menu descriptions, dietary labels and link labels. Never translate restaurant names, provider names, URLs, prices, currencies or image references.
- Never invent menu items. If menu data is incomplete, return an empty menu section with a factual explanation.
- Use concise, warm hospitality copy without AI clichés.
- Return three accessible hex colours in palette, derived from the source website's visible branding and photography rather than a generic restaurant palette.
- sourceUrl must be ${source.sourceUrl ?? "null"}.
- heroImageUrl must be ${source.heroImageUrl ?? "null"}.

Known restaurant:
${JSON.stringify({
  name: source.name,
  description: source.description,
  address: source.address,
  phone: source.phone,
  sourceLocale: source.sourceLocale,
  links: source.links,
})}

Website text collected from the homepage and relevant same-origin pages:
${source.pageText.slice(0, 60_000)}`,
  });

  const draft = restaurantDraftSchema.parse({
    ...output,
    slug: slugify(output.name),
    sourceUrl: source.sourceUrl,
    heroImageUrl: source.heroImageUrl,
    heroOriginalImageUrl: source.heroImageUrl,
    heroImageProvenance: source.heroImageUrl ? "official" : null,
    showMenuImages: shouldShowMenuImagesByDefault(output.cuisine),
    autoEnhanceImages: true,
    menuSections: output.menuSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        imageUrl: null,
        originalImageUrl: null,
        imageProvenance: null,
      })),
    })),
    integrations:
      source.links.length > 0 ? source.links : output.integrations,
    translations: output.translations.map((translation) => ({
      ...translation,
      integrationLabels:
        source.links.length > 0
          ? source.links.map(
              (link, index) =>
                translation.integrationLabels[index] ?? link.label,
            )
          : translation.integrationLabels,
    })),
  });

  return draft;
}

export type RestaurantImageEnhancementRequest = {
  sourceImageUrl: string;
  restaurantName?: string;
  enhancementNotes?: string;
};

function parseSourceImageUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("The source image must use HTTPS");
  }
  return url;
}

export async function enhanceRestaurantImage(
  request: RestaurantImageEnhancementRequest,
): Promise<{
  data: Uint8Array;
  mediaType: string;
}> {
  if (!imageAiIsConfigured()) {
    throw new Error("AI Gateway is not configured");
  }

  const sourceImage = parseSourceImageUrl(request.sourceImageUrl);
  const context = request.restaurantName
    ? `Restaurant: ${request.restaurantName}.`
    : "";
  const notes = request.enhancementNotes
    ? `Requested finishing notes: ${request.enhancementNotes}`
    : "";
  const result = await generateText({
    model:
      process.env.AI_IMAGE_MODEL ??
      "google/gemini-3.1-flash-image-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Edit this exact restaurant photograph. The result must remain a faithful record of the source image.

Allowed changes: correct exposure and white balance, recover highlights and shadows, reduce noise, improve sharpness and resolution, straighten, crop subtly, and remove only transient non-material distractions such as sensor dust.

Forbidden changes: do not add, remove, replace, move, restyle, or regenerate any food, ingredient, garnish, sauce, portion, plating, tableware, furniture, architecture, logo, person, or material background element. Do not change camera geometry or make the scene look like a different service. If a requested adjustment would change what the restaurant actually serves or looks like, leave it unchanged.

Use a natural hospitality colour grade. Avoid plastic textures, exaggerated saturation, fake steam, fake depth of field, and stock-photo polish. Return one enhanced image and no text.

${context}
${notes}`,
          },
          { type: "image", image: sourceImage },
        ],
      },
    ],
    timeout: { totalMs: 60_000 },
    experimental_include: {
      requestBody: false,
      responseBody: false,
    },
  });

  const image = result.files.find((file) =>
    file.mediaType?.startsWith("image/"),
  );
  if (!image) throw new Error("The image model returned no enhanced image");

  return {
    data: image.uint8Array,
    mediaType: image.mediaType ?? "image/png",
  };
}
