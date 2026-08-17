import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ShieldAlert,
  Database,
  Sparkles,
  RefreshCw,
  CreditCard,
  Users,
  CheckCircle2,
  Settings,
  ArrowLeft,
  Search,
  Eye,
  Key,
  Phone,
  Instagram,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

type BakerAdmin = {
  id: number;
  businessName: string | null;
  ownerName: string | null;
  email: string;
  whatsappNumber: string | null;
  city: string | null;
  subscriptionPlan: string;
  agentActive: boolean;
  trialEndsAt: string | null;
  createdAt: string;
};

export default function AdminPortal() {
  const [token, setToken] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [bakers, setBakers] = useState<BakerAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Form states
  const [activateBakerId, setActivateBakerId] = useState("");
  const [activatePlanId, setActivatePlanId] = useState("starter");
  const [activateMessage, setActivateMessage] = useState("");
  const [activating, setActivating] = useState(false);

  const [platformWhatsApp, setPlatformWhatsApp] = useState("");
  const [platformPayment, setPlatformPayment] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [waitlist, setWaitlist] = useState<any[]>([]);

  // Meta credentials (WhatsApp / Instagram direct setup)
  const [metaBakerId, setMetaBakerId] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaIgPageId, setMetaIgPageId] = useState("");
  const [metaIgToken, setMetaIgToken] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaMessage, setMetaMessage] = useState("");

  // Auto-login from saved session
  useEffect(() => {
    const saved = localStorage.getItem("admin_bearer_token");
    if (saved) {
      setToken(saved);
      verifyToken(saved);
    }
  }, []);

  const verifyToken = async (bearerToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bakers", {
        headers: {
          Authorization: `Bearer ${bearerToken.trim()}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBakers(data);
        setIsAuthorized(true);
        localStorage.setItem("admin_bearer_token", bearerToken);

        // Fetch waitlist entries
        try {
          const waitlistRes = await fetch("/api/admin/waitlist", {
            headers: {
              Authorization: `Bearer ${bearerToken.trim()}`,
            },
          });
          if (waitlistRes.ok) {
            const waitlistData = await waitlistRes.json();
            setWaitlist(waitlistData);
          }
        } catch (wErr) {
          console.error("Failed to load waitlist", wErr);
        }
      } else {
        setError("Invalid authorization token.");
        setIsAuthorized(false);
      }
    } catch (err) {
      setError("Failed to connect to admin server.");
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWaitlistStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/waitlist/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        verifyToken(token);
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      alert("Network error.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        verifyToken(data.token);
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetAuth = () => {
    localStorage.removeItem("admin_bearer_token");
    setToken("");
    setLoginEmail("");
    setLoginPassword("");
    setIsAuthorized(false);
    setBakers([]);
    setError(null);
  };

  const handleActivatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivating(true);
    setActivateMessage("");
    try {
      const res = await fetch("/api/admin/activate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          bakerId: parseInt(activateBakerId, 10),
          planId: activatePlanId,
          clearTrial: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActivateMessage(`Successfully activated ${activatePlanId} for baker #${activateBakerId}!`);
        // Refresh baker list
        verifyToken(token);
      } else {
        setActivateMessage(`Error: ${data.error || "Activation failed"}`);
      }
    } catch (err) {
      setActivateMessage("Network error during activation.");
    } finally {
      setActivating(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);
    setSettingsMessage("");
    try {
      const res = await fetch("/api/admin/platform-billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          whatsapp: platformWhatsApp || undefined,
          paymentDetails: platformPayment || undefined,
          ownerName: platformName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsMessage("Platform settings updated successfully!");
      } else {
        setSettingsMessage(`Error: ${data.error || "Update failed"}`);
      }
    } catch (err) {
      setSettingsMessage("Network error during settings update.");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleEnrichDemo = async () => {
    if (!window.confirm("Are you sure you want to load mock data for all bakers? This adds dummy orders and customers.")) return;
    setEnriching(true);
    setEnrichMessage("");
    try {
      const res = await fetch("/api/admin/enrich-demo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setEnrichMessage("Demo data enrichment triggered successfully!");
      } else {
        setEnrichMessage(`Error: ${data.error || "Enrich failed"}`);
      }
    } catch (err) {
      setEnrichMessage("Network error during demo enrichment.");
    } finally {
      setEnriching(false);
    }
  };

  const handleSetBakerMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaBakerId) { setMetaMessage("Baker ID is required."); return; }
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

      const res = await fetch("/api/admin/set-baker-meta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMetaMessage(`✅ ${data.message}`);
        setMetaAccessToken(""); // clear token from UI after save
        setMetaIgToken("");
        setMetaAppSecret("");
      } else {
        setMetaMessage(`❌ ${data.error || "Failed to save credentials"}`);
      }
    } catch {
      setMetaMessage("❌ Network error.");
    } finally {
      setSavingMeta(false);
    }
  };

  const filteredBakers = bakers.filter((b) => {
    const query = searchQuery.toLowerCase();
    return (
      String(b.id).includes(query) ||
      (b.businessName || "").toLowerCase().includes(query) ||
      (b.ownerName || "").toLowerCase().includes(query) ||
      (b.email || "").toLowerCase().includes(query)
    );
  });

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1e1420] text-white px-4" style={{ backgroundImage: "radial-gradient(ellipse at 60% 0%, #4a1060 0%, #1e1420 60%)" }}>
        <div className="w-full max-w-md">
          {/* Logo / Brand */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c24f7a] to-[#632a73] shadow-lg shadow-[#c24f7a]/30">
              <ShieldAlert className="h-10 w-10 text-white" />
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">Sweet Tooth Admin</h1>
            <p className="mt-2 text-sm text-purple-200/60">Platform Management Portal</p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-[#443149] bg-[#2a1d2e]/80 p-8 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold tracking-tight">Sign in to Admin</h2>
            <p className="mt-1 text-xs text-purple-200/50">Enter your admin credentials to continue</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">Email address</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@sweettooth.pk"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-[#443149] bg-[#1e1420] px-4 text-sm text-white placeholder-purple-200/30 outline-none transition focus:border-[#c24f7a] focus:ring-2 focus:ring-[#c24f7a]/20"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full min-h-12 rounded-xl border border-[#443149] bg-[#1e1420] px-4 pr-12 text-sm text-white placeholder-purple-200/30 outline-none transition focus:border-[#c24f7a] focus:ring-2 focus:ring-[#c24f7a]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-3.5 text-purple-200/40 hover:text-purple-200/80 transition"
                    tabIndex={-1}
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                  <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs font-medium text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || loading}
                className="w-full min-h-12 rounded-xl bg-gradient-to-r from-[#c24f7a] to-[#a0336a] font-semibold text-white shadow-lg shadow-[#c24f7a]/20 transition hover:shadow-[#c24f7a]/40 hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading || loading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  <>Sign in to Admin Panel</>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-purple-200/40 hover:text-purple-200/80 transition">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Baker Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#130b14] text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[#2e1d32] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#c24f7a]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#c24f7a]">Platform Admin</p>
            </div>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">Super Control Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAuth}
              className="min-h-10 rounded-lg border border-[#443149] px-4 text-xs font-semibold hover:bg-[#201423]"
            >
              Logout Admin
            </button>
            <Link
              to="/dashboard"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#632a73] px-4 text-xs font-semibold hover:bg-[#542261]"
            >
              <ArrowLeft className="h-4 w-4" /> Go to Dashboard
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-200/60">Total Bakers</span>
              <Users className="h-4 w-4 text-[#c24f7a]" />
            </div>
            <p className="mt-2 text-3xl font-bold">{bakers.length}</p>
          </div>

          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-200/60">Active AI Agents</span>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <p className="mt-2 text-3xl font-bold">{bakers.filter((b) => b.agentActive).length}</p>
          </div>

          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-200/60">Paid Subscribers</span>
              <CreditCard className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="mt-2 text-3xl font-bold">
              {bakers.filter((b) => b.subscriptionPlan !== "free").length}
            </p>
          </div>

          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-200/60">Trial Accounts</span>
              <RefreshCw className="h-4 w-4 text-blue-400" />
            </div>
            <p className="mt-2 text-3xl font-bold">
              {bakers.filter((b) => b.subscriptionPlan === "free" && b.trialEndsAt).length}
            </p>
          </div>
        </div>

        {/* Admin Actions Panel */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Plan Activation */}
          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-6 shadow-md">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#c24f7a]" />
              <h2 className="text-base font-semibold">Activate Plan Subscriptions</h2>
            </div>
            <p className="mt-1.5 text-xs text-purple-200/60">
              Manually upgrade or downgrade baker plan following receipt clearance.
            </p>

            <form onSubmit={handleActivatePlan} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200/80">Baker ID</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  required
                  value={activateBakerId}
                  onChange={(e) => setActivateBakerId(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200/80">Select Plan Tier</label>
                <select
                  value={activatePlanId}
                  onChange={(e) => setActivatePlanId(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
                >
                  <option value="starter">Kitchen Standard (Starter)</option>
                  <option value="pro">Kitchen Pro (Pro)</option>
                  <option value="bakery_plus">Bakery Team (Bakery Plus)</option>
                </select>
              </div>

              {activateMessage && <p className="text-xs font-medium text-yellow-300">{activateMessage}</p>}

              <button
                type="submit"
                disabled={activating}
                className="w-full min-h-10 rounded-lg bg-[#c24f7a] text-xs font-bold text-white transition hover:bg-[#b0406b] disabled:opacity-50"
              >
                {activating ? "Processing..." : "Activate Plan"}
              </button>
            </form>
          </div>

          {/* Platform Settings */}
          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-6 shadow-md">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-semibold">Platform Billing Settings</h2>
            </div>
            <p className="mt-1.5 text-xs text-purple-200/60">
              Configure system-wide payment info displayed to bakers requesting upgrades.
            </p>

            <form onSubmit={handleUpdateSettings} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200/80">Support WhatsApp</label>
                <input
                  type="text"
                  placeholder="e.g. 923001234567"
                  value={platformWhatsApp}
                  onChange={(e) => setPlatformWhatsApp(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-purple-200/80">Payment Instructions</label>
                <textarea
                  placeholder="Bank name, account details..."
                  rows={2}
                  value={platformPayment}
                  onChange={(e) => setPlatformPayment(e.target.value)}
                  className="w-full rounded-lg border border-[#3c2542] bg-[#130b14] p-3 text-sm text-white outline-none focus:border-[#c24f7a] resize-none"
                />
              </div>

              {settingsMessage && <p className="text-xs font-medium text-yellow-300">{settingsMessage}</p>}

              <button
                type="submit"
                disabled={updatingSettings}
                className="w-full min-h-10 rounded-lg bg-[#632a73] text-xs font-bold text-white transition hover:bg-[#542261] disabled:opacity-50"
              >
                {updatingSettings ? "Saving..." : "Update Details"}
              </button>
            </form>
          </div>

          {/* Seed Enrichment */}
          <div className="rounded-xl border border-[#2e1d32] bg-[#1e1420] p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-yellow-400" />
                <h2 className="text-base font-semibold">Demo Data Generator</h2>
              </div>
              <p className="mt-1.5 text-xs text-purple-200/60">
                Populates mock order histories, CRM contacts, and customer survey reviews for active bakers to enrich dashboard visualizations.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {enrichMessage && <p className="text-xs font-medium text-yellow-300">{enrichMessage}</p>}
              <button
                onClick={handleEnrichDemo}
                disabled={enriching}
                className="w-full min-h-12 rounded-lg bg-[#a67c1e] text-xs font-bold text-white transition hover:bg-[#926b17] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {enriching ? "Generating mock records..." : "Generate Demo Orders & CRM Data"}
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp / Instagram Direct Credentials */}
        <div className="mt-8 rounded-xl border border-[#2e1d32] bg-[#1e1420] p-6 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="h-5 w-5 text-green-400" />
            <h2 className="text-base font-semibold">WhatsApp / Instagram Direct Setup</h2>
          </div>
          <p className="text-xs text-purple-200/60 mb-5">
            Connect any baker's WhatsApp Business number directly — no Meta business portfolio verification required.
            Credentials are encrypted at rest using AES-256-GCM.
          </p>

          <form onSubmit={handleSetBakerMeta} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Baker ID */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">Baker ID *</label>
              <input
                type="number"
                required
                placeholder="e.g. 3"
                value={metaBakerId}
                onChange={(e) => setMetaBakerId(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
              />
              <p className="text-[10px] text-purple-200/40">Find Baker ID in the registry table below</p>
            </div>

            {/* WhatsApp Phone Number ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">Phone Number ID</label>
              <input
                type="text"
                placeholder="e.g. 123456789012345"
                value={metaPhoneNumberId}
                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
              />
              <p className="text-[10px] text-purple-200/40">Meta → WA Manager → Phone Numbers → ID</p>
            </div>

            {/* WABA ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">WABA ID</label>
              <input
                type="text"
                placeholder="WhatsApp Business Account ID"
                value={metaWabaId}
                onChange={(e) => setMetaWabaId(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
              />
            </div>

            {/* Access Token */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">WA Access Token</label>
              <input
                type="password"
                placeholder="EAA... (encrypted before storing)"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a] font-mono"
              />
              <p className="text-[10px] text-purple-200/40">Meta Developers → App → Generate Token (System User or Permanent Token)</p>
            </div>

            {/* Meta App Secret */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider">Meta App Secret <span className="normal-case font-normal">(optional)</span></label>
              <input
                type="password"
                placeholder="App Secret for webhook verification"
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a] font-mono"
              />
            </div>

            {/* Instagram */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram Page ID</label>
              <input
                type="text"
                placeholder="e.g. 987654321"
                value={metaIgPageId}
                onChange={(e) => setMetaIgPageId(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-purple-200/70 uppercase tracking-wider flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> Instagram Access Token</label>
              <input
                type="password"
                placeholder="EAA... (encrypted before storing)"
                value={metaIgToken}
                onChange={(e) => setMetaIgToken(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] px-3 text-sm text-white outline-none focus:border-[#c24f7a] font-mono"
              />
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 lg:col-span-3">
              {metaMessage && (
                <p className={`mb-3 text-xs font-medium ${metaMessage.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{metaMessage}</p>
              )}
              <button
                type="submit"
                disabled={savingMeta}
                className="min-h-10 rounded-lg bg-green-700 px-6 text-xs font-bold text-white transition hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
              >
                <Key className="h-4 w-4" />
                {savingMeta ? "Encrypting & Saving..." : "Save Meta Credentials"}
              </button>
            </div>
          </form>
        </div>

        {/* Bakers Directory Table */}
        <div className="mt-8 rounded-xl border border-[#2e1d32] bg-[#1e1420] overflow-hidden shadow-lg">
          <div className="flex flex-col gap-4 border-b border-[#2e1d32] p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold font-serif">Registered Bakery Nodes</h2>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-purple-200/40" />
              <input
                type="text"
                placeholder="Search bakers by ID, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-[#3c2542] bg-[#130b14] pl-9 pr-4 text-xs text-white outline-none focus:border-[#c24f7a]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#2e1d32] bg-[#170e19] text-purple-200/60 uppercase font-semibold tracking-wider">
                  <th className="p-4">ID</th>
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4">City</th>
                  <th className="p-4">Plan Tier</th>
                  <th className="p-4">AI Chat Agent</th>
                  <th className="p-4 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e1d32]">
                {filteredBakers.map((b) => (
                  <tr key={b.id} className="hover:bg-[#251928] transition-colors">
                    <td className="p-4 font-mono font-bold text-purple-300">#{b.id}</td>
                    <td className="p-4 font-semibold text-white">{b.businessName || "Unnamed"}</td>
                    <td className="p-4 text-purple-200/80">{b.ownerName || "N/A"}</td>
                    <td className="p-4 text-purple-200/80">{b.email}</td>
                    <td className="p-4 text-purple-200/80">{b.whatsappNumber || "N/A"}</td>
                    <td className="p-4 text-purple-200/80">{b.city || "N/A"}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          b.subscriptionPlan === "pro"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : b.subscriptionPlan === "bakery_plus"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : b.subscriptionPlan === "starter"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-muted/10 text-muted-foreground border border-muted/20"
                        }`}
                      >
                        {b.subscriptionPlan?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          b.agentActive ? "text-green-400" : "text-purple-200/40"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${b.agentActive ? "bg-green-400" : "bg-purple-200/30"}`} />
                        {b.agentActive ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="p-4 text-right text-purple-200/60">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredBakers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-purple-200/40">
                      No matching baker registries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WhatsApp Agent Waitlist Table */}
        <div className="mt-8 rounded-xl border border-[#2e1d32] bg-[#1e1420] overflow-hidden shadow-lg">
          <div className="flex flex-col gap-4 border-b border-[#2e1d32] p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold font-serif">WhatsApp Agent Early Access Waitlist</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#2e1d32] bg-[#170e19] text-purple-200/60 uppercase font-semibold tracking-wider">
                  <th className="p-4">ID</th>
                  <th className="p-4">Baker ID</th>
                  <th className="p-4">Baker / Business Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">WhatsApp Number</th>
                  <th className="p-4">Note</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Joined</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e1d32]">
                {waitlist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#251928] transition-colors">
                    <td className="p-4 font-mono font-bold text-purple-300">#{entry.id}</td>
                    <td className="p-4 font-mono text-purple-200/80">{entry.bakerId ? `#${entry.bakerId}` : "Guest"}</td>
                    <td className="p-4 font-semibold text-white">{entry.bakerName}</td>
                    <td className="p-4 text-purple-200/80">{entry.bakerEmail}</td>
                    <td className="p-4 text-purple-200/80">{entry.whatsappNumber}</td>
                    <td className="p-4 text-purple-200/60 max-w-xs truncate" title={entry.note}>{entry.note || "N/A"}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          entry.status === "approved"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : entry.status === "contacted"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        }`}
                      >
                        {entry.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-purple-200/60">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <select
                        value={entry.status}
                        onChange={(e) => handleUpdateWaitlistStatus(entry.id, e.target.value)}
                        className="rounded border border-[#443149] bg-[#130b14] px-2 py-1 text-xs text-white outline-none focus:border-[#c24f7a]"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="approved">Approved</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {waitlist.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-purple-200/40">
                      No waitlist registrations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
