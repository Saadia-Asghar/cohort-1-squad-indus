import { Switch, Route, Router as WouterRouter } from "wouter";
import type { ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";
import {
  ManagedAuthProvider,
  useManagedBaker,
} from "@/lib/managed-auth";

// Read API URL from environment variable, falling back to the live production API alias.
const apiUrl =
  import.meta.env.VITE_API_URL ||
  "https://cohort-1-squad-indus-api-server-z3b.vercel.app";
if (apiUrl) {
  setBaseUrl(apiUrl);
}

// Public pages: customers reach a baker's menu through a direct shared link.
import Home from "@/pages/buyer/home";
import Contact from "@/pages/contact";
import BakerProfile from "@/pages/buyer/baker-profile";
import Cart from "@/pages/buyer/cart";
import BuyerOrders from "@/pages/buyer/orders";

// Dashboard Pages
import DashboardHome from "@/pages/dashboard/home";
import DashboardOrders from "@/pages/dashboard/orders";
import DashboardCatalog from "@/pages/dashboard/catalog";
import DashboardAnalytics from "@/pages/dashboard/analytics";
import DashboardSettings from "@/pages/dashboard/settings";
import DashboardPayments from "@/pages/dashboard/payments";
import DashboardCustomers from "@/pages/dashboard/customers";
import DashboardCalendar from "@/pages/dashboard/calendar";
import DashboardAgentHub from "@/pages/dashboard/agent-hub";
import BakerLogin from "@/pages/auth/baker-login";
import BakerRegister from "@/pages/auth/baker-register";
import BakerOnboarding from "@/pages/auth/baker-onboarding";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedDashboard({ component: Component }: { component: ComponentType }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const managed = useManagedBaker();

  if (managed.hasNativeSession) {
    return managed.bakerId ? <Component /> : <BakerOnboarding />;
  }

  // Clerk development instances cannot initialize on a production domain.
  // Keep the native, hardened login available instead of hanging forever.
  if (!clerkLoaded) return <BakerLogin />;
  if (!managed.isLoaded) {
    return <div className="min-h-screen bg-background px-6 py-20 text-center text-muted-foreground">Loading your secure session…</div>;
  }
  if (!isSignedIn) return <BakerLogin />;
  if (managed.error) {
    return <div role="alert" className="min-h-screen bg-background px-6 py-20 text-center text-destructive">{managed.error}</div>;
  }
  if (managed.needsOnboarding) return <BakerOnboarding />;
  return managed.bakerId ? <Component /> : <BakerOnboarding />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contact" component={Contact} />
      <Route path="/menu/:id" component={BakerProfile} />
      <Route path="/bakers/:id" component={BakerProfile} />
      <Route path="/cart" component={Cart} />
      <Route path="/orders" component={BuyerOrders} />

      <Route path="/dashboard" component={() => <ProtectedDashboard component={DashboardHome} />} />
      <Route path="/dashboard/orders" component={() => <ProtectedDashboard component={DashboardOrders} />} />
      <Route path="/dashboard/catalog" component={() => <ProtectedDashboard component={DashboardCatalog} />} />
      <Route path="/dashboard/analytics" component={() => <ProtectedDashboard component={DashboardAnalytics} />} />
      <Route path="/dashboard/settings" component={() => <ProtectedDashboard component={DashboardSettings} />} />
      <Route path="/dashboard/payments" component={() => <ProtectedDashboard component={DashboardPayments} />} />
      <Route path="/dashboard/customers" component={() => <ProtectedDashboard component={DashboardCustomers} />} />
      <Route path="/dashboard/calendar" component={() => <ProtectedDashboard component={DashboardCalendar} />} />
      <Route path="/dashboard/agent-hub" component={() => <ProtectedDashboard component={DashboardAgentHub} />} />
      <Route path="/dashboard/login" component={() => <BakerLogin />} />
      <Route path="/dashboard/register" component={BakerRegister} />
      <Route path="/dashboard/onboarding" component={BakerOnboarding} />
      {/* Preserve old shared login links, but keep access baker-only. */}
      <Route path="/login" component={() => <BakerLogin />} />
      <Route path="/login/buyer" component={() => <BakerLogin />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ManagedAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ManagedAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
