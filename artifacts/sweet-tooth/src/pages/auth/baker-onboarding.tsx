import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { AuthShell } from "@/components/auth/auth-shell";
import { useManagedBaker } from "@/lib/managed-auth";
import { useAppAuth } from "@/lib/app-auth";
import { markBakeryQuestForNewSignup } from "@/lib/bakery-quest";

const inputClass = "mt-2 h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export default function BakerOnboarding() {
  const { isSignedIn, getToken } = useAppAuth();
  const managed = useManagedBaker();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ businessName: "", ownerName: "", city: "Lahore", whatsappNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    navigate("/dashboard/login");
    return null;
  }

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const idToken = await getToken();
      if (!idToken) throw new Error("Your Google sign-in expired. Please sign in again.");
      const response = await customFetch<{ token: string; baker: { id: number } }>("/api/bakers/firebase/onboard", {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, idToken }),
      });
      managed.loginNatively(response.token, response.baker.id);
      markBakeryQuestForNewSignup();
      navigate("/dashboard/welcome-features");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your bakery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell step="Step 1 of 2" title="Tell us about your bakery" description="Start with the basics. After this, Sweet Tooth will guide you through the exact setup needed before you share your bakery with customers.">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-foreground sm:col-span-2">Bakery name<input required minLength={2} maxLength={120} value={form.businessName} onChange={update("businessName")} autoComplete="organization" className={inputClass} /></label>
          <label className="text-sm font-bold text-foreground">Owner name<input required minLength={2} maxLength={120} value={form.ownerName} onChange={update("ownerName")} autoComplete="name" className={inputClass} /></label>
          <label className="text-sm font-bold text-foreground">City<input required minLength={2} maxLength={80} value={form.city} onChange={update("city")} autoComplete="address-level2" className={inputClass} /></label>
          <label className="text-sm font-bold text-foreground sm:col-span-2">WhatsApp number<input required type="tel" inputMode="tel" placeholder="+92 300 1234567" value={form.whatsappNumber} onChange={update("whatsappNumber")} autoComplete="tel" className={inputClass} /></label>
        </div>
        {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">{error}</p>}
        <button disabled={loading} className="h-12 w-full rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90 disabled:opacity-50">{loading ? "Creating bakery…" : "Continue to setup guide"}</button>
      </form>
    </AuthShell>
  );
}
