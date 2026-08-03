import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useGetBaker } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { NotificationBell } from "@/components/notification-bell";
import { InAppBrowserModal } from "@/components/ui/in-app-browser";
import { useManagedBaker } from "@/lib/managed-auth";
import { useAppAuth } from "@/lib/app-auth";
import { captureProductEvent, resetProductAnalytics } from "@/lib/product-analytics";
import {
  LayoutDashboard, ShoppingBag, Grid, DollarSign, Menu, X,
  BarChart3, Users, Calendar, Settings, LogOut, Bot, Globe, BookOpen, NotebookText, Sparkles,
} from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { logoutNatively } = useManagedBaker();
  const { signOut } = useAppAuth();
  const { bakerId } = useBuyerSession();
  const { role } = useManagedBaker();
  const feedbackUrl = import.meta.env.VITE_TALLY_FEEDBACK_URL?.trim();
  const { data: baker } = useGetBaker(bakerId, {
    query: { enabled: !!bakerId, queryKey: ["baker", bakerId], staleTime: 60_000 },
  });

  const trial = (baker as { trial?: { isFree?: boolean; expired?: boolean; daysLeft?: number | null; active?: boolean } } | undefined)?.trial;

  useEffect(() => setMobileNavOpen(false), [location]);

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
    <div className="min-h-screen bg-background text-foreground xl:flex">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[18rem] flex-col border-r border-white/10 bg-[#2f1837] text-white shadow-2xl transition-transform duration-200 xl:sticky xl:top-0 xl:h-screen xl:w-[17rem] xl:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e7b7c9]">
              <Sparkles className="h-3.5 w-3.5" /> Baker workspace
            </div>
            <h2 className="font-serif text-2xl font-bold leading-tight text-white">
              {baker?.businessName || "Your Kitchen"}
            </h2>
            <p className="mt-1 text-sm text-white/60">Orders, customers & agents</p>
          </div>
          <div className="flex items-center gap-1">
            {bakerId && <div className="hidden rounded-full bg-white text-foreground xl:block"><NotificationBell bakerId={bakerId} /></div>}
            <button type="button" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 xl:hidden"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white text-[#512060] font-semibold shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? "text-[#a44770]" : "text-white/55 group-hover:text-white"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-4">
          {feedbackUrl ? (
            <a
              href={feedbackUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureProductEvent("feedback_opened", { surface: "dashboard" })}
              className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Share feedback <span aria-hidden="true">↗</span>
              <span className="sr-only">(opens feedback form in a new tab)</span>
            </a>
          ) : (
            <Link
              href="/contact"
              onClick={() => captureProductEvent("feedback_opened", { surface: "dashboard_contact" })}
              className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Share feedback
            </Link>
          )}
          <button
            type="button"
            onClick={() => setBrowserUrl(window.location.origin)}
            className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-left text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            <Globe className="w-4 h-4" />
            In-App Storefront Browser
          </button>
          <button
              type="button"
              onClick={() => void handleNativeLogout()}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-white/65 transition-colors hover:bg-red-400/15 hover:text-red-100 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? "Signing out…" : "Sign out"}
            </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl xl:hidden">
          <button type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="rounded-xl border border-border bg-card p-2.5 text-primary shadow-sm"><Menu className="h-5 w-5" /></button>
          <span className="font-serif text-lg font-bold text-primary">{baker?.businessName || "Baker workspace"}</span>
          {bakerId ? <NotificationBell bakerId={bakerId} /> : <span className="w-10" />}
        </header>
        {trial?.isFree && trial.expired && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-8">
            <strong>Agent paused.</strong> Your 3-day Launch Free trial has ended. {" "}
            <Link href="/dashboard/settings#platform-billing" className="font-semibold underline">
              Choose a plan in Settings
            </Link>
            .
          </div>
        )}
        {trial?.isFree && trial.active && typeof trial.daysLeft === "number" && (
          <div className="border-b border-border bg-[#f1dde5]/60 px-4 py-3 text-sm text-foreground sm:px-8">
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
