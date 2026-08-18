# Sweet Tooth — bakery order workspace

**Sweet Tooth** (*Meethi Khushiyan, Ghar Se Aap Tak*) helps Pakistan’s home bakers take orders from the people they already talk to: **WhatsApp**, **Instagram**, and a **menu link they share**. It is **not** a Daraz-style marketplace. Customers do not browse every bakery.

Bakers publish a menu, share it (link or QR), and connect WhatsApp / Instagram. The assistant collects cake details from those chats. Orders, payments, and the production calendar stay in one dashboard.

---

## What this product is

| For bakers | For their customers |
| --- | --- |
| Inbox for WhatsApp, Instagram, and the shared-menu web agent | Open the **menu link the baker sent** |
| Remember returning buyers (eggless, area, allergies, baker notes) | Chat on that menu, WhatsApp, or Instagram |
| Orders, JazzCash proof review, khata, calendar | Not a mall of other bakeries |

Admin (`/admin`) activates baker plans after JazzCash / Easypaisa / bank confirmation. There is no payment gateway.

---

## Key features

### Baker authentication
* Native JWT (email/phone + password) is the default. Tokens are stored as `baker_token`.
* Clerk SSO is optional — only when Clerk keys are set. See **[docs/CLERK_SETUP.md](docs/CLERK_SETUP.md)**.
* Admin portal is `/admin`. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; the API issues a signed admin JWT.

### WhatsApp, Instagram, and shared menu
* Webhooks: `/api/webhooks/whatsapp`, `/api/webhooks/instagram`.
* WhatsApp Embedded Signup + Instagram Meta connect in Agent Hub.
* Tokens are encrypted per bakery (`TOKEN_ENCRYPTION_KEY`).
* Each bakery has a shareable menu at `/menu/:bakerId`. Copy it from the dashboard or Settings (QR included).

### Payments
* Buyers can upload a JazzCash / Easypaisa screenshot after checkout.
* OCR is advisory only — it never auto-marks paid.

### Agent + memory
* Rule-based replies first; RAG fallback from indexed menu/policy chunks.
* Conversation memory stores slots (eggless, area, allergies, occasion), including Roman Urdu like *anda nahi*. Summaries are not wiped every turn.
* Bakers can pin a note and eggless flag on **Customers** so the agent honours it.

### Analytics
* Revenue/order charts and retention stats.
* WhatsApp broadcasts go through the bakery’s connected Meta number.

### Ordering
* Shared menu can use the web assistant and/or hand off to WhatsApp/Instagram.
* Guest checkout on that baker’s menu (`/cart`) with server-side price verification.
* Order status uses the secure link from checkout — not a public phone lookup.

---

## Project structure

```
Sweet-Tooth/
├── artifacts/
│   ├── api-server/         # Express API (Meta webhooks, agent, RAG)
│   └── sweet-tooth/        # React + Vite (baker dashboard + shared menus)
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/
├── package.json
└── vercel.json
```

---

## Local setup

API: copy `artifacts/api-server/.env.example` → `artifacts/api-server/.env`. Local Postgres can also come from the parent `D:\sweettooth app\.env` (`DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_PORT`).

Frontend: copy `artifacts/sweet-tooth/.env.example` → `.env`. For local Vite, leave `VITE_API_URL` unset so `/api` proxies to port 8080.

If ApplyOne (or another app) already uses **5173**, run Sweet Tooth on **5180**:

```powershell
$env:PORT='5180'; pnpm --filter @workspace/sweet-tooth run dev
```

Meta: `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `TOKEN_ENCRYPTION_KEY`.

**Platform billing (no JazzCash merchant API):** `PLATFORM_WHATSAPP`, `PLATFORM_PAYMENT_DETAILS`, optional `PLATFORM_BILLING_NAME`. Bakers transfer, WhatsApp a receipt, you activate from `/admin`.

```bash
pnpm install
pnpm --filter @workspace/api-server run build
```

```powershell
# API (PowerShell)
$env:NODE_ENV='development'; $env:PORT='8080'; pnpm --filter @workspace/api-server run start

# Frontend
$env:PORT='5180'; pnpm --filter @workspace/sweet-tooth run dev
```

* UI: `http://localhost:5180/`
* Baker dashboard: `http://localhost:5180/dashboard`
* Admin: `http://localhost:5180/admin`
* Shared menu example: `http://localhost:5180/menu/1`
* API health: `http://localhost:8080/api/healthz`

---

## Live (Vercel)

* App: https://cohort-1-squad-indus-sweet-tooth.vercel.app/
* Baker login: https://cohort-1-squad-indus-sweet-tooth.vercel.app/login
* Admin: https://cohort-1-squad-indus-sweet-tooth.vercel.app/admin
* Waitlist: https://cohort-1-squad-indus-sweet-tooth.vercel.app/waitlist
* API health: https://cohort-1-squad-indus-api-server-z3b.vercel.app/api/healthz

Admin sign-in uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` on the **API** Vercel project. Those values are not committed. Demo bakeries (created from Admin → Create / refresh demo bakeries, or `POST /api/admin/enrich-demo`):

| Email | Password | Plan |
| --- | --- | --- |
| `sana@studio.com` | `SanaSweet2026!` | Bakery Plus |
| `fatima@cakery.com` | `FatimaCake2026!` | Kitchen Standard |
| `amna@bakes.com` | `AmnaBakes2026!` | Launch Free |
