# 🧁 Sweet Tooth — AI-Powered Home-Baker Commerce Platform

**Sweet Tooth** (*Meethi Khushiyan, Ghar Se Aap Tak*) is an all-in-one AI commerce, customer retention, and automated order management platform built specifically for home-based bakeries and micro-food businesses.

---

## ✨ Key Features & Architecture

### 1. 🔐 Baker authentication
* **Native credentials** (email/phone + password) work without Clerk.
* **Clerk SSO** is optional — only enabled when `VITE_CLERK_PUBLISHABLE_KEY` / API Clerk secrets are set for the deployment domain. See **[docs/CLERK_SETUP.md](docs/CLERK_SETUP.md)** for Google sign-in on Vercel.
* **Per-baker data isolation** for catalog, customers, and orders.

### 2. 📱 Omnichannel Meta (Instagram & WhatsApp)
* Webhooks: `/api/webhooks/whatsapp`, `/api/webhooks/instagram`.
* **WhatsApp Embedded Signup** + **Instagram Meta connect** in Agent Hub (requires Meta app env vars).
* Tokens are encrypted per bakery (`TOKEN_ENCRYPTION_KEY`).

### 3. 🔍 OCR payment slip review (advisory)
* Buyers can upload a JazzCash / Easypaisa screenshot after checkout on the cart success screen.
* Bakers can also upload/check receipts on **Payments**. OCR is advisory only — it never auto-marks paid.
* File upload works without Cloudinary; `RECEIPT_IMAGE_HOSTS` is only needed for pasted external URLs.

### 4. 🧠 Smart AI assistant & RAG memory
* Rule-based replies first; **RAG fallback** from indexed menu/policy chunks when rules miss.
* Conversation memory + knowledge reindex after catalog/policy changes.

### 5. 📊 Analytics & outreach
* Revenue/order charts and retention stats.
* WhatsApp broadcasts send through the bakery’s connected Meta number (not a mock gateway).

### Ordering model
* Menus can hand off to WhatsApp/Instagram, or use the web assistant.
* **Guest web checkout** is available (`/cart`) with server-side price verification.
* Buyers can look up order status by WhatsApp number on `/orders`.

---

## 🛠️ Project Structure (Monorepo)

```
Sweet-Tooth/
├── artifacts/
│   ├── api-server/         # Express.js API server (OCR, Meta Webhooks, RAG Engine)
│   └── sweet-tooth/        # React + Vite Frontend (Baker Dashboard & Marketplace)
├── lib/
│   ├── api-client-react/   # Generated React Query API hooks
│   ├── api-spec/           # OpenAPI 3.0 specification
│   ├── api-zod/            # Generated Zod validation schemas
│   └── db/                 # Drizzle ORM database schemas (Supabase PostgreSQL)
├── package.json
└── vercel.json             # Vercel serverless deployment config
```

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites & Environment Variables
API: copy `artifacts/api-server/.env.example` → `.env` (or set on Vercel).
Frontend: copy `artifacts/sweet-tooth/.env.example` and set at least `VITE_API_URL`.

Meta connect also needs on the API: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `TOKEN_ENCRYPTION_KEY`.
OCR hosts: `RECEIPT_IMAGE_HOSTS`.

**Optional agent observability (free Hobby):** [Langfuse Cloud](https://cloud.langfuse.com) — set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and optionally `LANGFUSE_BASE_URL` (default EU cloud). No credit card; traces every chat turn (web/WhatsApp/Instagram) so you can see escalations and weak replies. Without these keys, tracing is off.

**Optional n8n automations:** set `N8N_WEBHOOK_URL` (+ `N8N_WEBHOOK_SECRET`). Events: `order.created`, `chat.received`, `chat.escalated`, `payment.advance_reminder`, `billing.upgrade_requested`, `billing.plan_activated`. Use n8n for WhatsApp follow-ups / Slack alerts — keep RAG + caps in the API.

**Platform billing (free, no JazzCash API):** set `PLATFORM_WHATSAPP`, `PLATFORM_PAYMENT_DETAILS`, and optional `PLATFORM_BILLING_NAME`. Bakers pick a plan in Settings → transfer → WhatsApp you with a receipt. Activate with `POST /api/admin/activate-plan` and `Authorization: Bearer <JWT_SECRET>` body `{ "bakerId": 1, "planId": "starter" }`.

**Optional Google sign-in:** follow [docs/CLERK_SETUP.md](docs/CLERK_SETUP.md), then run `.\scripts\sync-clerk-vercel.ps1`.

### 2. Install Dependencies & Build
```bash
pnpm install
pnpm --filter @workspace/api-server run build
```

### 3. Run Development Servers
```bash
# Terminal 1: API Server
pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend Client
pnpm --filter @workspace/sweet-tooth run dev
```

* **Frontend Marketplace**: `http://localhost:20458/`
* **API Health Check**: `http://localhost:8080/api/healthz`
