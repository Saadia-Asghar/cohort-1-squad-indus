import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/react";
import {
  customFetch,
  setAuthTokenGetter,
} from "@workspace/api-client-react";

type ClerkBakerSession = {
  needsOnboarding: boolean;
  email?: string;
  baker?: { id: number };
};

type ManagedBakerContextValue = {
  bakerId: number;
  isLoaded: boolean;
  hasNativeSession: boolean;
  needsOnboarding: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loginNatively: (token: string, bakerId: number) => void;
  logoutNatively: () => void;
};

const ManagedBakerContext = createContext<ManagedBakerContextValue | null>(null);

export function ManagedAuthProvider({ children }: { children: ReactNode }) {
  const { getToken: getClerkToken, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useAuth();
  
  const [nativeToken, setNativeToken] = useState<string | null>(() => 
    typeof window !== "undefined" ? localStorage.getItem("baker_token") : null
  );
  const [nativeBakerId, setNativeBakerId] = useState<number>(() => 
    typeof window !== "undefined" ? Number(localStorage.getItem("bakerId") || 0) : 0
  );

  const [session, setSession] = useState<ClerkBakerSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Never await Clerk getToken while Clerk is broken/unloaded — it hangs forever
    // on production domains with a pk_test key, which blocked native login entirely.
    setAuthTokenGetter(() => {
      if (nativeToken) return nativeToken;
      if (!clerkLoaded || !clerkSignedIn) return null;
      return getClerkToken();
    });
    return () => setAuthTokenGetter(null);
  }, [clerkLoaded, clerkSignedIn, getClerkToken, nativeToken]);

  const loginNatively = useCallback((token: string, bakerId: number) => {
    localStorage.setItem("baker_token", token);
    localStorage.setItem("bakerId", String(bakerId));
    setNativeToken(token);
    setNativeBakerId(bakerId);
    setError(null);
  }, []);

  const logoutNatively = useCallback(() => {
    localStorage.removeItem("baker_token");
    localStorage.removeItem("bakerId");
    setNativeToken(null);
    setNativeBakerId(0);
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    if (nativeToken && nativeBakerId) {
      // Natively authenticated, skip Clerk session fetch
      setLoadingSession(false);
      return;
    }

    if (!clerkLoaded || !clerkSignedIn) {
      setSession(null);
      if (!nativeToken) {
        localStorage.removeItem("bakerId");
      }
      return;
    }

    setLoadingSession(true);
    setError(null);
    try {
      const next = await customFetch<ClerkBakerSession>("/api/bakers/clerk/session", {
        responseType: "json",
      });
      setSession(next);
      if (next.baker?.id) {
        localStorage.setItem("bakerId", String(next.baker.id));
      } else {
        if (!nativeToken) {
          localStorage.removeItem("bakerId");
        }
      }
    } catch (cause) {
      setSession(null);
      if (!nativeToken) {
        localStorage.removeItem("bakerId");
      }
      setError(cause instanceof Error ? cause.message : "Could not load your bakery account.");
    } finally {
      setLoadingSession(false);
    }
  }, [clerkLoaded, clerkSignedIn, nativeToken, nativeBakerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ManagedBakerContextValue>(
    () => ({
      bakerId: nativeToken ? nativeBakerId : (session?.baker?.id ?? 0),
      hasNativeSession: Boolean(nativeToken),
      isLoaded: nativeToken
        ? true
        : (clerkLoaded && !loadingSession && (!clerkSignedIn || session !== null || error !== null)),
      needsOnboarding: nativeToken ? false : Boolean(clerkSignedIn && session?.needsOnboarding),
      error,
      refresh,
      loginNatively,
      logoutNatively,
    }),
    [clerkLoaded, error, clerkSignedIn, loadingSession, refresh, session, nativeToken, nativeBakerId, loginNatively, logoutNatively],
  );

  return (
    <ManagedBakerContext.Provider value={value}>
      {children}
    </ManagedBakerContext.Provider>
  );
}

export function useManagedBaker(): ManagedBakerContextValue {
  const value = useContext(ManagedBakerContext);
  if (!value) {
    throw new Error("useManagedBaker must be used within ManagedAuthProvider");
  }
  return value;
}
