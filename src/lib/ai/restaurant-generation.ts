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
- Return three accessible hex colours in palette, derived from the source website's visible branding and photography rather than a generic restaurant palette.
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

export type FoodImageRequest = {
  prompt: string;
  photographyDirection?: string;
  referenceImageUrls?: string[];
};

function parseReferenceImageUrls(urls: string[] = []): URL[] {
  return urls.slice(0, 3).flatMap((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? [url] : [];
    } catch {
      return [];
    }
  });
}

export async function generateFoodImage(
  input: string | FoodImageRequest,
): Promise<{
  data: Uint8Array;
  mediaType: string;
}> {
  if (!imageAiIsConfigured()) {
    throw new Error("AI Gateway is not configured");
  }

  const request = typeof input === "string" ? { prompt: input } : input;
  const references = parseReferenceImageUrls(request.referenceImageUrls);
  const direction = request.photographyDirection
    ? `Restaurant photography direction: ${request.photographyDirection}`
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
            text: `Create one believable restaurant food photograph for the restaurant's own website. Use realistic portions and ingredient textures. Keep the camera, plate family, tabletop, lighting direction and colour grade consistent with the supplied restaurant direction and reference photography. The reference images define visual identity only; do not copy their pictured dishes. No text, logos, people, decorative flowers, impossible ingredients or generic stock-photo styling.

${direction}

Dish request: ${request.prompt}`,
          },
          ...references.map((image) => ({ type: "image" as const, image })),
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
  if (!image) throw new Error("The image model returned no image");

  return {
    data: image.uint8Array,
    mediaType: image.mediaType ?? "image/png",
  };
}
