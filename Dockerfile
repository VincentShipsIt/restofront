FROM oven/bun:1.3.14-alpine AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/restofront_build
ENV DATABASE_URL=$DATABASE_URL
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV WORKFLOW_TARGET_WORLD=@workflow/world-postgres
COPY . .
RUN bun run build

FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public
COPY --from=builder --chown=bun:bun /app/prisma ./prisma
COPY --from=builder --chown=bun:bun /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=bun:bun /app/package.json ./package.json
COPY --chown=bun:bun deploy/aws/container-entrypoint.sh ./deploy/aws/container-entrypoint.sh

USER bun
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=18 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/ready >/dev/null || exit 1
ENTRYPOINT ["/app/deploy/aws/container-entrypoint.sh"]
