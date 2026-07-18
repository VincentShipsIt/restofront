import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import {
  restaurantDraftSchema,
  sampleRestaurant,
  slugify,
  type RestaurantDraft,
} from "@/lib/restaurant";
import type { ExtractedRestaurant } from "@/lib/importer";

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
          process.env.NEXT_PUBLIC_APP_URL ?? "https://restofront.vercel.app",
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
    heroImageUrl: source.heroImageUrl || sampleRestaurant.heroImageUrl,
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
- Never invent menu items. If menu data is incomplete, return an empty menu section with a factual explanation.
- Use concise, warm hospitality copy without AI clichés.
- Return three accessible hex colours in palette.
- sourceUrl must be ${source.sourceUrl ?? "null"}.
- heroImageUrl must be ${source.heroImageUrl ?? "null"}.

Known restaurant:
${JSON.stringify({
  name: source.name,
  description: source.description,
  address: source.address,
  phone: source.phone,
  links: source.links,
})}

Website text collected from the homepage and relevant same-origin pages:
${source.pageText.slice(0, 60_000)}`,
  });

  const draft = restaurantDraftSchema.parse({
    ...output,
    slug: slugify(output.name),
    sourceUrl: source.sourceUrl,
    heroImageUrl: source.heroImageUrl || output.heroImageUrl,
    integrations:
      source.links.length > 0 ? source.links : output.integrations,
  });

  return draft;
}

export async function generateFoodImage(prompt: string): Promise<{
  data: Uint8Array;
  mediaType: string;
}> {
  if (!imageAiIsConfigured()) {
    throw new Error("AI Gateway is not configured");
  }

  const result = await generateText({
    model:
      process.env.AI_IMAGE_MODEL ??
      "google/gemini-3.1-flash-image-preview",
    prompt: `Editorial restaurant photography, natural window light, believable food styling, no text, no logos, no people, premium but not over-produced. ${prompt}`,
    timeout: { totalMs: 60_000 },
    experimental_include: {
      requestBody: false,
      responseBody: false,
    },
  });

  const image = result.files.find((file) =>
    file.mediaType?.startsWith("image/"),
  );
  if (!image) throw new Error("The image model returned no image");

  return {
    data: image.uint8Array,
    mediaType: image.mediaType ?? "image/png",
  };
}
