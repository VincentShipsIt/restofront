import { restaurantDraftSchema } from "@/lib/restaurant";
import { getCurrentSession } from "@/lib/current-session";
import { getDb } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const session = await getCurrentSession();
  if (!session || session.restaurantSlug !== slug) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draft = restaurantDraftSchema.parse(await request.json());
    if (!process.env.DATABASE_URL) {
      return Response.json({ ok: true, persisted: false });
    }

    await getDb().restaurant.update({
      where: { slug },
      data: {
        name: draft.name,
        description: draft.description,
        cuisine: draft.cuisine,
        address: draft.address,
        phone: draft.phone,
        heroImageUrl: draft.heroImageUrl,
        showMenuImages: draft.showMenuImages,
        defaultLocale: draft.defaultLocale,
        translations: draft.translations,
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
      },
    });
    return Response.json({ ok: true, persisted: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Restaurant could not be saved",
      },
      { status: 400 },
    );
  }
}
