# Sweet Tooth

Pakistan's home baker marketplace — buyers discover and order from nearby home bakers (COD), bakers manage their business from a dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/sweet-tooth run dev` — run the frontend (port 20458, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed the database with demo data (Sana's Sweet Studio + 2 other bakers)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui
- API: Express 5 (artifact: `api-server`, port 8080)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Routing: wouter (frontend), Express Router (backend)
- State: TanStack Query v5 (generated hooks from Orval)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas for backend route validation
- `lib/db/src/schema/` — Drizzle table definitions (bakers, products, orders, cart_items, reviews, customers, chat_messages)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/sweet-tooth/src/pages/buyer/` — marketplace pages (home, bakers, baker-profile, cart, orders)
- `artifacts/sweet-tooth/src/pages/dashboard/` — baker dashboard pages (home, orders, catalog, payments, analytics, customers, calendar, settings)
- `artifacts/sweet-tooth/src/hooks/use-session.ts` — buyer/baker session (localStorage, default buyerId=1, bakerId=1)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod schemas. Never write raw fetch calls on the frontend.
- Orval collision rule: operations with BOTH path params AND query params can generate a TS2308 collision. Fix: convert the query param to a path param (e.g., `/analytics/baker/{bakerId}/{period}`, `/chat/{bakerId}/history/{buyerId}`).
- `cartItem: type: ["object","null"]` in OpenAPI 3.1 generates `zod.looseObject` which doesn't exist in Zod v3. Use scalar nullable types only.
- Chat agent: rule-based (no LLM) with **RAG fallback** from `knowledge_chunks` embeddings — see `.agents/memory/agent-memory-rag.md`.
- Demo session: buyer ID 1, baker ID 1 (Sana's Sweet Studio) hardcoded in localStorage for demo. No real auth.

## Product

**Buyer marketplace:**
- `/` — Homepage: city selector, search, category grid, featured baker cards
- `/bakers` — Baker discovery with live search
- `/bakers/:id` — Baker profile: full menu (sizes, eggless badge, add-to-cart), reviews, floating chat widget
- `/cart` — Cart management and checkout
- `/orders` — Buyer order history

**Baker dashboard** (all at `/dashboard/*`):
- Overview KPIs, order pipeline with live status updates, catalog editor with stock toggle, COD payments log with "Handled" button, sales analytics with top products, customer CRM ("Your Regulars"), calendar, settings

## User preferences

_Populate as you build._

## Gotchas

- Google Fonts `@import url(...)` must be the VERY FIRST line of `index.css` — before `@import "tailwindcss"` or PostCSS fails silently.
- Run `pnpm run typecheck:libs` after adding new lib schema files before checking leaf packages (lib declarations must be rebuilt first).
- Seed script lives in `artifacts/api-server/src/seed.ts` (uses api-server's deps which include drizzle-orm + @workspace/db).
- Do NOT run `pnpm dev` at workspace root — use workflow restart or per-package filter commands.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
