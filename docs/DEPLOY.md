# Sweet Tooth — Deploy Guide

Deploy the **Replit monorepo** (`artifacts/sweet-tooth` + `artifacts/api-server`), not the Base44 root `src/` app.

## Prerequisites

- Supabase project: `gdmciybkdiuomowvpjyn` (or your own Postgres)
- Meta Developer app (for WhatsApp webhook — optional for MVP demo)

## 1. Database (Supabase)

Tables live in schema `sweet_tooth`. Already migrated if you used the Supabase MCP setup.

**Connection string** (Session pooler, port 6543):

```
postgresql://postgres.gdmciybkdiuomowvpjyn:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Create `.env` at repo root (copy from `.env.example`):

```bash
DATABASE_URL=postgresql://postgres.gdmciybkdiuomowvpjyn:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
PORT=8080
BASE_PATH=/
WHATSAPP_VERIFY_TOKEN=your-random-verify-string
WHATSAPP_ACCESS_TOKEN=   # from Meta → WhatsApp → API setup
PUBLIC_API_URL=https://your-api-domain.com
```

Seed data:

```powershell
cd Sweet-Tooth
npx pnpm@10 --filter @workspace/api-server run seed
```

## 2. Local preview

```powershell
.\scripts\start-preview.ps1 -DbPassword "YOUR_SUPABASE_PASSWORD"
```

- Frontend: http://localhost:20458  
- API: http://localhost:8080/api/healthz  
- WhatsApp setup: http://localhost:8080/api/webhooks/whatsapp/setup  

## 3. Deploy API (Render / Railway / Replit)

| Platform | Notes |
|----------|-------|
| **Replit** | Use existing `artifacts/api-server/.replit-artifact/artifact.toml` — set `DATABASE_URL` in Secrets |
| **Render** | Web service, build: `pnpm --filter @workspace/api-server run build`, start: `node artifacts/api-server/dist/index.mjs` |
| **Railway** | Same as Render; add all env vars |

Required env on host:

- `DATABASE_URL`
- `PORT` (usually injected by host)
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN` (for live WhatsApp)
- `PUBLIC_API_URL` (public API base, e.g. `https://sweet-tooth-api.onrender.com`)

## 4. Deploy frontend

| Platform | Notes |
|----------|-------|
| **Replit** | `artifacts/sweet-tooth/.replit-artifact/artifact.toml` |
| **Vercel / Netlify** | Build: `pnpm --filter @workspace/sweet-tooth run build`, output: `artifacts/sweet-tooth/dist/public` |
| **Same Replit** | Proxy `/api` → API service URL in production |

Set `VITE_API_URL` only if not using same-origin `/api` proxy.

## 5. WhatsApp webhook (Cohort Idea 8)

1. Meta for Developers → Create App → WhatsApp  
2. Callback URL: `https://YOUR_API_DOMAIN/api/webhooks/whatsapp`  
3. Verify token: same as `WHATSAPP_VERIFY_TOKEN` or per-baker token in Agent Hub  
4. Subscribe to `messages`  
5. Copy **temporary access token** → `WHATSAPP_ACCESS_TOKEN`  
6. In Agent Hub → WhatsApp tab → enable agent → save verify token  

Test: send a WhatsApp message to your business number — agent replies from catalog/RAG.

## 6. Demo Day checklist

- [ ] Public frontend URL works  
- [ ] Public API `/api/healthz` returns 200  
- [ ] Browse → cart → COD checkout creates order  
- [ ] Agent Hub → Reindex Knowledge succeeds  
- [ ] WhatsApp test message gets auto-reply (or in-app chat demo)  
- [ ] README links to live URL + case study in `docs/cohort/`  
