import posthog from "posthog-js";

// The PostHog project token is deliberately public: it is a browser analytics
// identifier, not a server secret. Do not put database, Meta, or API secrets
// in VITE_ variables because Vite publishes them to every visitor.
const projectToken = import.meta.env.VITE_POSTHOG_KEY?.trim();
const apiHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

let initialized = false;

export function initializeProductAnalytics() {
  if (initialized || !projectToken || typeof window === "undefined") return;

  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-05-30",
    capture_pageview: true,
    autocapture: false,
  });
  initialized = true;
}

export function captureProductEvent(event: string, properties?: Record<string, string | number | boolean | null | undefined>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// Use a stable internal identifier only. Never send a baker's email, phone
// number, access token, message contents, or customer order details to analytics.
export function identifyBakerForAnalytics(bakerId: number) {
  if (!initialized || !Number.isInteger(bakerId) || bakerId <= 0) return;
  posthog.identify(`baker:${bakerId}`, { account_role: "baker" });
}

export function resetProductAnalytics() {
  if (!initialized) return;
  posthog.reset();
}
