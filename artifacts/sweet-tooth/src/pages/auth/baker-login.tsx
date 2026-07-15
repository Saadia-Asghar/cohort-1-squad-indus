import { Link, useLocation } from "wouter";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { loginBaker } from "@/lib/baker-session";

export default function BakerLogin() {
  const [, navigate] = useLocation();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEmail = method === "email";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(null);
    try { await loginBaker(identifier.trim(), password); navigate("/dashboard"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not sign you in."); }
    finally { setLoading(false); }
  };

  const chooseMethod = (next: "email" | "phone") => { setMethod(next); setIdentifier(""); setError(null); };
  return <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
    <div className="mx-auto mb-6 flex w-full max-w-md items-center justify-between">
      <Link href="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Sweet Tooth
      </Link>
      <span className="font-serif text-lg font-bold text-primary">Sweet Tooth</span>
    </div>
    <form onSubmit={submit} className="mx-auto w-full max-w-md p-8 border border-border rounded-2xl bg-card shadow-lg space-y-6">
      <div className="text-center"><h1 className="text-3xl font-serif font-bold text-primary">Baker Portal</h1><p className="text-muted-foreground mt-2">Sign in to your own kitchen dashboard.</p></div>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Sign-in method">
        <button type="button" onClick={() => chooseMethod("email")} className={`rounded-md px-3 py-2 text-sm font-semibold ${isEmail ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Email / Gmail</button>
        <button type="button" onClick={() => chooseMethod("phone")} className={`rounded-md px-3 py-2 text-sm font-semibold ${!isEmail ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>WhatsApp number</button>
      </div>
      <div className="space-y-4">
        <label className="block text-sm font-medium">{isEmail ? "Email address" : "WhatsApp number"}<input required type={isEmail ? "email" : "tel"} autoComplete={isEmail ? "email" : "tel"} inputMode={isEmail ? "email" : "tel"} placeholder={isEmail ? "you@gmail.com" : "0300 1234567 or +92 300 1234567"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1 w-full px-4 py-3 border border-border rounded-md bg-background" /></label>
        <label className="block text-sm font-medium">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-4 py-3 border border-border rounded-md bg-background" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold disabled:opacity-50">{loading ? "Signing in…" : "Sign in as baker"}</button>
      </div>
      <p className="text-sm text-center text-muted-foreground">New baker? <Link href="/dashboard/register" className="text-primary font-medium hover:underline">Create your bakery account</Link></p>
    </form>
  </div>;
}
