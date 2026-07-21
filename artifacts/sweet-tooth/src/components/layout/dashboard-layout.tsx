import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useClerk } from "@clerk/react";
import { useGetBaker } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { NotificationBell } from "@/components/notification-bell";
import { InAppBrowserModal } from "@/components/ui/in-app-browser";
import {
  LayoutDashboard, ShoppingBag, Grid, DollarSign,
  BarChart3, Users, Calendar, Settings, LogOut, Bot, Globe,
} from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const { signOut } = useClerk();
  const { bakerId } = useBuyerSession();
  const { data: baker } = useGetBaker(bakerId, { query: { enabled: !!bakerId, queryKey: ["baker", bakerId] } });

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
    { href: "/dashboard/catalog", label: "Catalog", icon: Grid },
    { href: "/dashboard/payments", label: "Payments", icon: DollarSign },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/agent-hub", label: "Agent Hub", icon: Bot },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    localStorage.removeItem("bakerId");
    navigate("/dashboard/login");
    setIsLoggingOut(false);
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
          <button
            onClick={() => setBrowserUrl(window.location.origin)}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            In-App Storefront Browser
          </button>
          <button onClick={handleLogout} disabled={isLoggingOut} className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
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
