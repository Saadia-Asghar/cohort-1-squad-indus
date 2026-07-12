---
name: Seed script location
description: The Sweet Tooth seed script lives in artifacts/api-server/src/seed.ts and runs via the api-server package which has all the required deps.
---

## Rule
The database seed script must run from within the `@workspace/api-server` package context, not from `@workspace/scripts`.

**Why:** The `scripts` package doesn't have `drizzle-orm` or `pg` in its catalog/deps. The `api-server` package already has `drizzle-orm` and `@workspace/db` as dependencies, so tsx can resolve all imports correctly.

**How to apply:**
- Seed file: `artifacts/api-server/src/seed.ts`
- Run: `pnpm --filter @workspace/api-server run seed`
- The `seed` script in api-server/package.json is: `"seed": "tsx ./src/seed.ts"`
