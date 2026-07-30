import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useGetBaker } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { NotificationBell } from "@/components/notification-bell";
import { InAppBrowserModal } from "@/components/ui/in-app-browser";
import { useManagedBaker } from "@/lib/managed-auth";
import { useAppAuth } from "@/lib/app-auth";
import { captureProductEvent, resetProductAnalytics } from "@/lib/product-analytics";
import {
  LayoutDashboard, ShoppingBag, Grid, DollarSign,
  BarChart3, Users, Calendar, Settings, LogOut, Bot, Globe, BookOpen, NotebookText,
} from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const { logoutNatively } = useManagedBaker();
  const { signOut } = useAppAuth();
  const { bakerId } = useBuyerSession();
  const { role } = useManagedBaker();
  const feedbackUrl = import.meta.env.VITE_TALLY_FEEDBACK_URL?.trim();
  const { data: baker } = useGetBaker(bakerId, {
    query: { enabled: !!bakerId, queryKey: ["baker", bakerId], staleTime: 60_000 },
  });

  const trial = (baker as { trial?: { isFree?: boolean; expired?: boolean; daysLeft?: number | null; active?: boolean } } | undefined)?.trial;

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
    { href: "/dashboard/catalog", label: "Catalog", icon: Grid },
    ...(role === "owner" ? [{ href: "/dashboard/payments", label: "Payments", icon: DollarSign }] : []),
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/khata", label: "Khata", icon: NotebookText },
    ...(role === "owner" ? [{ href: "/dashboard/agent-hub", label: "Agent Hub", icon: Bot }] : []),
    { href: "/dashboard/guide", label: "Baker Guide", icon: BookOpen },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    ...(role === "owner" ? [{ href: "/dashboard/settings", label: "Settings", icon: Settings }] : []),
  ];

  const finishLogout = () => {
    resetProductAnalytics();
    logoutNatively();
    navigate("/dashboard/login");
    setIsLoggingOut(false);
  };

  const handleNativeLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch {
      // The local API session must still be cleared if Firebase is unavailable.
    }
    finishLogout();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-primary">
              {baker?.businessName || "Your Kitchen"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Ghar ka meetha</p>
          </div>
          {bakerId && <NotificationBell bakerId={bakerId} />}
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          {feedbackUrl ? (
            <a
              href={feedbackUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureProductEvent("feedback_opened", { surface: "dashboard" })}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Share feedback <span aria-hidden="true">↗</span>
              <span className="sr-only">(opens feedback form in a new tab)</span>
            </a>
          ) : (
            <Link
              href="/contact"
              onClick={() => captureProductEvent("feedback_opened", { surface: "dashboard_contact" })}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Share feedback
            </Link>
          )}
          <button
            type="button"
            onClick={() => setBrowserUrl(window.location.origin)}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            In-App Storefront Browser
          </button>
          <button
              type="button"
              onClick={() => void handleNativeLogout()}
              disabled={isLoggingOut}
              className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? "Logging out…" : "Logout"}
            </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {trial?.isFree && trial.expired && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
            Your 3-day Launch Free trial has ended. Agent replies and broadcasts are paused —{" "}
            <Link href="/dashboard/settings#platform-billing" className="font-semibold underline">
              upgrade via WhatsApp in Settings
            </Link>
            .
          </div>
        )}
        {trial?.isFree && trial.active && typeof trial.daysLeft === "number" && (
          <div className="border-b border-border bg-muted/50 px-6 py-3 text-sm text-muted-foreground">
            Launch Free trial — {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left.{" "}
            <Link href="/dashboard/settings#platform-billing" className="font-medium text-primary underline">
              Upgrade anytime
            </Link>
            .
          </div>
        )}
        {children}
      </main>

      <InAppBrowserModal
        url={browserUrl}
        title="Sweet Tooth Storefront Preview"
        isOpen={!!browserUrl}
        onClose={() => setBrowserUrl(null)}
      />
    </div>
  );
}
