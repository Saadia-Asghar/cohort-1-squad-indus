import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetBaker } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { NotificationBell } from "@/components/notification-bell";
import { InAppBrowserModal } from "@/components/ui/in-app-browser";
import { useManagedBaker } from "@/lib/managed-auth";
import { useAppAuth } from "@/lib/app-auth";
import { captureProductEvent, resetProductAnalytics } from "@/lib/product-analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard, ShoppingBag, Grid, DollarSign, Menu, X,
  BarChart3, Users, Calendar, Settings, LogOut, Bot, Globe, BookOpen, NotebookText, Sparkles, Keyboard,
} from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState("");
  const shortcutPendingRef = useRef(false);
  const shortcutTimerRef = useRef<number | null>(null);
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

  const navItems = useMemo(() => [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, shortcut: "h" },
    { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, shortcut: "o" },
    { href: "/dashboard/catalog", label: "Catalog", icon: Grid, shortcut: "c" },
    ...(role === "owner" ? [{ href: "/dashboard/payments", label: "Payments", icon: DollarSign, shortcut: "p" }] : []),
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, shortcut: "a" },
    { href: "/dashboard/customers", label: "Customers", icon: Users, shortcut: "u" },
    { href: "/dashboard/khata", label: "Khata", icon: NotebookText, shortcut: "k" },
    ...(role === "owner" ? [{ href: "/dashboard/agent-hub", label: "Agent Hub", icon: Bot, shortcut: "i" }] : []),
    { href: "/dashboard/guide", label: "Baker Guide", icon: BookOpen, shortcut: "g" },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, shortcut: "d" },
    ...(role === "owner" ? [{ href: "/dashboard/settings", label: "Settings", icon: Settings, shortcut: "s" }] : []),
  ], [role]);

  useEffect(() => {
    const clearPendingShortcut = () => {
      shortcutPendingRef.current = false;
      if (shortcutTimerRef.current !== null) window.clearTimeout(shortcutTimerRef.current);
      shortcutTimerRef.current = null;
    };

    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) return;

      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        clearPendingShortcut();
        setShortcutGuideOpen(true);
        return;
      }

      const key = event.key.toLowerCase();
      if (shortcutPendingRef.current) {
        const destination = navItems.find((item) => item.shortcut === key);
        clearPendingShortcut();
        if (destination) {
          event.preventDefault();
          navigate(destination.href);
          setMobileNavOpen(false);
          setShortcutStatus(`Opened ${destination.label}`);
        } else if (key !== "escape") {
          setShortcutStatus("Shortcut not recognized");
        }
        return;
      }

      if (key === "g" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        shortcutPendingRef.current = true;
        setShortcutStatus("Go to… press a destination key");
        shortcutTimerRef.current = window.setTimeout(() => {
          shortcutPendingRef.current = false;
          shortcutTimerRef.current = null;
          setShortcutStatus("");
        }, 1800);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
      clearPendingShortcut();
    };
  }, [navigate, navItems]);

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
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[18rem] flex-col border-r border-white/10 bg-[#2f1837] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[17rem] lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/15">
                <img src="/sweet-tooth-mark.png" alt="" className="h-full w-full object-contain" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-none text-white">Sweet Tooth</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#e7b7c9]">
                  <Sparkles className="h-3 w-3" /> Baker workspace
                </div>
              </div>
            </div>
            <h2 className="truncate font-serif text-xl font-bold leading-tight text-white">
              {baker?.businessName || "Your Kitchen"}
            </h2>
            <p className="mt-1 text-xs text-white/60">Orders, customers & assistant</p>
          </div>
          <div className="flex items-center gap-1">
            {bakerId && <div className="rounded-full bg-white text-foreground"><NotificationBell bakerId={bakerId} /></div>}
            <button type="button" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Dashboard navigation">
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
            onClick={() => setShortcutGuideOpen(true)}
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Keyboard shortcuts
            <kbd className="ml-auto rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">?</kbd>
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl lg:hidden">
          <button type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} className="rounded-xl border border-border bg-card p-2.5 text-primary shadow-sm"><Menu className="h-5 w-5" /></button>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-1 shadow-sm">
              <img src="/sweet-tooth-mark.png" alt="" className="h-full w-full object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/60">Sweet Tooth</p>
              <span className="block max-w-[175px] truncate text-sm font-bold text-primary">{baker?.businessName || "Baker workspace"}</span>
            </div>
          </div>
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

      <Dialog open={shortcutGuideOpen} onOpenChange={setShortcutGuideOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 shadow-2xl">
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <DialogTitle className="flex items-center gap-2 font-serif text-2xl text-primary">
              <Keyboard className="h-5 w-5" aria-hidden="true" /> Keyboard shortcuts
            </DialogTitle>
            <DialogDescription>
              Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">G</kbd>, then the destination key. Shortcuts pause while you type in a form.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-1 gap-1 overflow-y-auto px-4 py-4 sm:grid-cols-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    navigate(item.href);
                    setShortcutGuideOpen(false);
                  }}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="flex gap-1" aria-label={`Shortcut G then ${item.shortcut.toUpperCase()}`}>
                    <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">G</kbd>
                    <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">{item.shortcut.toUpperCase()}</kbd>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div className="sr-only" aria-live="polite" aria-atomic="true">{shortcutStatus}</div>
      {shortcutPendingRef.current && shortcutStatus && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#2f1837] px-4 py-2 text-sm font-semibold text-white shadow-xl" aria-hidden="true">
          {shortcutStatus}
        </div>
      )}
    </div>
  );
}
