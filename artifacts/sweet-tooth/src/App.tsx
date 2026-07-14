import { Switch, Route, Router as WouterRouter } from "wouter";
import type { ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";

// Read API URL from environment variable, falling back to same-origin proxy
const apiUrl = import.meta.env.VITE_API_URL || "https://cohort-1-squad-indus-api-server-z3b.vercel.app";
if (apiUrl) {
  setBaseUrl(apiUrl);
}

// Public pages: customers reach a baker's menu through a direct shared link.
import Home from "@/pages/buyer/home";
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
import { getBakerSession } from "@/lib/baker-session";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedDashboard({ component: Component }: { component: ComponentType }) {
  return getBakerSession() ? <Component /> : <BakerLogin />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
      <Route path="/dashboard/login" component={BakerLogin} />
      <Route path="/dashboard/register" component={BakerRegister} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
