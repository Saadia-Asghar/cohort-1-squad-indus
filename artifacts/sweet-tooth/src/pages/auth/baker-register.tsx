import { Link, useLocation } from "wouter";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { registerBaker } from "@/lib/baker-session";

export default function BakerRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ businessName: "", ownerName: "", city: "Lahore", whatsappNumber: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try { await registerBaker(form); navigate("/dashboard"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not create your bakery account."); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen bg-background px-4 py-8 sm:py-12"><div className="mx-auto mb-6 flex w-full max-w-md items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to Sweet Tooth</Link><span className="font-serif text-lg font-bold text-primary">Sweet Tooth</span></div><form onSubmit={submit} className="mx-auto w-full max-w-md p-8 border border-border rounded-2xl bg-card shadow-lg space-y-5">
    <div className="text-center"><h1 className="text-3xl font-serif font-bold text-primary">Create your bakery</h1><p className="text-muted-foreground mt-2">This creates a private dashboard for your kitchen.</p></div>
    <div className="grid gap-3"><input required placeholder="Bakery name" value={form.businessName} onChange={update("businessName")} className="px-4 py-3 border border-border rounded-md bg-background" /><input required placeholder="Your name" value={form.ownerName} onChange={update("ownerName")} className="px-4 py-3 border border-border rounded-md bg-background" /><input required placeholder="City" value={form.city} onChange={update("city")} className="px-4 py-3 border border-border rounded-md bg-background" /><input required type="tel" inputMode="tel" placeholder="WhatsApp: 0300 1234567 or +92 300 1234567" value={form.whatsappNumber} onChange={update("whatsappNumber")} className="px-4 py-3 border border-border rounded-md bg-background" /><input required type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={update("email")} className="px-4 py-3 border border-border rounded-md bg-background" /><input required minLength={6} type="password" placeholder="Password (6+ characters)" autoComplete="new-password" value={form.password} onChange={update("password")} className="px-4 py-3 border border-border rounded-md bg-background" /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold disabled:opacity-50">{loading ? "Creating…" : "Create bakery dashboard"}</button><p className="text-center text-sm text-muted-foreground">Already registered? <Link href="/dashboard/login" className="text-primary hover:underline">Sign in</Link></p>
  </form></div>;
}
