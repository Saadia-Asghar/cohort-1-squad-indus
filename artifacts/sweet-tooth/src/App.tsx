import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Buyer Pages
import Home from "@/pages/buyer/home";
import Bakers from "@/pages/buyer/bakers";
import BakerProfile from "@/pages/buyer/baker-profile";
import Cart from "@/pages/buyer/cart";
import BuyerOrders from "@/pages/buyer/orders";
import BuyerLogin from "@/pages/auth/buyer-login";

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

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/bakers" component={Bakers} />
      <Route path="/bakers/:id" component={BakerProfile} />
      <Route path="/cart" component={Cart} />
      <Route path="/orders" component={BuyerOrders} />
      <Route path="/login" component={BuyerLogin} />

      <Route path="/dashboard" component={DashboardHome} />
      <Route path="/dashboard/orders" component={DashboardOrders} />
      <Route path="/dashboard/catalog" component={DashboardCatalog} />
      <Route path="/dashboard/analytics" component={DashboardAnalytics} />
      <Route path="/dashboard/settings" component={DashboardSettings} />
      <Route path="/dashboard/payments" component={DashboardPayments} />
      <Route path="/dashboard/customers" component={DashboardCustomers} />
      <Route path="/dashboard/calendar" component={DashboardCalendar} />
      <Route path="/dashboard/agent-hub" component={DashboardAgentHub} />
      <Route path="/dashboard/login" component={BakerLogin} />

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
