import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Globe2,
  Images,
  MenuSquare,
  MousePointerClick,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HomepageTransformation } from "@/components/homepage-transformation";
import { ImportForm } from "@/components/import-form";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Drop the old website",
    copy: "Paste a URL or restaurant name. Restofront recovers the menu, contact details, imagery and current integrations.",
  },
  {
    number: "02",
    title: "Review the finished preview",
    copy: "A private mobile-first site arrives ready to inspect—not another empty template asking for setup work.",
  },
  {
    number: "03",
    title: "Claim it and go live",
    copy: "Choose a plan, connect the domain, and keep every booking and ordering system already in place.",
  },
];

const features = [
  {
    icon: MenuSquare,
    title: "A menu people can actually use",
    copy: "Structured, searchable and designed for thumbs—not a tiny PDF trapped behind three taps.",
  },
  {
    icon: Images,
    title: "Food imagery that fits",
    copy: "Recover the best existing photography and generate missing editorial images without inventing dishes.",
  },
  {
    icon: CalendarCheck2,
    title: "Bookings stay untouched",
    copy: "OpenTable, SevenRooms, Resy, TheFork and custom booking links remain the source of truth.",
  },
  {
    icon: RefreshCcw,
    title: "Always-current presence",
    copy: "Menu, hours and integration checks become an ongoing service, not another redesign project.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="paper-grid overflow-hidden border-b">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
            <div className="relative z-10 self-center">
              <Badge
                variant="secondary"
                className="mb-6 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-primary"
              >
                <Sparkles className="size-3" />
                Your old site in. A finished one out.
              </Badge>
              <h1 className="font-display text-balance max-w-2xl text-[clamp(4.2rem,8vw,7.6rem)] leading-[0.83] tracking-[-0.055em]">
                Your front door, always current.
              </h1>
              <p className="mt-7 max-w-xl text-balance text-lg leading-8 text-muted-foreground">
                Give us the restaurant. Get back a polished mobile-first
                website with the menu already inside—and keep the booking and
                ordering tools that already work.
              </p>
              <ImportForm className="mt-9" />
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" /> No setup call
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" /> Private preview
                  first
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" /> From €25/month
                </span>
              </div>
            </div>

            <HomepageTransformation />
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"
        >
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Less onboarding. More done.
              </p>
              <h2 className="font-display mt-4 max-w-md text-6xl leading-[0.92] tracking-[-0.045em]">
                Start with the finished thing.
              </h2>
            </div>
            <div className="divide-y border-y">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="grid gap-3 py-7 sm:grid-cols-[64px_1fr_1.4fr] sm:items-start"
                >
                  <span className="font-mono text-xs text-primary">
                    {step.number}
                  </span>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#1d241f] text-white">
          <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
            <div className="flex flex-col gap-8 border-b border-white/15 pb-12 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#dc8d6d]">
                  The digital presence custodian
                </p>
                <h2 className="font-display mt-4 max-w-3xl text-6xl leading-[0.9] tracking-[-0.045em] md:text-7xl">
                  We improve the website. Not your whole operation.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-white/58">
                Restofront sits around the systems a restaurant already trusts,
                presenting them beautifully without forcing a painful migration.
              </p>
            </div>

            <div className="grid md:grid-cols-2">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className={`min-h-64 border-white/15 p-7 md:p-10 ${
                    index % 2 === 0 ? "md:border-r" : ""
                  } ${index < 2 ? "border-b" : ""}`}
                >
                  <feature.icon className="size-5 text-[#dc8d6d]" />
                  <h3 className="mt-12 text-xl font-medium">{feature.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/55">
                    {feature.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
            <div className="relative min-h-[500px]">
              <Image
                src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1400&q=85"
                alt="Restaurant dish photographed in natural light"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="flex flex-col justify-center px-6 py-20 md:px-16 lg:py-24">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Credible imagery, not fantasy food
              </p>
              <h2 className="font-display mt-4 text-6xl leading-[0.92] tracking-[-0.045em]">
                Fill the visual gaps without faking the restaurant.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
                Restofront prioritises real source photography, then creates
                complementary editorial images for missing categories. Every
                generated asset stays reviewable before publishing.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border bg-card p-4 text-sm">
                  <ShieldCheck className="mb-3 size-4 text-primary" />
                  No invented prices, allergens or booking availability
                </div>
                <div className="rounded-xl border bg-card p-4 text-sm">
                  <MousePointerClick className="mb-3 size-4 text-primary" />
                  One click to regenerate, replace or remove any image
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Simple ongoing care
            </p>
            <h2 className="font-display mt-4 text-6xl leading-[0.92] tracking-[-0.045em]">
              Less than one empty table.
            </h2>
            <p className="mt-5 text-muted-foreground">
              Preview first. Pay only when the restaurant wants to claim and
              publish it.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
            <div className="rounded-3xl border bg-card p-7">
              <p className="text-sm font-semibold">Starter</p>
              <p className="mt-5 font-display text-6xl tracking-[-0.05em]">
                €25
                <span className="font-sans text-sm tracking-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The always-current essentials for one independent restaurant.
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                {[
                  "Mobile-first website and menu",
                  "Existing booking and ordering links",
                  "Custom domain and SSL",
                  "Monthly source checks",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <Button
                render={<Link href="/create" />}
                nativeButton={false}
                variant="outline"
                className="mt-8 w-full"
              >
                Build a free preview
              </Button>
            </div>
            <div className="rounded-3xl border border-primary/40 bg-primary p-7 text-primary-foreground shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Growth</p>
                <Badge className="bg-white/15 text-white">Most useful</Badge>
              </div>
              <p className="mt-5 font-display text-6xl tracking-[-0.05em]">
                €50
                <span className="font-sans text-sm tracking-normal text-white/70">
                  /month
                </span>
              </p>
              <p className="mt-3 text-sm text-white/70">
                For restaurants that change often and want the work handled.
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                {[
                  "Everything in Starter",
                  "Weekly menu and hours monitoring",
                  "AI-assisted food imagery",
                  "Priority human review queue",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4" /> {item}
                  </li>
                ))}
              </ul>
              <Button
                render={<Link href="/create" />}
                nativeButton={false}
                variant="secondary"
                className="mt-8 w-full bg-white text-primary hover:bg-white/90"
              >
                Build a free preview
              </Button>
            </div>
          </div>
        </section>

        <section className="paper-grid border-t">
          <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-24 text-center lg:py-32">
            <Globe2 className="size-6 text-primary" />
            <h2 className="font-display text-balance mt-6 text-6xl leading-[0.9] tracking-[-0.05em] md:text-7xl">
              See the restaurant before asking it to change.
            </h2>
            <p className="mt-6 max-w-xl text-muted-foreground">
              Paste one website. Restofront will do the first draft.
            </p>
            <ImportForm compact className="mt-9" />
          </div>
        </section>
      </main>

      <footer className="border-t bg-[#1d241f] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="font-semibold text-white">Restofront</span>
          <span>Your restaurant&apos;s front door, always current.</span>
          <Link
            href="/create"
            className="flex items-center gap-1.5 text-white"
          >
            Build a preview <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </footer>
    </>
  );
}
