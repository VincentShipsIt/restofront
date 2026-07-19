import { put } from "@vercel/blob";

export async function storeRestaurantImage(input: {
  restaurantSlug: string;
  data: Uint8Array;
  mediaType: string;
  purpose: "hero" | "menu" | "original-hero";
}): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Vercel Blob is not configured");
  }

  const extension =
    input.mediaType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const blob = await put(
    `restaurants/${input.restaurantSlug}/${input.purpose}.${extension}`,
    Buffer.from(input.data),
    {
      access: "public",
      addRandomSuffix: true,
      contentType: input.mediaType,
    },
  );
  return blob.url;
}
