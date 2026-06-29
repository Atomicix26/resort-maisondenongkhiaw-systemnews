---
name: qa
description: Run the full local quality gate for this resort booking app — lint, typecheck, unit tests, and Prisma schema validation — mirroring the CI workflow. Use before committing, opening a PR, or whenever the user asks to "check everything", "run the checks", or "make sure nothing is broken".
---

# qa — local quality gate

Run the same checks CI runs (`.github/workflows/ci.yml`), in order, and report results. Stop and surface failures clearly; do not "fix" unrelated code unless asked.

## Steps

Run each command and capture output. Continue through all of them even if one fails, then summarize which passed/failed.

1. **Lint** — `npm run lint`
2. **Typecheck** — `npm run typecheck`
3. **Unit tests** — `npm test`
4. **Prisma schema valid** — `npx prisma validate`
5. **Migrations in sync** — `npx prisma migrate status` (warn if there are pending/un-applied migrations or drift)

## Reporting

Print a short table: each check + ✅/❌ + the first relevant error line on failure. If everything passes, say so in one line. If a check fails, show the actionable error and the file:line — do not dump full logs.

## Notes

- This app uses Next.js 16 with breaking changes; consult `node_modules/next/dist/docs/` before changing app code (see `AGENTS.md`).
- The `EDR/` folder is a standalone tooling script and is intentionally excluded from lint.
- A full `npm run build` is part of CI but is slow; only run it if the user explicitly asks or a check above suggests a build-level problem.
