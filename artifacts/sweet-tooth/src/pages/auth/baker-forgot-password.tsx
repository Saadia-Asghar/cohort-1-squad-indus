import { useState } from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { customFetch } from "@workspace/api-client-react";

export default function BakerForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(true);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await customFetch<{ message?: string; resetUrl?: string; emailConfigured?: boolean }>("/api/bakers/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setResetUrl(typeof result.resetUrl === "string" ? result.resetUrl : "");
      setEmailConfigured(result.emailConfigured !== false);
      setSent(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "") : "Could not request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      description="We'll send you an email with a link to choose a new password."
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              {emailConfigured
                ? "If a Sweet Tooth account exists with that email address, you will receive a password reset link shortly."
                : "If you can still sign in, open Settings and change your password there. Email delivery is not enabled on this server yet, so a reset link cannot be sent."}
            </p>
            {resetUrl ? (
              <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  On this computer you can open the reset link now:
                </p>
                <a
                  href={resetUrl}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90"
                >
                  Choose a new password
                </a>
              </div>
            ) : null}
            <Link href="/dashboard/login" className={resetUrl
              ? "inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-white text-sm font-bold text-foreground hover:bg-muted/40"
              : "inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90"}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-bold text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-4 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="fatima@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="h-12 rounded-xl border-border bg-white pl-10 text-sm shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>

            <div className="text-center">
              <Link href="/dashboard/login" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
