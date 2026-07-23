# Platform services runbook

Restofront needs PostgreSQL, Upstash Redis, and Vercel Blob before a preview or
production deployment can accept public imports. Provisioning remains a manual,
reviewed infrastructure action; application deployments do not create paid
resources.

## Environment isolation

Create separate provider resources for the Vercel `Preview` and `Production`
scopes. Never copy the production database URL into Preview.

| Service | Preview | Production | Runtime variables |
| --- | --- | --- | --- |
| PostgreSQL | Dedicated preview database or branch | Dedicated production database | `DATABASE_URL` |
| Upstash Redis | Dedicated preview database | Dedicated production database | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Vercel Blob | Dedicated preview store | Dedicated production store | `BLOB_READ_WRITE_TOKEN` |

After configuring each scope, redeploy it and request `/api/health/ready`. The
route returns `200` only when all three services are configured and reachable.
When configuration is missing, it returns `503` with the missing variable names
and remediation guidance. Provider failures return a generic unreachable
response without variable names or provider details. The route never returns
connection URLs, tokens, or provider error bodies.

Set a distinct `HEALTHCHECK_TOKEN` with at least 32 random bytes in each
environment. Readiness callers must send it as a bearer token:

```bash
curl --fail-with-body \
  --header "Authorization: Bearer $HEALTHCHECK_TOKEN" \
  https://<deployment-host>/api/health/ready
```

The route fails closed when the token is missing or invalid. Each application
instance also coalesces concurrent probes and caches the aggregate result for
five seconds to avoid amplifying health checks into the database, Redis, and
Blob providers.

## Database release procedure

Committed migrations in `prisma/migrations` are the only production schema
source. Do not use `prisma db push` or `prisma migrate dev` against Preview or
Production.

1. Confirm the target shell or CI environment contains the reviewed target
   `DATABASE_URL`.
2. Take or verify a provider backup before any destructive migration.
3. Check migration state with `bun run db:migrate:status`.
4. Apply pending migrations with `bun run db:migrate:deploy`.
5. Redeploy the application and confirm `/api/health/ready` returns `200`.
6. Record the migration name, target environment, operator, and backup reference
   in the release record.

Run Preview first. A failed migration must stop the release; inspect the
`_prisma_migrations` record and the provider logs before using
`prisma migrate resolve`. Never mark a failed migration as applied without
reviewing the resulting schema.

## Backup and restore

- Enable the managed database provider's continuous backup or point-in-time
  recovery before the first production migration.
- Keep Preview restore drills separate from Production. Perform a quarterly
  restore into a new, isolated database and verify the migration table and a
  sample restaurant record before deleting the drill database.
- Restore by creating a new database from the selected recovery point, applying
  any later reviewed migrations, validating it, then replacing `DATABASE_URL`
  through a reviewed environment change. Do not overwrite the existing database
  in place.
- Blob originals and enhanced derivatives are operational data. Retain authentic
  source URLs and provenance in PostgreSQL; verify the store's retention policy
  before onboarding the first restaurant.

## Credential ownership and rotation

The repository owner is accountable for provider access, backup policy, and
release approval. A migration operator may execute the reviewed commands but
must not copy credentials into issues, pull requests, logs, or local production
environment files.

Rotate database, Redis, and Blob credentials every 90 days and immediately after
suspected exposure or an operator access change:

1. Create the replacement credential in the provider.
2. Update Preview and verify readiness.
3. Update Production during a reviewed release window and verify readiness.
4. Revoke the old credential only after both environments are healthy.
5. Record the date, owner, affected environment, and verification result without
   recording the credential value.
