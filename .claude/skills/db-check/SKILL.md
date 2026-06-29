---
name: db-check
description: Inspect Prisma migration health for this resort booking app — detect un-applied migrations, schema drift between schema.prisma and the database, and uncommitted migration folders. Use when the user mentions migrations, "schema drift", "did I forget a migration", database changes, or before deploying.
---

# db-check — Prisma migration & drift check

This app uses Prisma with a **MySQL** datasource (`prisma/schema.prisma`). Migrations live in `prisma/migrations/`.

## Steps

1. **Validate schema** — `npx prisma validate`. Stop and report if invalid.
2. **Migration status** — `npx prisma migrate status`. Identify:
   - migrations present in the folder but not applied to the DB
   - migrations applied to the DB but missing locally
   - whether the schema has drifted from the migration history
3. **Uncommitted migrations** — `git status --short prisma/migrations` to list migration folders not yet committed.
4. **Schema vs client** — if `schema.prisma` is newer than the generated client, recommend `npx prisma generate`.

## Reporting

Summarize in plain language:
- ✅ "In sync" or ❌ a specific issue.
- For each pending/uncommitted migration, list its folder name.
- If drift is detected, explain whether a new migration is needed (`npx prisma migrate dev --name <desc>`) vs. the DB needs catching up (`npx prisma migrate deploy`).

## Guardrails

- **Never** run `prisma migrate reset`, `migrate deploy`, or any command that writes to the database unless the user explicitly asks — this is a read-only health check by default.
- Treat production `DATABASE_URL` with care; prefer reporting over mutating.
