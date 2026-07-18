import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import { formatPrice, type RestaurantDraft } from "@/lib/restaurant";
import { resolveRestaurantTemplate } from "@/lib/restaurant-templates";
import { cn } from "@/lib/utils";

type RestaurantSiteProps = {
  draft: RestaurantDraft;
  embedded?: boolean;
};

export function RestaurantSite({
  draft,
  embedded = false,
}: RestaurantSiteProps) {
  const booking = draft.integrations.find(
    (integration) => integration.type === "booking",
  );
  const ordering = draft.integrations.find((integration) =>
    ["ordering", "delivery"].includes(integration.type),
  );
  const template = resolveRestaurantTemplate(draft.cuisine);
  const picturedItems = draft.menuSections
    .flatMap((section) => section.items)
    .filter(
      (item): item is typeof item & { imageUrl: string } =>
        Boolean(item.imageUrl),
    )
    .slice(0, 4);
  const immersiveHero = template.heroLayout === "immersive";

  return (
    <article
      data-restaurant-template={template.id}
      className={cn(
        "overflow-hidden font-sans",
        embedded ? "min-h-[720px] rounded-[1.65rem]" : "min-h-screen",
      )}
      style={
        {
          "--restaurant-bg": draft.palette.background,
          "--restaurant-fg": draft.palette.foreground,
          "--restaurant-accent": draft.palette.accent,
          background: "var(--restaurant-bg)",
          color: "var(--restaurant-fg)",
        } as React.CSSProperties
      }
    >
      <header
        className={cn(
          "z-20 flex w-full items-center justify-between p-5 md:p-8",
          immersiveHero
            ? "absolute text-white"
            : "relative border-b border-current/10",
        )}
      >
        <span className={cn("text-xl md:text-2xl", template.brandClassName)}>
          {draft.name}
        </span>
        <div className="flex items-center gap-2">
          {ordering ? (
            <a
              href={ordering.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "hidden border px-4 py-2 text-xs font-semibold backdrop-blur sm:inline-flex",
                template.id === "bold" ? "rounded-none" : "rounded-full",
                immersiveHero
                  ? "border-white/40 bg-black/10"
                  : "border-current/20",
              )}
            >
              {ordering.label}
            </a>
          ) : null}
          {booking ? (
            <a
              href={booking.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "px-4 py-2 text-xs font-bold text-white",
                template.id === "bold" ? "rounded-none" : "rounded-full",
              )}
              style={{ background: "var(--restaurant-accent)" }}
            >
              {booking.label}
            </a>
          ) : null}
        </div>
      </header>

      {template.heroLayout === "split" ? (
        <section
          className={cn(
            "grid overflow-hidden lg:grid-cols-[0.9fr_1.1fr]",
            embedded ? "min-h-[520px]" : "min-h-[78svh]",
          )}
        >
          <div className="flex items-end p-6 md:p-12 lg:p-16">
            <div className="max-w-2xl">
              <p
                className="mb-5 text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--restaurant-accent)" }}
              >
                {draft.eyebrow}
              </p>
              <h1
                className={cn(
                  template.titleClassName,
                  embedded
                    ? "text-5xl md:text-7xl"
                    : "text-6xl md:text-8xl",
                )}
              >
                {draft.name}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 opacity-70 md:text-lg">
                {draft.description}
              </p>
            </div>
          </div>
          <HeroImage draft={draft} className="min-h-[420px] lg:min-h-full" />
        </section>
      ) : template.heroLayout === "card" ? (
        <section className="p-4 pt-1 md:p-8 md:pt-2">
          <div
            className={cn(
              "relative flex items-end overflow-hidden rounded-[2rem]",
              embedded ? "min-h-[500px]" : "min-h-[76svh]",
            )}
          >
            <HeroImage draft={draft} className="absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,18,15,0.86),rgba(10,18,15,0.02)_70%)]" />
            <HeroCopy draft={draft} embedded={embedded} template={template} />
          </div>
        </section>
      ) : (
        <section
          className={cn(
            "relative flex items-end overflow-hidden",
            embedded ? "min-h-[520px]" : "min-h-[82svh]",
          )}
        >
          <HeroImage draft={draft} className="absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,12,11,0.88),rgba(10,12,11,0.04)_68%)]" />
          <HeroCopy draft={draft} embedded={embedded} template={template} />
        </section>
      )}

      {picturedItems.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--restaurant-accent)" }}
              >
                {template.featuredHeading}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] md:text-5xl">
                {template.featuredSubheading}
              </h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {picturedItems.map((item) => (
              <article
                key={item.name}
                className={cn(
                  "group overflow-hidden",
                  template.id === "bold"
                    ? "border-2 border-current"
                    : "rounded-[1.25rem]",
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                  {item.imageUrl.startsWith("/") ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={item.name}
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.025]"
                      style={{ backgroundImage: `url("${item.imageUrl}")` }}
                    />
                  )}
                </div>
                <div className="border-x border-b border-current/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold leading-tight">{item.name}</h3>
                    <span className="font-mono text-xs">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 opacity-60">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:px-10 md:py-24 lg:grid-cols-[0.68fr_1.32fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-55">
            {template.menuEyebrow}
          </p>
          <h2 className="mt-3 max-w-md text-4xl font-bold leading-[0.96] tracking-[-0.045em] md:text-6xl">
            {template.menuHeading}
          </h2>
          <div className="mt-8 flex flex-col gap-3 text-sm opacity-75">
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {draft.address}
            </span>
            {booking ? (
              <a
                href={booking.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-semibold opacity-100"
              >
                <CalendarDays className="size-4" />
                Reservations via {booking.provider ?? "our booking partner"}
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
            {ordering ? (
              <a
                href={ordering.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-semibold opacity-100"
              >
                <ShoppingBag className="size-4" />
                {ordering.label}
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            template.menuLayout === "stack" && "space-y-12",
            template.menuLayout === "columns" &&
              "grid content-start gap-x-10 gap-y-12 md:grid-cols-2",
            template.menuLayout === "cards" &&
              "grid content-start gap-5 md:grid-cols-2",
          )}
        >
          {draft.menuSections.map((section) => (
            <section
              key={section.name}
              className={template.sectionClassName}
            >
              <div className="mb-5 pb-1">
                <h3 className="text-2xl font-bold tracking-[-0.035em] md:text-3xl">
                  {section.name}
                </h3>
                {section.description ? (
                  <p className="mt-1 text-sm opacity-58">
                    {section.description}
                  </p>
                ) : null}
              </div>
              <div className="space-y-6">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="grid grid-cols-[1fr_auto] gap-5"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{item.name}</h4>
                        {item.dietaryLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-current/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] opacity-65"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 max-w-xl text-sm leading-6 opacity-60">
                        {item.description}
                      </p>
                    </div>
                    <span className="font-mono text-sm">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-5 border-t border-current/15 px-6 py-8 text-sm opacity-70 sm:flex-row sm:items-center sm:justify-between md:px-10">
        <span>
          {draft.name} · {draft.address}
        </span>
        <span>Menu and availability may change with the season.</span>
      </footer>
    </article>
  );
}

type HeroImageProps = {
  draft: RestaurantDraft;
  className?: string;
};

function HeroImage({ draft, className }: HeroImageProps) {
  return draft.heroImageUrl ? (
    <div
      role="img"
      aria-label={`Dining room at ${draft.name}`}
      className={cn("bg-cover bg-center", className)}
      style={{ backgroundImage: `url("${draft.heroImageUrl}")` }}
    />
  ) : (
    <div
      className={cn("opacity-20", className)}
      style={{ background: "var(--restaurant-accent)" }}
    />
  );
}

type HeroCopyProps = {
  draft: RestaurantDraft;
  embedded: boolean;
  template: ReturnType<typeof resolveRestaurantTemplate>;
};

function HeroCopy({ draft, embedded, template }: HeroCopyProps) {
  return (
    <div className="relative max-w-4xl p-6 text-white md:p-12">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
        {draft.eyebrow}
      </p>
      <h1
        className={cn(
          template.titleClassName,
          embedded ? "text-5xl md:text-7xl" : "text-6xl md:text-8xl",
        )}
      >
        {draft.name}
      </h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-white/82 md:text-lg">
        {draft.description}
      </p>
    </div>
  );
}
