import { z } from "zod";
import { generateFoodImage } from "@/lib/ai/restaurant-generation";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().trim().min(10).max(700),
});

export async function POST(request: Request) {
  try {
    const { prompt } = requestSchema.parse(await request.json());
    const image = await generateFoodImage(prompt);
    return new Response(Buffer.from(image.data), {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Type": image.mediaType,
      },
    });
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
