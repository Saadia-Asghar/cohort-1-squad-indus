import { useState } from "react";
import { useAuth } from "@clerk/react";
import { customFetch } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useManagedBaker } from "@/lib/managed-auth";

export default function BakerOnboarding() {
  const { isSignedIn } = useAuth();
  const managed = useManagedBaker();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    city: "Lahore",
    whatsappNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    navigate("/dashboard/login");
    return null;
  }

  const update =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customFetch("/api/bakers/clerk/onboard", {
        method: "POST",
        responseType: "json",
        body: JSON.stringify(form),
      });
      await managed.refresh();
      navigate("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your bakery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <form
        onSubmit={submit}
        className="mx-auto w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-8"
      >
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Set up your bakery</h1>
          <p className="mt-2 text-muted-foreground">
            Your identity is verified. Add the business details used by your menu and agents.
          </p>
        </div>
        <div className="grid gap-4">
          <label className="text-sm font-medium">
            Bakery name
            <input required minLength={2} maxLength={120} value={form.businessName} onChange={update("businessName")} className="mt-1 w-full rounded-md border border-border bg-background px-4 py-3" />
          </label>
          <label className="text-sm font-medium">
            Owner name
            <input required minLength={2} maxLength={120} value={form.ownerName} onChange={update("ownerName")} className="mt-1 w-full rounded-md border border-border bg-background px-4 py-3" />
          </label>
          <label className="text-sm font-medium">
            City
            <input required minLength={2} maxLength={80} value={form.city} onChange={update("city")} className="mt-1 w-full rounded-md border border-border bg-background px-4 py-3" />
          </label>
          <label className="text-sm font-medium">
            WhatsApp business number
            <input required type="tel" inputMode="tel" placeholder="+92 300 1234567" value={form.whatsappNumber} onChange={update("whatsappNumber")} className="mt-1 w-full rounded-md border border-border bg-background px-4 py-3" />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={loading} className="w-full rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">
          {loading ? "Creating bakery…" : "Continue to dashboard"}
        </button>
      </form>
    </main>
  );
}
