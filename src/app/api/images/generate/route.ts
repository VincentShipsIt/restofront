import { z } from "zod";
import { generateFoodImage } from "@/lib/ai/restaurant-generation";
import { getCurrentSession } from "@/lib/current-session";
import { storeRestaurantImage } from "@/lib/storage/images";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().trim().min(10).max(700),
  restaurantSlug: z.string().trim().min(2).max(80),
  photographyDirection: z.string().trim().min(20).max(1_200).optional(),
  referenceImageUrls: z.array(z.url()).max(3).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const {
      prompt,
      restaurantSlug,
      photographyDirection,
      referenceImageUrls,
    } = requestSchema.parse(await request.json());
    if (session.restaurantSlug !== restaurantSlug) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const image = await generateFoodImage({
      prompt,
      photographyDirection,
      referenceImageUrls,
    });
    const url = await storeRestaurantImage({
      restaurantSlug,
      data: image.data,
      mediaType: image.mediaType,
      purpose: "hero",
    });
    return Response.json({ url });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      { status: 400 },
    );
  }
}
