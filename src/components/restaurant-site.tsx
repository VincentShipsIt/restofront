import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { formatPrice, type RestaurantDraft } from "@/lib/restaurant";
import { cn } from "@/lib/utils";

export function RestaurantSite({
  draft,
  embedded = false,
}: {
  draft: RestaurantDraft;
  embedded?: boolean;
}) {
  const booking = draft.integrations.find(
    (integration) => integration.type === "booking",
  );
  const ordering = draft.integrations.find((integration) =>
    ["ordering", "delivery"].includes(integration.type),
  );

  return (
    <article
      className={cn(
        "overflow-hidden bg-[#f4efe5] text-[#1d241f]",
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
      <header className="absolute z-10 flex w-full items-center justify-between p-5 text-white md:p-8">
        <span className="font-display text-2xl tracking-[-0.03em]">
          {draft.name}
        </span>
        <div className="flex items-center gap-2">
          {ordering ? (
            <a
              href={ordering.url}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-white/40 bg-black/10 px-4 py-2 text-xs font-medium backdrop-blur sm:inline-flex"
            >
              {ordering.label}
            </a>
          ) : null}
          {booking ? (
            <a
              href={booking.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#1d241f]"
            >
              {booking.label}
            </a>
          ) : null}
        </div>
      </header>

      <section
        className={cn(
          "relative flex items-end overflow-hidden",
          embedded ? "min-h-[520px]" : "min-h-[80svh]",
        )}
      >
        {draft.heroImageUrl ? (
          <div
            role="img"
            aria-label={`Dining room at ${draft.name}`}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${draft.heroImageUrl}")` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,18,14,0.84),rgba(20,18,14,0.04)_65%)]" />
        <div className="relative max-w-4xl p-6 text-white md:p-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            {draft.eyebrow}
          </p>
          <h1
            className={cn(
              "font-display max-w-3xl tracking-[-0.045em]",
              embedded
                ? "text-5xl leading-[0.93] md:text-7xl"
                : "text-6xl leading-[0.9] md:text-8xl",
            )}
          >
            {draft.name}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/82 md:text-lg">
            {draft.description}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[0.72fr_1.28fr] md:px-10 md:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-55">
            The menu
          </p>
          <h2 className="font-display mt-3 text-5xl leading-none tracking-[-0.04em]">
            Cooked with the season.
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

        <div className="space-y-12">
          {draft.menuSections.map((section) => (
            <section key={section.name}>
              <div className="mb-5 border-b border-current/20 pb-4">
                <h3 className="font-display text-3xl tracking-[-0.03em]">
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
