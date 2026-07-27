import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function firebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error("Google sign-in is not configured yet.");
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}
