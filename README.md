# Restofront

Restofront turns an existing restaurant website—or just a restaurant name—into a private, prefilled, mobile-first website preview. The restaurant keeps its existing booking, ordering, and delivery providers. It claims the finished preview, subscribes, then connects its domain.

## Product flow

1. Paste a restaurant URL or name.
2. Import public website content with SSRF-safe fetching and bounded HTML reads.
3. Recover the menu, contact details, imagery, and external integrations.
4. Generate a structured website draft with AI Gateway when configured, or a deterministic demo draft locally.
5. Save a private preview through a durable Vercel Workflow.
6. Claim the restaurant through Stripe Checkout; the completed checkout creates the prefilled owner account.
7. Attach the restaurant domain to the Vercel project and show the exact DNS records.
8. Monitor and maintain the menu, imagery, and external links from the dashboard.

## Stack

- Next.js 16 App Router and React 19
- Bun
- Tailwind CSS v4 and shadcn/ui
- Prisma 7 with PostgreSQL and the `pg` driver adapter
- Vercel AI SDK 6 and AI Gateway
- Vercel Workflow DevKit
- Stripe subscriptions
- Resend passwordless sign-in links
- Vercel Projects API for customer domains

## Local setup

```bash
bun install
cp .env.example .env.local
bun run dev
```

The marketing site and deterministic preview flow work without external credentials. Production integrations activate when their environment variables are configured.

Do not run migrations against production from a local machine. Create the database, then apply the schema through the deployment workflow:

```bash
bunx --bun prisma migrate dev --name init
```

## Required production configuration

### Database

- `DATABASE_URL`

### AI generation

Link the Vercel project and enable AI Gateway. Vercel provisions `VERCEL_OIDC_TOKEN` automatically in deployments.

- `AI_TEXT_MODEL` defaults to `openai/gpt-5.4`
- `AI_IMAGE_MODEL` defaults to `google/gemini-3.1-flash-image-preview`
- `WORKFLOW_ENABLED=true`

### Billing

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_STARTER_PRICE_ID`
- `STRIPE_GROWTH_PRICE_ID`

Configure the webhook endpoint as:

```text
https://<app-domain>/api/webhooks/stripe
```

### Owner sign-in

- `CLAIM_TOKEN_SECRET` with at least 32 random characters
- `RESEND_API_KEY`
- `EMAIL_FROM`

### Customer domains

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` when the project belongs to a team

The application first attaches the hostname to the project. It then shows Vercel's returned verification challenge or the general-purpose A/CNAME record. The customer changes DNS only after this step.

## Security boundaries

- Import URLs are limited to HTTP(S), DNS-resolved before every redirect, and rejected when any address is local or private.
- HTML responses are content-type checked, timeout bounded, and capped at 1.5 MB.
- AI output is validated with Zod before it enters the product.
- Existing booking and ordering links are extracted from source material and override model-generated links.
- Stripe webhooks verify the raw body signature.
- Dashboard sessions are HMAC-signed, HTTP-only, same-site cookies.
- Restaurant mutations require a session matching the restaurant slug.
- Arbitrary restaurant images load directly in the browser instead of through the Next.js image proxy.

## Useful routes

- `/` — marketing and URL intake
- `/create` — import and preview studio
- `/claim/[slug]` — pricing and claim checkout
- `/dashboard` — authenticated restaurant management
- `/dashboard?demo=1` — local demo dashboard
- `/preview/[slug]` — private full-screen restaurant preview
