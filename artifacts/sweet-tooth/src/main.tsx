import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  publishableKey ? (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  ) : (
    <main className="min-h-screen bg-background px-6 py-20 text-center text-foreground">
      <h1 className="font-serif text-3xl font-bold">Authentication setup required</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
        Add VITE_CLERK_PUBLISHABLE_KEY to the frontend environment before opening the baker portal.
      </p>
    </main>
  ),
);
