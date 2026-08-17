import { Switch, Route, Router as WouterRouter } from "wouter";
import { lazy, Suspense, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dashboardQueryDefaults } from "@/lib/dashboard-query";
import { DashboardPageFallback } from "@/components/dashboard/dashboard-page-fallback";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";
import {
  ManagedAuthProvider,
  useManagedBaker,
} from "@/lib/managed-auth";
import { initializeProductAnalytics } from "@/lib/product-analytics";

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
import Bakers from "@/pages/buyer/bakers";
import Cart from "@/pages/buyer/cart";
import BuyerOrders from "@/pages/buyer/orders";
import OrderFeedback from "@/pages/buyer/feedback";
import { PrivacyPolicy, TermsOfService } from "@/pages/legal";

// Dashboard pages — lazy-loaded so each tab opens fast without loading the whole app.
const DashboardHome = lazy(() => import("@/pages/dashboard/home"));
const DashboardOrders = lazy(() => import("@/pages/dashboard/orders"));
const DashboardCatalog = lazy(() => import("@/pages/dashboard/catalog"));
const DashboardAnalytics = lazy(() => import("@/pages/dashboard/analytics"));
const DashboardSettings = lazy(() => import("@/pages/dashboard/settings"));
const DashboardPayments = lazy(() => import("@/pages/dashboard/payments"));
const DashboardCustomers = lazy(() => import("@/pages/dashboard/customers"));
const DashboardCalendar = lazy(() => import("@/pages/dashboard/calendar"));
const DashboardAgentHub = lazy(() => import("@/pages/dashboard/agent-hub"));
const DashboardGuide = lazy(() => import("@/pages/dashboard/guide"));
const DashboardKhata = lazy(() => import("@/pages/dashboard/khata"));
const DashboardHumanInbox = lazy(() => import("@/pages/dashboard/human-inbox"));
import BakerLogin from "@/pages/auth/baker-login";
import BakerRegister from "@/pages/auth/baker-register";
import BakerOnboarding from "@/pages/auth/baker-onboarding";
import BakerForgotPassword from "@/pages/auth/baker-forgot-password";
import BakerResetPassword from "@/pages/auth/baker-reset-password";
import AdminPortal from "@/pages/admin";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: dashboardQueryDefaults,
  },
});

function ProtectedDashboard({ component: Component }: { component: ComponentType }) {
  const managed = useManagedBaker();

  if (managed.hasNativeSession) {
    return managed.bakerId ? (
      <Suspense fallback={<DashboardPageFallback />}>
        <Component />
      </Suspense>
    ) : (
      <BakerOnboarding />
    );
  }

  // The bakery dashboard always requires an API session issued after native or Firebase sign-in.
  return <BakerLogin />;
}

function dashboardRoute(Component: ComponentType) {
  return function DashboardRoute() {
    return <ProtectedDashboard component={Component} />;
  };
}

function ownerDashboardRoute(Component: ComponentType) {
  return function OwnerDashboardRoute() {
    const managed = useManagedBaker();
    if (managed.hasNativeSession && managed.bakerId && managed.role !== "owner") {
      return <DashboardHomeRoute />;
    }
    return <ProtectedDashboard component={Component} />;
  };
}

function DashboardHomeRoute() {
  const managed = useManagedBaker();
  return <ProtectedDashboard component={managed.role === "staff" ? DashboardHumanInbox : DashboardHome} />;
}
const DashboardOrdersRoute = dashboardRoute(DashboardOrders);
const DashboardCatalogRoute = ownerDashboardRoute(DashboardCatalog);
const DashboardAnalyticsRoute = ownerDashboardRoute(DashboardAnalytics);
const DashboardSettingsRoute = ownerDashboardRoute(DashboardSettings);
const DashboardPaymentsRoute = ownerDashboardRoute(DashboardPayments);
const DashboardCustomersRoute = dashboardRoute(DashboardCustomers);
const DashboardCalendarRoute = ownerDashboardRoute(DashboardCalendar);
const DashboardAgentHubRoute = ownerDashboardRoute(DashboardAgentHub);
const DashboardKhataRoute = ownerDashboardRoute(DashboardKhata);
const DashboardGuideRoute = ownerDashboardRoute(DashboardGuide);
const DashboardHumanInboxRoute = dashboardRoute(DashboardHumanInbox);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contact" component={Contact} />
      <Route path="/bakers" component={Bakers} />
      <Route path="/menu/:id" component={BakerProfile} />
      <Route path="/bakers/:id" component={BakerProfile} />
      <Route path="/cart" component={Cart} />
      <Route path="/orders/:orderId" component={BuyerOrders} />
      <Route path="/orders" component={BuyerOrders} />
      <Route path="/feedback/:orderId" component={OrderFeedback} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />

      <Route path="/dashboard" component={DashboardHomeRoute} />
      <Route path="/dashboard/orders" component={DashboardOrdersRoute} />
      <Route path="/dashboard/catalog" component={DashboardCatalogRoute} />
      <Route path="/dashboard/analytics" component={DashboardAnalyticsRoute} />
      <Route path="/dashboard/settings" component={DashboardSettingsRoute} />
      <Route path="/dashboard/payments" component={DashboardPaymentsRoute} />
      <Route path="/dashboard/customers" component={DashboardCustomersRoute} />
      <Route path="/dashboard/calendar" component={DashboardCalendarRoute} />
      <Route path="/dashboard/agent-hub" component={DashboardAgentHubRoute} />
      <Route path="/dashboard/khata" component={DashboardKhataRoute} />
      <Route path="/dashboard/guide" component={DashboardGuideRoute} />
      <Route path="/dashboard/human-inbox" component={DashboardHumanInboxRoute} />
      <Route path="/dashboard/login" component={() => <BakerLogin />} />
      <Route path="/dashboard/register" component={BakerRegister} />
      <Route path="/dashboard/onboarding" component={BakerOnboarding} />
      <Route path="/dashboard/forgot-password" component={BakerForgotPassword} />
      <Route path="/dashboard/reset-password" component={BakerResetPassword} />
      {/* Preserve old shared login links, but keep access baker-only. */}
      <Route path="/login" component={() => <BakerLogin />} />
      {/* Customers never need an account; old buyer-login links return to the public experience. */}
      <Route path="/login/buyer" component={Home} />
      <Route path="/forgot-password" component={BakerForgotPassword} />
      <Route path="/reset-password" component={BakerResetPassword} />
      <Route path="/admin" component={AdminPortal} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  initializeProductAnalytics();

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
