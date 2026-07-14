import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { ensureDatabase } from "./bootstrap-db.js";

// Vercel has no separate migration runner for this API. Initialise the
// idempotent schema before exposing routes, including for a newly linked Neon DB.
await ensureDatabase();

const app = express();

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "https://cohort-1-squad-indus-sweet-tooth.vercel.app",
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
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Indus API is running", health: "/api/healthz" });
});

app.use("/api", router);

export default app;
