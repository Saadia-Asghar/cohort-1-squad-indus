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
  needsOnboarding: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ManagedBakerContext = createContext<ManagedBakerContextValue | null>(null);

export function ManagedAuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const [session, setSession] = useState<ClerkBakerSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!clerkLoaded || !isSignedIn) {
      setSession(null);
      localStorage.removeItem("bakerId");
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
        localStorage.removeItem("bakerId");
      }
    } catch (cause) {
      setSession(null);
      localStorage.removeItem("bakerId");
      setError(cause instanceof Error ? cause.message : "Could not load your bakery account.");
    } finally {
      setLoadingSession(false);
    }
  }, [clerkLoaded, isSignedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ManagedBakerContextValue>(
    () => ({
      bakerId: session?.baker?.id ?? 0,
      isLoaded: clerkLoaded && !loadingSession && (!isSignedIn || session !== null || error !== null),
      needsOnboarding: Boolean(isSignedIn && session?.needsOnboarding),
      error,
      refresh,
    }),
    [clerkLoaded, error, isSignedIn, loadingSession, refresh, session],
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
