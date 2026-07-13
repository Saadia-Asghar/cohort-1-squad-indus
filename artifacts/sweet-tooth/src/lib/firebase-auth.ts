import { GoogleAuthProvider, getAuth, signInWithPopup, type User } from "firebase/auth";
import { initializeApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
let app: FirebaseApp | null = null;

export function isFirebaseConfigured() {
  return configured;
}

export async function signInWithGoogle(): Promise<User> {
  if (!configured) {
    throw new Error("Google sign-in is not configured yet. Add the VITE_FIREBASE_* values in Vercel.");
  }
  app ??= initializeApp(config);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(getAuth(app), provider);
  return result.user;
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
