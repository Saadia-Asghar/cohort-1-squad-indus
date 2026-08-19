import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  Key,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { APP_REVIEW_ROLES, APP_REVIEW_USED_HOW } from "@/lib/app-review";
import { apiUrl } from "@/lib/api-url";

type BakerAdmin = {
  id: number;
  businessName: string | null;
  ownerName: string | null;
  email: string;
  whatsappNumber: string | null;
  city: string | null;
  slug: string | null;
  subscriptionPlan: string;
  agentActive: boolean;
  marketplaceVisible: boolean;
  whatsappAgentEnabled: boolean;
  instagramAgentEnabled: boolean;
  totalOrders: number;
  trialEndsAt: string | null;
  createdAt: string;
  pendingPlanId: string | null;
  billingRequestedAt: string | null;
  billingNote: string | null;
};

type WaitlistEntry = {
  id: number;
  bakerId: number | null;
  bakerName: string;
  bakerEmail: string;
  whatsappNumber: string;
  city: string | null;
  note: string | null;
  source: string;
  status: string;
  createdAt: string;
};

type AppReviewEntry = {
  id: number;
  reviewerName: string;
  email: string | null;
  role: string;
  roleNote: string | null;
  rating: number;
  reviewText: string;
  usedHow: string | null;
  createdAt: string;
};

const inputClass =
  "w-full min-h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10";
const cardClass = "rounded-2xl border border-border bg-white p-6 shadow-sm";
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50";
const ghostBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background";

function adminHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function whatsappInputFromPlatform(raw?: string | null): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length >= 12) {
    return `0${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return raw?.trim() || "0315-9127771";
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") : [];
}

function readWaitlist(value: unknown): WaitlistEntry[] {
  return asRecordArray(value).map((row) => ({
    id: Number(row.id),
    bakerId: row.bakerId == null && row.baker_id == null ? null : Number(row.bakerId ?? row.baker_id),
    bakerName: String(row.bakerName ?? row.baker_name ?? ""),
    bakerEmail: String(row.bakerEmail ?? row.baker_email ?? ""),
    whatsappNumber: String(row.whatsappNumber ?? row.whatsapp_number ?? ""),
    city: typeof row.city === "string" ? row.city : null,
    note: typeof row.note === "string" ? row.note : null,
    source: String(row.source ?? "launch"),
    status: String(row.status ?? "pending"),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
  }));
}

function readAppReviews(value: unknown): AppReviewEntry[] {
  return asRecordArray(value).map((row) => ({
    id: Number(row.id),
    reviewerName: String(row.reviewerName ?? row.reviewer_name ?? ""),
    email: typeof row.email === "string" ? row.email : null,
    role: String(row.role ?? ""),
    roleNote: typeof row.roleNote === "string" ? row.roleNote : typeof row.role_note === "string" ? row.role_note : null,
    rating: Number(row.rating ?? 0),
    reviewText: String(row.reviewText ?? row.review_text ?? ""),
    usedHow: typeof row.usedHow === "string" ? row.usedHow : typeof row.used_how === "string" ? row.used_how : null,
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
  }));
}

function waitlistWhatsAppHref(phone: string, name: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const international = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  const text = `Hi ${name}, this is Sweet Tooth. You joined the baker waitlist — we can onboard you now.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

function FlagButton({
  on,
  disabled,
  onClick,
  onLabel,
  offLabel,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-green-100 text-green-800" : "bg-accent text-primary"}`}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

export default function AdminPortal() {
  const [token, setToken] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [bakers, setBakers] = useState<BakerAdmin[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [appReviews, setAppReviews] = useState<AppReviewEntry[]>([]);
  const [listsError, setListsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  const [platformName, setPlatformName] = useState("Sweet Tooth");
  const [platformWhatsApp, setPlatformWhatsApp] = useState("0315-9127771");
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState("");

  const [metaBakerId, setMetaBakerId] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaIgPageId, setMetaIgPageId] = useState("");
  const [metaIgToken, setMetaIgToken] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaMessage, setMetaMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("admin_bearer_token");
    if (saved) {
      setToken(saved);
      void loadAdmin(saved);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized || !token) return;
    const id = window.setInterval(() => {
      void refreshLiveLists(token);
    }, 12000);
    return () => window.clearInterval(id);
  }, [isAuthorized, token]);

  const refreshLiveLists = async (bearerToken: string) => {
    try {
      const [waitlistRes, reviewsRes] = await Promise.all([
        fetch(apiUrl("/api/admin/waitlist"), { headers: adminHeaders(bearerToken) }),
        fetch(apiUrl("/api/admin/app-reviews"), { headers: adminHeaders(bearerToken) }),
      ]);
      if (waitlistRes.ok) setWaitlist(readWaitlist(await waitlistRes.json()));
      if (reviewsRes.ok) setAppReviews(readAppReviews(await reviewsRes.json()));
      if (waitlistRes.ok && reviewsRes.ok) {
        setListsError(null);
        return;
      }
      setListsError("Could not refresh waitlist or reviews from the live database.");
    } catch {
      setListsError("Could not refresh waitlist or reviews from the live database.");
    }
  };

  const loadAdmin = async (bearerToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const bakersRes = await fetch(apiUrl("/api/admin/bakers"), { headers: adminHeaders(bearerToken) });
      if (!bakersRes.ok) {
        setError("Session expired. Sign in again.");
        setIsAuthorized(false);
        return;
      }
      setBakers(await bakersRes.json());
      setIsAuthorized(true);
      localStorage.setItem("admin_bearer_token", bearerToken);

      const [waitlistRes, billingRes, reviewsRes] = await Promise.all([
        fetch(apiUrl("/api/admin/waitlist"), { headers: adminHeaders(bearerToken) }),
        fetch(apiUrl("/api/admin/platform-billing"), { headers: adminHeaders(bearerToken) }),
        fetch(apiUrl("/api/admin/app-reviews"), { headers: adminHeaders(bearerToken) }),
      ]);
      if (waitlistRes.ok) setWaitlist(readWaitlist(await waitlistRes.json()));
      else setListsError("Could not load the baker waitlist.");
      if (reviewsRes.ok) setAppReviews(readAppReviews(await reviewsRes.json()));
      else setListsError((current) => current || "Could not load live app reviews.");
      if (waitlistRes.ok && reviewsRes.ok) setListsError(null);
      if (billingRes.ok) {
        const data = await billingRes.json();
        const platform = data.platform ?? {};
        setPlatformWhatsApp(whatsappInputFromPlatform(platform.whatsappDisplay ?? platform.whatsappNumber));
        setPlatformName(platform.ownerName || "Sweet Tooth");
      }
    } catch {
      setError("Failed to connect to admin server.");
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const raw = await res.text();
      let body: { error?: string; token?: string } = {};
      try {
        body = raw ? (JSON.parse(raw) as { error?: string; token?: string }) : {};
      } catch {
        setError(
          res.status >= 500
            ? "Admin server crashed. In Vercel, open the API project and set JWT_SECRET (32+ characters) plus ADMIN_EMAIL and ADMIN_PASSWORD."
            : "Admin server returned an invalid response.",
        );
        return;
      }
      if (res.ok && body.token) {
        setToken(body.token);
        await loadAdmin(body.token);
      } else {
        setError(body.error || "Invalid credentials.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const patchBaker = async (id: number, body: Record<string, unknown>) => {
    setRowBusy(id);
    try {
      const res = await fetch(apiUrl(`/api/admin/bakers/${id}`), {
        method: "PATCH",
        headers: adminHeaders(token, true),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save baker.");
        return;
      }
      await loadAdmin(token);
    } catch {
      setError("Network error while saving baker.");
    } finally {
      setRowBusy(null);
    }
  };

  const activatePlan = async (bakerId: number, planId: string, note?: string) => {
    setActivatingId(bakerId);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/activate-plan"), {
        method: "POST",
        headers: adminHeaders(token, true),
        body: JSON.stringify({ bakerId, planId, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not activate plan.");
        return;
      }
      await loadAdmin(token);
    } catch {
      setError("Network error while activating plan.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleUpdateSettings = async (event: FormEvent) => {
    event.preventDefault();
    setUpdatingSettings(true);
    setSettingsMessage("");
    try {
      const res = await fetch(apiUrl("/api/admin/platform-billing"), {
        method: "POST",
        headers: adminHeaders(token, true),
        body: JSON.stringify({
          whatsapp: platformWhatsApp,
          ownerName: platformName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.platform) {
        setPlatformWhatsApp(whatsappInputFromPlatform(data.platform.whatsappDisplay ?? data.platform.whatsappNumber));
        setPlatformName(data.platform.ownerName || "Sweet Tooth");
      }
      setSettingsMessage(res.ok ? "Saved. Bakers now see this WhatsApp for plan payments." : `Error: ${data.error || "Update failed"}`);
    } catch {
      setSettingsMessage("Network error during settings update.");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleEnrichDemo = async () => {
    if (!window.confirm("Add demo orders and customers for existing bakers?")) return;
    setEnriching(true);
    setEnrichMessage("");
    try {
      const res = await fetch(apiUrl("/api/admin/enrich-demo"), { method: "POST", headers: adminHeaders(token) });
      const data = await res.json();
      setEnrichMessage(res.ok ? "Demo data updated." : `Error: ${data.error || "Enrich failed"}`);
      if (res.ok) await loadAdmin(token);
    } catch {
      setEnrichMessage("Network error during demo enrichment.");
    } finally {
      setEnriching(false);
    }
  };

  const handleSetBakerMeta = async (event: FormEvent) => {
    event.preventDefault();
    if (!metaBakerId) {
      setMetaMessage("Baker ID is required.");
      return;
    }
    setSavingMeta(true);
    setMetaMessage("");
    try {
      const body: Record<string, unknown> = { bakerId: parseInt(metaBakerId, 10) };
      if (metaPhoneNumberId) body.whatsappPhoneNumberId = metaPhoneNumberId;
      if (metaAccessToken) body.whatsappAccessToken = metaAccessToken;
      if (metaWabaId) body.whatsappWabaId = metaWabaId;
      if (metaAppSecret) body.metaAppSecret = metaAppSecret;
      if (metaIgPageId) body.instagramPageId = metaIgPageId;
      if (metaIgToken) body.instagramAccessToken = metaIgToken;
      const res = await fetch(apiUrl("/api/admin/set-baker-meta"), {
        method: "POST",
        headers: adminHeaders(token, true),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMetaMessage(res.ok ? data.message : data.error || "Failed to save credentials");
      if (res.ok) {
        setMetaAccessToken("");
        setMetaIgToken("");
        setMetaAppSecret("");
      }
    } catch {
      setMetaMessage("Network error.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleUpdateWaitlistStatus = async (id: number, status: string) => {
    const res = await fetch(apiUrl(`/api/admin/waitlist/${id}`), {
      method: "PATCH",
      headers: adminHeaders(token, true),
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadAdmin(token);
  };

  const filteredBakers = bakers.filter((baker) => {
    const query = searchQuery.toLowerCase();
    return (
      String(baker.id).includes(query) ||
      (baker.businessName || "").toLowerCase().includes(query) ||
      (baker.ownerName || "").toLowerCase().includes(query) ||
      (baker.email || "").toLowerCase().includes(query)
    );
  });

  if (!isAuthorized) {
    return (
      <AuthShell
        step="Platform admin"
        title="Sign in to manage bakeries"
        description="Same cream workspace as the baker dashboard. Plan, listing, and channel changes save to Postgres."
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block text-sm font-bold text-foreground">
            Email
            <input id="admin-email" type="email" required autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={`${inputClass} mt-2 bg-white`} />
          </label>
          <label className="block text-sm font-bold text-foreground">
            Password
            <div className="relative mt-2">
              <input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={`${inputClass} bg-white pr-12`} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-muted-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={loginLoading || loading} className={`${primaryBtn} w-full`}>
            {loginLoading || loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Signing in…</> : "Open admin"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src="/sweet-tooth-logo.png" alt="Sweet Tooth" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Platform admin</p>
              <h1 className="font-serif text-3xl font-bold text-foreground">Bakery control</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadAdmin(token)} className={ghostBtn} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload from database
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("admin_bearer_token");
                setIsAuthorized(false);
                setToken("");
                setBakers([]);
                setWaitlist([]);
                setAppReviews([]);
                setListsError(null);
              }}
              className={ghostBtn}
            >
              Sign out
            </button>
            <Link href="/" className={primaryBtn}>
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </div>
        </header>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        {listsError && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{listsError}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Bakeries", value: bakers.length, icon: Store },
            { label: "Waitlist", value: waitlist.length, icon: Phone },
            { label: "App reviews", value: appReviews.length, icon: Users },
            { label: "Live agents", value: bakers.filter((baker) => baker.agentActive).length, icon: Sparkles },
            { label: "Public menus", value: bakers.filter((baker) => baker.marketplaceVisible).length, icon: Users },
            { label: "Paid plans", value: bakers.filter((baker) => baker.subscriptionPlan !== "free").length, icon: CreditCard },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {stat.label}
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 font-serif text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleUpdateSettings} className={cardClass}>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl font-bold">App contact & plan payments</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Shown when a bakery subscribes. Only a WhatsApp number is published — bakers message you for how to pay. No JazzCash, Easypaisa, or bank account in the app.
            </p>
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium">
                Display name
                <input className={`${inputClass} mt-1`} placeholder="Sweet Tooth" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
              </label>
              <label className="block text-sm font-medium">
                WhatsApp for subscriptions
                <input className={`${inputClass} mt-1`} placeholder="0315-9127771" value={platformWhatsApp} onChange={(e) => setPlatformWhatsApp(e.target.value)} />
              </label>
              <p className="rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-muted-foreground">
                Bakers will see: WhatsApp {platformWhatsApp || "0315-9127771"} for payment details.
              </p>
              {settingsMessage && <p className="text-sm font-medium text-primary">{settingsMessage}</p>}
              <button type="submit" disabled={updatingSettings} className={primaryBtn}>{updatingSettings ? "Saving…" : "Save contact"}</button>
            </div>
          </form>

          <div className={cardClass}>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#c99855]" />
              <h2 className="font-serif text-xl font-bold">Demo data</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Creates Sana, Fatima, and Amna if they are missing, then adds sample menus, orders, and customers.</p>
            {enrichMessage && <p className="mt-3 text-sm font-medium text-primary">{enrichMessage}</p>}
            <button type="button" onClick={() => void handleEnrichDemo()} disabled={enriching} className={`${ghostBtn} mt-5`}>
              <Sparkles className="h-4 w-4" />
              {enriching ? "Updating…" : "Create / refresh demo bakeries"}
            </button>
          </div>
        </section>

        {bakers.some((baker) => baker.pendingPlanId) && (
          <section className={`${cardClass} mt-8`}>
            <h2 className="font-serif text-xl font-bold">Waiting for payment confirmation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These bakeries asked to upgrade. Activate after they WhatsApp you and you confirm payment. No merchant account needed.
            </p>
            <div className="mt-4 space-y-3">
              {bakers.filter((baker) => baker.pendingPlanId).map((baker) => (
                <div key={baker.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">{baker.businessName} <span className="font-mono text-xs text-muted-foreground">#{baker.id}</span></p>
                    <p className="text-sm text-muted-foreground">
                      Requested {baker.pendingPlanId}
                      {baker.billingRequestedAt ? ` · ${new Date(baker.billingRequestedAt).toLocaleString()}` : ""}
                    </p>
                    {baker.billingNote && <p className="text-sm">{baker.billingNote}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/bakers/${baker.id}`} className={ghostBtn}>Open bakery</Link>
                    <button
                      type="button"
                      disabled={activatingId === baker.id}
                      onClick={() => void activatePlan(baker.id, baker.pendingPlanId || "starter", "Confirmed off-platform payment")}
                      className={primaryBtn}
                    >
                      {activatingId === baker.id ? "Activating…" : `Activate ${baker.pendingPlanId}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`${cardClass} mt-8 overflow-hidden p-0`}>
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-xl font-bold">Bakeries</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#a99ca9]" />
              <input className={`${inputClass} pl-9`} placeholder="Search name, email, id" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Bakery</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Instagram</th>
                  <th className="px-4 py-3">Public menu</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Trial</th>
                  <th className="px-4 py-3">Monitor</th>
                </tr>
              </thead>
              <tbody>
                {filteredBakers.map((baker) => (
                  <tr key={baker.id} className="border-t border-border">
                    <td className="px-4 py-4">
                      <p className="font-bold">
                        {baker.businessName || "Unnamed"}{" "}
                        <span className="font-mono text-xs text-muted-foreground">#{baker.id}</span>
                        {baker.pendingPlanId && (
                          <span className="ml-2 rounded-full bg-[#f4bd62]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {baker.pendingPlanId} pending
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{baker.ownerName} · {baker.email}</p>
                      <p className="text-xs text-muted-foreground">{baker.city} · {baker.whatsappNumber}{baker.slug ? ` · /${baker.slug}` : ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        disabled={rowBusy === baker.id}
                        value={baker.subscriptionPlan}
                        onChange={(e) => void patchBaker(baker.id, { subscriptionPlan: e.target.value })}
                        className={inputClass}
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="bakery_plus">Bakery Plus</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <FlagButton
                        on={baker.agentActive}
                        disabled={rowBusy === baker.id}
                        onClick={() => void patchBaker(baker.id, { agentActive: !baker.agentActive })}
                        onLabel="On"
                        offLabel="Off"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <FlagButton
                        on={baker.whatsappAgentEnabled}
                        disabled={rowBusy === baker.id}
                        onClick={() => void patchBaker(baker.id, { whatsappAgentEnabled: !baker.whatsappAgentEnabled })}
                        onLabel="WA on"
                        offLabel="WA off"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <FlagButton
                        on={baker.instagramAgentEnabled}
                        disabled={rowBusy === baker.id}
                        onClick={() => void patchBaker(baker.id, { instagramAgentEnabled: !baker.instagramAgentEnabled })}
                        onLabel="IG on"
                        offLabel="IG off"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <FlagButton
                        on={baker.marketplaceVisible}
                        disabled={rowBusy === baker.id}
                        onClick={() => void patchBaker(baker.id, { marketplaceVisible: !baker.marketplaceVisible })}
                        onLabel="Link live"
                        offLabel="Link off"
                      />
                    </td>
                    <td className="px-4 py-4 font-semibold">{baker.totalOrders}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {baker.trialEndsAt ? new Date(baker.trialEndsAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/admin/bakers/${baker.id}`} className={`${ghostBtn} min-h-9 px-3 text-xs`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredBakers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No bakeries match this search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-8 overflow-hidden p-0`}>
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-xl font-bold">Baker waitlist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live signups from /waitlist. Contact them on WhatsApp, then mark contacted or approved. This list refreshes from the database.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">List</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry) => {
                  const whatsapp = waitlistWhatsAppHref(entry.whatsappNumber, entry.bakerName);
                  return (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-4 py-4 font-semibold">
                        {entry.bakerName}
                        {entry.city ? <p className="text-xs font-normal text-muted-foreground">{entry.city}</p> : null}
                        {entry.note ? <p className="mt-1 text-xs font-normal text-muted-foreground">{entry.note}</p> : null}
                        {entry.createdAt ? (
                          <p className="mt-1 text-xs font-normal text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <a className="block text-sm font-semibold text-primary hover:underline" href={`mailto:${entry.bakerEmail}`}>
                          {entry.bakerEmail}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.whatsappNumber}</p>
                        {whatsapp ? (
                          <a
                            className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-[#25D366] px-3 text-xs font-bold text-white hover:opacity-90"
                            href={whatsapp}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">{entry.source === "launch" ? "Launch" : "WhatsApp agent"}</td>
                      <td className="px-4 py-4">
                        <select value={entry.status} onChange={(e) => void handleUpdateWaitlistStatus(entry.id, e.target.value)} className={inputClass}>
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="approved">Approved</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {waitlist.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No live waitlist signups yet. New joins from the public waitlist appear here automatically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-8 overflow-hidden p-0`}>
          <div className="border-b border-border p-5">
            <h2 className="font-serif text-xl font-bold">App reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live submissions from /review — bakers, students, developers, and others. This list refreshes from the database.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Review</th>
                </tr>
              </thead>
              <tbody>
                {appReviews.map((entry) => (
                  <tr key={entry.id} className="border-t border-border align-top">
                    <td className="px-4 py-4 font-semibold">
                      {entry.reviewerName}
                      {entry.email ? <p className="text-xs font-normal text-muted-foreground">{entry.email}</p> : null}
                      <p className="text-xs font-normal text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      {APP_REVIEW_ROLES.find((role) => role.id === entry.role)?.label || entry.role}
                      {entry.roleNote ? <p className="text-xs text-muted-foreground">{entry.roleNote}</p> : null}
                      {entry.usedHow ? (
                        <p className="text-xs text-muted-foreground">
                          {APP_REVIEW_USED_HOW.find((item) => item.id === entry.usedHow)?.label || entry.usedHow}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 font-bold">{entry.rating}/5</td>
                    <td className="px-4 py-4 text-muted-foreground">{entry.reviewText}</td>
                  </tr>
                ))}
                {appReviews.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No live app reviews yet. Submissions from the public review page appear here automatically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} mt-8`}>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-bold">Channel credentials</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Saved encrypted on the baker&apos;s Meta connection row.</p>
          <form onSubmit={handleSetBakerMeta} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className={inputClass} required type="number" placeholder="Baker ID" value={metaBakerId} onChange={(e) => setMetaBakerId(e.target.value)} />
            <input className={inputClass} placeholder="WhatsApp phone number ID" value={metaPhoneNumberId} onChange={(e) => setMetaPhoneNumberId(e.target.value)} />
            <input className={inputClass} placeholder="WABA ID" value={metaWabaId} onChange={(e) => setMetaWabaId(e.target.value)} />
            <input className={`${inputClass} sm:col-span-2`} type="password" placeholder="WhatsApp access token" value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Meta app secret" value={metaAppSecret} onChange={(e) => setMetaAppSecret(e.target.value)} />
            <input className={inputClass} placeholder="Instagram page ID" value={metaIgPageId} onChange={(e) => setMetaIgPageId(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Instagram access token" value={metaIgToken} onChange={(e) => setMetaIgToken(e.target.value)} />
            {metaMessage && <p className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-primary">{metaMessage}</p>}
            <button type="submit" disabled={savingMeta} className={`${primaryBtn} sm:col-span-2 lg:col-span-3 w-fit`}>
              <Key className="h-4 w-4" />
              {savingMeta ? "Saving…" : "Save credentials"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
