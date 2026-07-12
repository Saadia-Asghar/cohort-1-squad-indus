---
name: Lib rebuild before leaf typecheck
description: Must run pnpm run typecheck:libs after adding new schema files to lib/db/src/schema/ before leaf artifact typechecks pass.
---

## Rule
After adding new files to any `lib/*` package (especially `lib/db/src/schema/`), run `pnpm run typecheck:libs` before running leaf artifact typechecks.

**Why:** Lib packages are composite and emit declarations. Leaf packages import from `@workspace/db` etc. using the emitted `.d.ts` files. If the lib hasn't been rebuilt, the new exports don't exist in the compiled output, causing "has no exported member" errors in routes.

**How to apply:** Any time you touch a `lib/*` package, always run `pnpm run typecheck:libs` first, then run the leaf artifact typecheck.
