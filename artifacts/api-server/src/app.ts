import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes/index.js";
import { ensureDatabase } from "./bootstrap-db.js";
import { isPublicApiWithoutClerk, shouldMountClerkMiddleware } from "./lib/clerk-gate.js";

// Vercel has no separate migration runner for this API. Initialise the
// idempotent schema before exposing routes, including for a newly linked Neon DB.
await ensureDatabase();
const { hydratePlatformBillingFromDb } = await import("./routes/admin.js");
await hydratePlatformBillingFromDb().catch((error) => {
  console.error("hydrate platform billing failed", error);
});

const app = express();

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;

if (publishableKey && secretKey && shouldMountClerkMiddleware()) {
  const clerk = clerkMiddleware({ publishableKey, secretKey });
  app.use((req, res, next) => {
    if (isPublicApiWithoutClerk(req.path)) {
      next();
      return;
    }
    clerk(req, res, next);
  });
}

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "https://cohort-1-squad-indus-sweet-tooth.vercel.app",
  ...(process.env.NODE_ENV !== "production" && !process.env.VERCEL
    ? ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5180", "http://127.0.0.1:5180"]
    : []),
].filter((origin): origin is string => Boolean(origin)));

function isAllowedBrowserOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  try {
    // Permit only this project's Vercel preview deployments, not arbitrary
    // Vercel sites. This keeps preview QA functional without opening CORS.
    const host = new URL(origin).hostname;
    return /^cohort-1-squad-indus-sweet-tooth-[a-z0-9-]+\.vercel\.app$/i.test(host);
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include server-to-server webhooks and
    // health checks. Browser requests must come from the configured UI.
    if (!origin || isAllowedBrowserOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "PUT", "OPTIONS"],
}));
// Meta signs the exact webhook bytes. This parser must run before the global
// JSON parser so the WhatsApp route can verify the signature safely.
app.use("/api/webhooks/whatsapp", express.raw({ type: "application/json", limit: "256kb" }));
app.use("/api/webhooks/instagram", express.raw({ type: "application/json", limit: "256kb" }));
// Receipt photos are the only public JSON payload allowed above the global
// limit. The route still validates MIME type, decoded size and a signed token.
app.use("/api/orders/:orderId/guest-receipt", express.json({ limit: "6mb" }));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Indus API is running", health: "/api/healthz" });
});

app.use("/api", router);

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("unhandled api error", error);
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(500).json({ error: "Internal server error." });
});

export default app;
