import { Link, useLocation } from "wouter";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useGetBaker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBuyerSession } from "@/hooks/use-session";
import { NotificationBell } from "@/components/notification-bell";
import { BakeryQuest } from "@/components/dashboard/bakery-quest";
import { InAppBrowserModal } from "@/components/ui/in-app-browser";
import { useManagedBaker } from "@/lib/managed-auth";
import { useAppAuth } from "@/lib/app-auth";
import {
  captureProductEvent,
  resetProductAnalytics,
} from "@/lib/product-analytics";
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Globe,
  Grid,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  NotebookText,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type DashboardNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
};

const desktopPrimaryItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/catalog", label: "Catalog", icon: Grid },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: DollarSign,
    ownerOnly: true,
  },
  {
    href: "/dashboard/agent-hub",
    label: "Agent Hub",
    icon: Bot,
    ownerOnly: true,
  },
];

const desktopSecondaryItems: DashboardNavItem[] = [
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/khata", label: "Khata", icon: NotebookText },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    ownerOnly: true,
  },
];

const mobilePrimaryItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/catalog", label: "Catalog", icon: Grid },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
];

const moreItems: DashboardNavItem[] = [
  {
    href: "/dashboard/calendar",
    label: "Order schedule",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: DollarSign,
    ownerOnly: true,
  },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/khata", label: "Khata", icon: NotebookText },
  {
    href: "/dashboard/agent-hub",
    label: "Agent Hub",
    icon: Bot,
    ownerOnly: true,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    ownerOnly: true,
  },
];

function routeIsActive(location: string, href: string): boolean {
  if (href === "/dashboard") return location === href;
  return location === href || location.startsWith(`${href}/`);
}

function DesktopNavLink({
  item,
  active,
}: {
  item: DashboardNavItem;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all ${
        active
          ? "sweet-gradient font-semibold text-white shadow-[0_9px_24px_rgba(14,5,19,0.22)]"
          : "text-white/[0.72] hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active
            ? "text-white"
            : "text-white/[0.5] group-hover:text-white/[0.9]"
        }`}
      />

      <span className="min-w-0 flex-1 truncate">{item.label}</span>

      {item.label === "Orders" ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[9px] font-bold text-white">
          3
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { logoutNatively, role } = useManagedBaker();
  const { signOut } = useAppAuth();
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();

  const feedbackUrl = import.meta.env.VITE_TALLY_FEEDBACK_URL?.trim();

  const { data: baker } = useGetBaker(bakerId, {
    query: {
      enabled: Boolean(bakerId),
      queryKey: ["baker", bakerId],
      staleTime: 60_000,
    },
  });

  const trial = (
    baker as
      | {
          trial?: {
            isFree?: boolean;
            expired?: boolean;
            daysLeft?: number | null;
            active?: boolean;
          };
        }
      | undefined
  )?.trial;

  const businessName = baker?.businessName || "Sweet Tooth Bakery";
  const businessInitials = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "ST";

  const visiblePrimaryItems = useMemo(
    () =>
      desktopPrimaryItems.filter(
        (item) => !item.ownerOnly || role === "owner",
      ),
    [role],
  );

  const visibleSecondaryItems = useMemo(
    () =>
      desktopSecondaryItems.filter(
        (item) => !item.ownerOnly || role === "owner",
      ),
    [role],
  );

  const visibleMoreItems = useMemo(
    () =>
      moreItems.filter((item) => !item.ownerOnly || role === "owner"),
    [role],
  );

  useEffect(() => {
    setMoreOpen(false);
    setProfileOpen(false);
  }, [location]);

  useEffect(() => {
    if (!moreOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  const finishLogout = () => {
    resetProductAnalytics();
    queryClient.clear();
    logoutNatively();
    navigate("/dashboard/login");
    setIsLoggingOut(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await signOut();
    } catch {
      // Always clear the local API session, even when Firebase is unavailable.
    }

    finishLogout();
  };

  const openFeedback = () => {
    captureProductEvent("feedback_opened", {
      surface: feedbackUrl ? "dashboard" : "dashboard_contact",
    });

    if (feedbackUrl) {
      window.open(feedbackUrl, "_blank", "noopener,noreferrer");
      return;
    }

    navigate("/contact");
  };

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[12.75rem] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-plum-deep via-plum-deep to-primary text-white shadow-[22px_0_65px_rgba(39,20,47,0.14)] xl:flex">        <div className="px-5 pb-5 pt-6">
          <Link
            href="/dashboard"
            aria-label="Sweet Tooth dashboard"
            className="inline-flex items-center rounded-2xl bg-white px-2.5 py-2 shadow-sm"
          >
            <img
              src="/sweet-tooth-logo.png"
              alt="Sweet Tooth"
              className="h-10 w-auto max-w-[148px] object-contain"
            />
          </Link>
        </div>


        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/[0.42]">
            Workspace
          </p>

          <nav className="space-y-1" aria-label="Primary dashboard navigation">
            {visiblePrimaryItems.map((item) => (
              <DesktopNavLink
                key={item.href}
                item={item}
                active={routeIsActive(location, item.href)}
              />
            ))}
          </nav>

          <div className="my-4 h-px bg-white/8" />

          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/[0.42]">
            Business
          </p>

          <nav className="space-y-1" aria-label="Secondary dashboard navigation">
            {visibleSecondaryItems.map((item) => (
              <DesktopNavLink
                key={item.href}
                item={item}
                active={routeIsActive(location, item.href)}
              />
            ))}
          </nav>
        </div>        <div className="space-y-3 border-t border-white/10 p-3">
          {trial?.isFree &&
          trial.active &&
          typeof trial.daysLeft === "number" ? (
            <Link
              href="/dashboard/settings#platform-billing"
              className="group flex items-center justify-between rounded-lg border border-white/45 bg-white/[0.025] px-3 py-3 text-white transition hover:bg-white/[0.07]"
            >
              <span>
                <span className="block text-[10px] font-semibold">
                  Trial · {trial.daysLeft} day
                  {trial.daysLeft === 1 ? "" : "s"} left
                </span>

                <span className="mt-1 block text-[9px] text-white/[0.62]">
                  Upgrade anytime
                </span>
              </span>

              <span
                aria-hidden="true"
                className="text-sm text-white/[0.65] transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-expanded={profileOpen}
              className="flex min-h-12 w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/[0.07]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card text-[10px] font-bold text-primary">
                {businessInitials}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-white">
                  {businessName}
                </span>

                <span className="mt-0.5 block truncate text-[9px] text-white/[0.48]">
                  {role === "owner" ? "Owner workspace" : "Team workspace"}
                </span>
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-white/[0.48] transition-transform ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileOpen ? (
              <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 overflow-hidden rounded-xl border border-white/15 bg-plum-deep p-1.5 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setBrowserUrl(window.location.origin);
                  }}
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[10px] font-semibold text-white/[0.74] hover:bg-white/[0.09] hover:text-white"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Preview storefront
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    openFeedback();
                  }}
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[10px] font-semibold text-white/[0.74] hover:bg-white/[0.09] hover:text-white"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Share feedback
                </button>

                <Link
                  href="/dashboard/settings"
                  className="flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[10px] font-semibold text-white/[0.74] hover:bg-white/[0.09] hover:text-white"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Link>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[10px] font-semibold text-red-200/[0.75] hover:bg-red-400/[0.12] hover:text-red-100 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {isLoggingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="min-w-0 pb-24 xl:pl-[12.75rem] xl:pb-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl xl:hidden">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-secondary">
              Sweet Tooth
            </p>
            <p className="truncate font-serif text-lg font-semibold tracking-[-0.02em] text-primary">
              {baker?.businessName || "Baker workspace"}
            </p>
          </div>

          {bakerId ? (
            <div className="shrink-0">
              <NotificationBell bakerId={bakerId} />
            </div>
          ) : (
            <span className="h-10 w-10" />
          )}
        </header>

        {trial?.isFree && trial.expired ? (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6 xl:px-8">
            <strong>Agent paused.</strong> Your 3-day Launch Free trial has
            ended.{" "}
            <Link
              href="/dashboard/settings#platform-billing"
              className="font-semibold underline underline-offset-2"
            >
              Choose a plan
            </Link>
            .
          </div>
        ) : null}

        {trial?.isFree &&
        trial.active &&
        typeof trial.daysLeft === "number" ? (
          <div className="border-b border-border bg-accent px-4 py-2.5 text-xs text-foreground sm:px-6 sm:text-sm xl:px-8">
            <span className="font-semibold">Launch Free trial</span>
            {" Â· "}
            {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"} left.{" "}
            <Link
              href="/dashboard/settings#platform-billing"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Upgrade anytime
            </Link>
            .
          </div>
        ) : null}

        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-14px_38px_rgba(60,31,66,0.09)] backdrop-blur-xl xl:hidden"
        aria-label="Mobile dashboard navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobilePrimaryItems.map((item) => {
            const active = routeIsActive(location, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/[0.55] hover:text-foreground"
                }`}
              >
                <Icon className="h-[19px] w-[19px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${
              moreOpen
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/[0.55] hover:text-foreground"
            }`}
          >
            <MoreHorizontal className="h-[19px] w-[19px]" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-more-title"
        >
          <button
            type="button"
            aria-label="Close more menu"
            className="absolute inset-0 bg-plum-deep/42 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />

          <section className="absolute inset-x-0 bottom-0 max-h-[84dvh] overflow-y-auto rounded-t-[1.75rem] border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />

            <div className="mx-auto max-w-lg">
              <div className="flex items-start justify-between gap-4 px-1 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    Workspace
                  </p>
                  <h2
                    id="dashboard-more-title"
                    className="mt-1 font-serif text-2xl font-semibold tracking-[-0.02em]"
                  >
                    More tools
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close more menu"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-full border border-border bg-white p-2.5 text-muted-foreground shadow-sm"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {visibleMoreItems.map((item) => {
                  const active = routeIsActive(location, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-24 flex-col justify-between rounded-2xl border p-4 transition-colors ${
                        active
                          ? "border-primary/25 bg-primary/[0.08] text-primary"
                          : "border-border bg-white text-foreground hover:border-primary/20 hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="mt-4 text-sm font-semibold">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    setBrowserUrl(window.location.origin);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-white px-4 text-left text-sm font-semibold"
                >
                  <Globe className="h-5 w-5 text-primary" />
                  Preview storefront
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    openFeedback();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-white px-4 text-left text-sm font-semibold"
                >
                  <MessageSquareText className="h-5 w-5 text-primary" />
                  Share feedback
                </button>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 text-left text-sm font-semibold text-red-700 disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5" />
                  {isLoggingOut ? "Signing outâ€¦" : "Sign out"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <BakeryQuest />

      <InAppBrowserModal
        url={browserUrl}
        title="Sweet Tooth Storefront Preview"
        isOpen={Boolean(browserUrl)}
        onClose={() => setBrowserUrl(null)}
      />
    </div>
  );
}
