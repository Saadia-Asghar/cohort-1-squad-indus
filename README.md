# 🧁 Sweet Tooth — AI-Powered Home-Baker Commerce Platform

**Sweet Tooth** (*Meethi Khushiyan, Ghar Se Aap Tak*) is an all-in-one AI commerce, customer retention, and automated order management platform built specifically for home-based bakeries and micro-food businesses.

---

## ✨ Key Features & Architecture

### 1. 🔐 Clerk Authentication & Managed Sign-In / Sign-Up
* **Flexible Authentication**: Supports both standard password credentials and seamless Clerk authentication for baker onboarding.
* **Per-Baker Data Isolation**: Strict multi-tenant security ensuring each kitchen's catalog, customer memory, and sales stats remain completely isolated.

### 2. 📱 Omnichannel Meta Webhooks (Instagram & WhatsApp)
* **Instagram Direct Messages**: Real-time webhook listener (`/api/webhooks/instagram`) for auto-replying to customer DMs.
* **WhatsApp Embedded Signup**: Built-in Meta Connect integration for onboarding business phone numbers directly from the Baker Dashboard.
* **QuickTalk Chips**: Interactive quick-response chips for instant menu, price, and order status inquiries.

### 3. 🔍 Automated OCR Payment Slip Verification
* **Zero Manual Ledger Checks**: Built-in vision analyzer (`receipt-analyzer.ts`) scans payment screenshots (Easypaisa, JazzCash, Bank Transfers).
* **Automatic Verification**: Matches transfer amounts and destination accounts, updates order status to "Paid", and alerts the AI assistant.

### 4. 🧠 Najomi AI Assistant & RAG Memory Engine
* **24/7 Smart Bot**: Auto-answers questions regarding eggless availability, nut allergies, delivery areas, and custom cake lead times.
* **Customer Memory**: Remembers past buyer preferences (allergies, favorite cakes, delivery locations) to provide personalized greetings on return.
* **Auto-Reindexing**: Updating catalog prices or toggling stock availability instantly rebuilds the vector knowledge index.

### 5. 📊 Analytics & Customer Retention Hub
* **Performance Charts**: Filter revenue and order volume by daily, weekly, and monthly views.
* **Customer Retention Stats**: Track repeat customer ratios, average customer lifetime value (CLV), and price band trends.
* **Smart Marketing Campaigns**: One-click broadcast templates (New Mango Launches, Welcoming Discounts, Eid/Festival Greetings) targeted at specific customer segments.

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
Copy `.env.example` to `.env` and set your credentials:
```bash
DATABASE_URL=postgresql://postgres.tnoyspplfqalgtbskwgy:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
PORT=8080
PUBLIC_API_URL=http://localhost:8080
```

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
