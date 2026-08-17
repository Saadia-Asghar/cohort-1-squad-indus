import { useState } from "react";
import { Link } from "wouter";
import { AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { customFetch } from "@workspace/api-client-react";

export default function BakerResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const token = searchParams.get("token");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await customFetch("/api/bakers/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      setSuccess(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "") : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      description="Choose a secure new password for your Sweet Tooth account."
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-destructive">
              This password reset link is invalid because it is missing a recovery token. Please request a new one.
            </p>
            <Link href="/dashboard/forgot-password" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90">
              Request new link
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-600">
              Your password has been successfully reset! You can now sign in with your new password.
            </p>
            <Link href="/dashboard/login" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-password" className="mb-2 block text-sm font-bold text-[#382b43]">New password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-4 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  className="h-12 rounded-xl border-[#ded6ca] bg-white pl-10 text-sm shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-[#382b43]">Confirm new password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-4 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  className="h-12 rounded-xl border-[#ded6ca] bg-white pl-10 text-sm shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary/90" disabled={loading}>
              {loading ? "Resetting password..." : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
