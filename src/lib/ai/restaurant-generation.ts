import { generateText, Output } from "ai";
import {
  restaurantDraftSchema,
  sampleRestaurant,
  slugify,
  type RestaurantDraft,
} from "@/lib/restaurant";
import type { ExtractedRestaurant } from "@/lib/importer";

function aiIsConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY,
  );
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
  if (!aiIsConfigured()) return deterministicDraft(source);

  const { output } = await generateText({
    model: process.env.AI_TEXT_MODEL ?? "openai/gpt-5.4",
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
- If menu data is incomplete, create a short clearly plausible preview menu, but do not claim it came from the source.
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

Website text:
${source.pageText.slice(0, 28_000)}`,
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
  if (!aiIsConfigured()) {
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
