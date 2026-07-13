import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { initializeApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
let app: FirebaseApp | null = null;

function getFirebaseAuth() {
  if (!configured) {
    throw new Error("Google sign-in is not configured yet. Add the VITE_FIREBASE_* values in Vercel.");
  }
  app ??= initializeApp(config);
  return getAuth(app);
}

export function isFirebaseConfigured() {
  return configured;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // A popup keeps the user on the Vercel app. Redirect mode can become stuck
  // on Firebase's handler page in browsers that restrict cross-site storage.
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function getGoogleRedirectUser(): Promise<User | null> {
  if (!configured) return null;
  const result = await getRedirectResult(getFirebaseAuth());
  return result?.user ?? null;
}

export function onGoogleAuthUser(callback: (user: User | null) => void) {
  if (!configured) return () => undefined;
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function signOutGoogle(): Promise<void> {
  if (!configured) return;
  await signOut(getFirebaseAuth());
}

export function forgetGoogleUser() {
  localStorage.removeItem("sweet-tooth-google-user");
}

export function rememberGoogleUser(user: User, role: "buyer" | "baker") {
  localStorage.setItem("sweet-tooth-google-user", JSON.stringify({
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photoUrl: user.photoURL,
    role,
  }));
}
