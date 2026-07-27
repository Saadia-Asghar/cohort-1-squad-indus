import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

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
  const [nativeToken, setNativeToken] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem("baker_token") : null);
  const [nativeBakerId, setNativeBakerId] = useState<number>(() => typeof window !== "undefined" ? Number(localStorage.getItem("bakerId") || 0) : 0);

  useEffect(() => {
    setAuthTokenGetter(() => nativeToken);
    return () => setAuthTokenGetter(null);
  }, [nativeToken]);

  const loginNatively = useCallback((token: string, bakerId: number) => {
    localStorage.setItem("baker_token", token);
    localStorage.setItem("bakerId", String(bakerId));
    setNativeToken(token);
    setNativeBakerId(bakerId);
  }, []);

  const logoutNatively = useCallback(() => {
    localStorage.removeItem("baker_token");
    localStorage.removeItem("bakerId");
    setNativeToken(null);
    setNativeBakerId(0);
  }, []);

  const refresh = useCallback(async () => undefined, []);
  const value = useMemo<ManagedBakerContextValue>(() => ({
    bakerId: nativeToken ? nativeBakerId : 0,
    hasNativeSession: Boolean(nativeToken && nativeBakerId),
    isLoaded: true,
    needsOnboarding: false,
    error: null,
    refresh,
    loginNatively,
    logoutNatively,
  }), [nativeToken, nativeBakerId, refresh, loginNatively, logoutNatively]);

  return <ManagedBakerContext.Provider value={value}>{children}</ManagedBakerContext.Provider>;
}

export function useManagedBaker(): ManagedBakerContextValue {
  const value = useContext(ManagedBakerContext);
  if (!value) throw new Error("useManagedBaker must be used within ManagedAuthProvider");
  return value;
}
