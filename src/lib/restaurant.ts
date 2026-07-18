import { z } from "zod";

export const menuItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(320).default(""),
  price: z.number().nonnegative().nullable().default(null),
  currency: z.string().length(3).default("EUR"),
  dietaryLabels: z.array(z.string().max(30)).max(6).default([]),
  imageUrl: z
    .union([z.url(), z.string().regex(/^\/[a-zA-Z0-9/_\-.]+$/)])
    .nullable()
    .default(null),
});

export const menuSectionSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).default(""),
  items: z.array(menuItemSchema).max(40),
});

export const integrationSchema = z.object({
  type: z.enum(["booking", "ordering", "delivery", "social"]),
  label: z.string().min(1).max(60),
  provider: z.string().max(60).nullable().default(null),
  url: z.url(),
});

export const restaurantDraftSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  eyebrow: z.string().max(100),
  description: z.string().min(20).max(500),
  cuisine: z.string().max(80),
  address: z.string().max(220),
  phone: z.string().max(40),
  sourceUrl: z.url().nullable(),
  heroImageUrl: z.url().nullable(),
  palette: z.object({
    background: z.string(),
    foreground: z.string(),
    accent: z.string(),
  }),
  menuSections: z.array(menuSectionSchema).min(1).max(12),
  integrations: z.array(integrationSchema).max(12),
});

export type RestaurantDraft = z.infer<typeof restaurantDraftSchema>;

export const sampleRestaurant: RestaurantDraft = {
  slug: "osteria-luna",
  name: "Osteria Luna",
  eyebrow: "Seasonal Italian kitchen · Valletta",
  description:
    "A neighbourhood osteria serving handmade pasta, charcoal-grilled fish and the kind of long lunches that quietly become dinner.",
  cuisine: "Modern Italian",
  address: "17 Old Bakery Street, Valletta, Malta",
  phone: "+356 2123 4567",
  sourceUrl: "https://example.com",
  heroImageUrl:
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=88",
  palette: {
    background: "#f4efe5",
    foreground: "#1d241f",
    accent: "#a5482d",
  },
  menuSections: [
    {
      name: "To begin",
      description: "Small plates for the table",
      items: [
        {
          name: "House focaccia",
          description: "Rosemary, sea salt, cultured butter",
          price: 6,
          currency: "EUR",
          dietaryLabels: ["vegetarian"],
          imageUrl: null,
        },
        {
          name: "Burrata & citrus",
          description: "Blood orange, basil oil, toasted pistachio",
          price: 14,
          currency: "EUR",
          dietaryLabels: ["vegetarian", "gluten-free"],
          imageUrl:
            "https://images.unsplash.com/photo-1625943555419-56a2cb596640?auto=format&fit=crop&w=1000&q=85",
        },
      ],
    },
    {
      name: "Pasta & mains",
      description: "Made here, served when ready",
      items: [
        {
          name: "Tagliolini al limone",
          description: "Lemon, aged parmesan, black pepper",
          price: 19,
          currency: "EUR",
          dietaryLabels: ["vegetarian"],
          imageUrl:
            "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1000&q=85",
        },
        {
          name: "Charcoal sea bass",
          description: "Braised fennel, capers, preserved lemon",
          price: 27,
          currency: "EUR",
          dietaryLabels: ["gluten-free"],
          imageUrl:
            "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1000&q=85",
        },
        {
          name: "Slow-cooked short rib",
          description: "Soft polenta, red wine jus, gremolata",
          price: 29,
          currency: "EUR",
          dietaryLabels: ["gluten-free"],
          imageUrl: null,
        },
      ],
    },
  ],
  integrations: [
    {
      type: "booking",
      label: "Book a table",
      provider: "SevenRooms",
      url: "https://www.sevenrooms.com",
    },
    {
      type: "ordering",
      label: "Order collection",
      provider: "Existing ordering",
      url: "https://example.com/order",
    },
  ],
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

export function formatPrice(
  price: number | null,
  currency = "EUR",
): string {
  if (price === null) return "";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}
