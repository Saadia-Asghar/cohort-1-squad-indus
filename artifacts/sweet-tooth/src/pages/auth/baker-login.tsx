import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getGoogleRedirectUser, isFirebaseConfigured, onGoogleAuthUser, rememberGoogleUser, signInWithGoogle } from "@/lib/firebase-auth";

export default function BakerLogin() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let completed = false;
    const completeLogin = (user: Awaited<ReturnType<typeof getGoogleRedirectUser>>) => {
      if (!active || !user || completed) return;
      completed = true;
      rememberGoogleUser(user, "baker");
      navigate("/dashboard");
    };
    getGoogleRedirectUser()
      .then(completeLogin)
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "Google sign-in could not be completed."));
    const unsubscribe = onGoogleAuthUser(completeLogin);
    return () => { active = false; unsubscribe(); };
  }, [navigate]);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-2xl bg-card shadow-lg text-center space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Baker Portal</h1>
          <p className="text-muted-foreground">Manage your kitchen on Sweet Tooth.</p>
        </div>
        
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Number</label>
            <input type="text" placeholder="+92 300 0000000" className="w-full px-4 py-3 border border-border rounded-md bg-background" />
          </div>
          <button className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold hover:bg-primary/90 transition-colors">
            Access Dashboard
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <button onClick={loginWithGoogle} disabled={loading || !isFirebaseConfigured()} className="w-full border border-border py-3 rounded-md font-bold hover:bg-muted transition-colors disabled:opacity-50">
            {loading ? "Connecting Google..." : "Continue with Google"}
          </button>
          {!isFirebaseConfigured() && <p className="text-xs text-muted-foreground">Google sign-in will become available after Firebase is configured.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Looking for sweets? <Link href="/login" className="text-primary hover:underline">Go to Marketplace</Link>
        </p>
      </div>
    </div>
  );
}
