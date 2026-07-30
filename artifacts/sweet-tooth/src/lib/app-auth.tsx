import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "./firebase";

type AppAuthValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<string>;
  signOut: () => Promise<void>;
};

const AppAuthContext = createContext<AppAuthValue | null>(null);
const DISABLED_AUTH: AppAuthValue = {
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
  signInWithGoogle: async () => { throw new Error("Google sign-in is not configured yet."); },
  signOut: async () => undefined,
};

function FirebaseAuthBridge({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => onAuthStateChanged(firebaseAuth(), (nextUser) => {
    setUser(nextUser);
    setIsLoaded(true);
  }), []);

  const value = useMemo<AppAuthValue>(() => ({
    isLoaded,
    isSignedIn: Boolean(user),
    getToken: async () => user ? user.getIdToken() : null,
    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(firebaseAuth(), provider);
      return result.user.getIdToken();
    },
    signOut: async () => signOut(firebaseAuth()),
  }), [isLoaded, user]);

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export { isFirebaseConfigured };

export function AppAuthProvider({ children }: { children: ReactNode }) {
  return isFirebaseConfigured()
    ? <FirebaseAuthBridge>{children}</FirebaseAuthBridge>
    : <AppAuthContext.Provider value={DISABLED_AUTH}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth(): AppAuthValue {
  const value = useContext(AppAuthContext);
  if (!value) throw new Error("useAppAuth must be used within AppAuthProvider");
  return value;
}
