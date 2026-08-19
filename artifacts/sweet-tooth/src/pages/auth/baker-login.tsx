import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, Lock, Mail, Phone, Store, UserCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthShell } from "@/components/auth/auth-shell";
import { isFirebaseConfigured, useAppAuth } from "@/lib/app-auth";
import { getPlanById } from "@/lib/pricing-plans";
import { useManagedBaker } from "@/lib/managed-auth";
import { captureProductEvent, identifyBakerForAnalytics } from "@/lib/product-analytics";
import { customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { markBakeryQuestForNewSignup } from "@/lib/bakery-quest";

function AuthField({
  id,
  label,
  labelRight,
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string; labelRight?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="mb-2 block text-sm font-bold text-foreground">{label}</label>
        {labelRight && <div className="mb-2">{labelRight}</div>}
      </div>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-4 h-4 w-4 text-muted-foreground" />}
        <Input
          id={id}
          {...props}
          className={`h-12 rounded-xl border-border bg-white text-sm shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 ${Icon ? "pl-10" : ""}`}
        />
      </div>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function GoogleDivider() {
  return (
    <div className="relative pt-3 text-center">
      <span className="absolute inset-x-0 top-6 border-t border-border" />
      <span className="relative bg-background px-3 text-xs font-semibold text-muted-foreground">or</span>
    </div>
  );
}

export default function BakerLogin({ initialTab = "login" }: { initialTab?: "login" | "register" }) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [, setLocation] = useLocation();
  const selectedPlanId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("plan") : null;
  const selectedPlan = getPlanById(selectedPlanId);
  const { loginNatively } = useManagedBaker();
  const { signInWithGoogle } = useAppAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("Karachi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finishAuth = (
    token: string,
    bakerId: number,
    method: "password" | "google",
    role: "owner" | "staff" = "owner",
    destination = "/dashboard",
  ) => {
    queryClient.clear();
    loginNatively(token, bakerId, role);
    identifyBakerForAnalytics(bakerId);
    captureProductEvent("baker_login_completed", { method });
    setLocation(destination);
  };

  const continueWithGoogle = async (onboarding: boolean) => {
    setLoading(true);
    setError("");
    try {
      const idToken = await signInWithGoogle();
      const response = await customFetch<{ needsOnboarding: boolean; token?: string; baker?: { id: number } }>("/api/bakers/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (response.needsOnboarding) {
        setLocation("/dashboard/onboarding");
        return;
      }
      if (!response.token || !response.baker?.id) throw new Error("Could not open your bakery dashboard.");
      finishAuth(response.token, response.baker.id, "google");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "") : "Google sign-in could not be completed.");
      if (onboarding) setActiveTab("register");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await customFetch<{
        token: string;
        baker?: { id: number };
        role?: "owner" | "staff" | "admin";
        admin?: boolean;
      }>("/api/bakers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim(), password }),
      });
      if (response.admin || response.role === "admin") {
        localStorage.setItem("admin_bearer_token", response.token);
        setLocation("/admin");
        return;
      }
      if (!response.baker?.id) throw new Error("Could not open your bakery dashboard.");
      const role = response.role === "staff" ? "staff" : "owner";
      finishAuth(response.token, response.baker.id, "password", role, role === "staff" ? "/dashboard/human-inbox" : "/dashboard");
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "") : "Invalid email/number or password";
      setError(message || "Invalid email/number or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    captureProductEvent("baker_registration_submitted");
    try {
      const slug = businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "bakery";
      const response = await customFetch<{ token: string; baker: { id: number } }>("/api/bakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          city: city.trim() || "Karachi",
          whatsappNumber: whatsappNumber.trim(),
          slug,
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      identifyBakerForAnalytics(response.baker.id);
      captureProductEvent("baker_registration_completed");
      markBakeryQuestForNewSignup();
      finishAuth(response.token, response.baker.id, "password", "owner", "/dashboard/welcome-features");
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "") : "Could not create your bakery account";
      setError(message || "Could not create your bakery account");
    } finally {
      setLoading(false);
    }
  };

  const isRegistering = activeTab === "register";

  return (
    <AuthShell
      title={isRegistering ? "Create your free bakery workspace" : "Welcome back"}
      description={isRegistering ? "A free account includes the dashboard and the menu agent from day one. You can also join the waitlist if you would rather we onboard you." : "Sign in to continue managing your bakery conversations, orders and production. You can also create a free account with the menu agent."}
    >
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as "login" | "register"); setError(""); }} className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-[#ece6dc] p-1">
          <TabsTrigger value="login" className="h-10 rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Sign in</TabsTrigger>
          <TabsTrigger value="register" className="h-10 rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-7 space-y-5 focus-visible:outline-none">
          <AuthError message={error} />
          <form onSubmit={handleLogin} className="space-y-5">
            <AuthField id="login-identifier" label="Email or WhatsApp number" icon={Mail} type="text" placeholder="baker@example.com or +92 300 1234567" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
            <AuthField id="login-password" label="Password" labelRight={<Link href="/dashboard/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>} icon={Lock} type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            <div className="rounded-xl border border-border bg-[#f7f1e8] px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/70">Demo bakeries</p>
              <div className="mt-2 grid gap-2">
                {[
                  { email: "sana@studio.com", password: "SanaSweet2026!", label: "Sana · Bakery Plus" },
                  { email: "fatima@cakery.com", password: "FatimaCake2026!", label: "Fatima · Kitchen Standard" },
                  { email: "amna@bakes.com", password: "AmnaBakes2026!", label: "Amna · Launch Free" },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword(demo.password);
                      setError("");
                    }}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <span>{demo.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90" disabled={loading}>
              {loading ? "Signing in…" : "Sign in to dashboard"}
            </Button>
          </form>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            No account yet? You can{" "}
            <button
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); }}
              className="font-semibold text-primary hover:underline"
            >
              create a free account
            </button>
            {" "}— the menu agent is included from day one. Prefer we set it up with you?{" "}
            <Link href="/waitlist" className="font-semibold text-primary hover:underline">Join the waitlist</Link>.
          </div>
          {isFirebaseConfigured() && (
            <div>
              <GoogleDivider />
              <button type="button" onClick={() => void continueWithGoogle(false)} disabled={loading} className="mt-4 h-12 w-full rounded-xl border border-border bg-white px-4 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50">Continue with Google</button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="register" className="mt-7 space-y-5 focus-visible:outline-none">
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            Create a free bakery workspace. The menu assistant is on from day one. WhatsApp and Instagram agents can be added later.{" "}
            Prefer we WhatsApp you and onboard you?{" "}
            <Link href="/waitlist" className="font-semibold text-primary hover:underline">Join the waitlist</Link>
            {" · "}
            <Link href="/review" className="font-semibold text-primary hover:underline">Review the app</Link>
          </div>
          {selectedPlan && selectedPlan.id !== "free" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              You selected <strong className="text-primary">{selectedPlan.name}</strong>. Start free and upgrade after your first orders. See the <a href="/#pricing" className="font-semibold text-primary hover:underline">pricing details</a>.
            </div>
          )}
          <AuthError message={error} />
          <form onSubmit={handleRegister} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><AuthField id="bakery-name" label="Bakery name" icon={Store} type="text" placeholder="Meethi Khushiyan Bakery" value={businessName} onChange={(event) => setBusinessName(event.target.value)} autoComplete="organization" required /></div>
            <AuthField id="owner-name" label="Owner name" icon={UserCheck} type="text" placeholder="Fatima Ali" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} autoComplete="name" required />
            <AuthField id="bakery-city" label="City" type="text" placeholder="Karachi" value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" required />
            <AuthField id="register-email" label="Email address" icon={Mail} type="email" placeholder="fatima@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            <AuthField id="whatsapp-number" label="WhatsApp number" icon={Phone} type="tel" placeholder="+92 300 1234567" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} autoComplete="tel" required />
            <div className="sm:col-span-2"><AuthField id="register-password" label="Password" icon={Lock} type="password" placeholder="At least 12 characters" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required /></div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90 sm:col-span-2" disabled={loading}>
              {loading ? "Creating workspace…" : "Create free account"}
            </Button>
          </form>
          {isFirebaseConfigured() && (
            <div>
              <GoogleDivider />
              <button type="button" onClick={() => void continueWithGoogle(true)} disabled={loading} className="mt-4 h-12 w-full rounded-xl border border-border bg-white px-4 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50">Create account with Google</button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
}
