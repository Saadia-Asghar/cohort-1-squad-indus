import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type ManagedBakerContextValue = {
  bakerId: number;
  role: "owner" | "staff";
  isLoaded: boolean;
  hasNativeSession: boolean;
  needsOnboarding: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loginNatively: (token: string, bakerId: number, role?: "owner" | "staff") => void;
  logoutNatively: () => void;
};

const ManagedBakerContext = createContext<ManagedBakerContextValue | null>(null);

export function ManagedAuthProvider({ children }: { children: ReactNode }) {
  const [nativeToken, setNativeToken] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem("baker_token") : null);
  const [nativeBakerId, setNativeBakerId] = useState<number>(() => typeof window !== "undefined" ? Number(localStorage.getItem("bakerId") || 0) : 0);
  const [role, setRole] = useState<"owner" | "staff">(() => typeof window !== "undefined" && localStorage.getItem("baker_role") === "staff" ? "staff" : "owner");

  useEffect(() => {
    setAuthTokenGetter(() => nativeToken);
    return () => setAuthTokenGetter(null);
  }, [nativeToken]);

  const loginNatively = useCallback((token: string, bakerId: number, nextRole: "owner" | "staff" = "owner") => {
    localStorage.setItem("baker_token", token);
    localStorage.setItem("bakerId", String(bakerId));
    localStorage.setItem("baker_role", nextRole);
    setNativeToken(token);
    setNativeBakerId(bakerId);
    setRole(nextRole);
  }, []);

  const logoutNatively = useCallback(() => {
    localStorage.removeItem("baker_token");
    localStorage.removeItem("bakerId");
    localStorage.removeItem("baker_role");
    setNativeToken(null);
    setNativeBakerId(0);
    setRole("owner");
  }, []);

  const refresh = useCallback(async () => undefined, []);
  const value = useMemo<ManagedBakerContextValue>(() => ({
    bakerId: nativeToken ? nativeBakerId : 0,
    role,
    hasNativeSession: Boolean(nativeToken && nativeBakerId),
    isLoaded: true,
    needsOnboarding: false,
    error: null,
    refresh,
    loginNatively,
    logoutNatively,
  }), [nativeToken, nativeBakerId, role, refresh, loginNatively, logoutNatively]);

  return <ManagedBakerContext.Provider value={value}>{children}</ManagedBakerContext.Provider>;
}

export function useManagedBaker(): ManagedBakerContextValue {
  const value = useContext(ManagedBakerContext);
  if (!value) throw new Error("useManagedBaker must be used within ManagedAuthProvider");
  return value;
}
