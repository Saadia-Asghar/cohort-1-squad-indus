import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useGetBaker,
  useGetBakerStats,
  useListOrders,
  useListCustomers,
  useGetAgentConfig,
  getListOrdersQueryKey,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import { useBuyerSession } from "@/hooks/use-session";
import {
  ShoppingBag,
  DollarSign,
  Bot,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

const DashboardWorkspace = lazy(() =>
  import("@/components/dashboard/workspace-panel").then((m) => ({ default: m.DashboardWorkspace })),
);

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function statusStyle(status: string): string {
  if (status === "new") return "bg-blue-100 text-blue-800";
  if (status === "confirmed") return "bg-yellow-100 text-yellow-800";
  if (status === "in_production") return "bg-purple-100 text-purple-800";
  if (status === "out_for_delivery") return "bg-orange-100 text-orange-800";
  if (status === "delivered") return "bg-green-100 text-green-800";
  return "bg-muted text-muted-foreground";
}

export default function DashboardHome() {
  const { bakerId } = useBuyerSession();

  const { data: baker } = useGetBaker(bakerId, {
    query: { enabled: !!bakerId, queryKey: ["baker", bakerId] },
  });

  const { data: stats } = useGetBakerStats(bakerId, {
    query: { enabled: !!bakerId, queryKey: ["baker-stats", bakerId], ...liveDashboardQuery(ORDERS_POLL_MS) },
  });

  const { data: orders } = useListOrders(
    { bakerId },
    {
      query: {
        enabled: !!bakerId,
        queryKey: getListOrdersQueryKey({ bakerId }),
        ...liveDashboardQuery(ORDERS_POLL_MS),
      },
    },
  );

  const { data: customers } = useListCustomers(
    { bakerId },
    {
      query: {
        enabled: !!bakerId,
        queryKey: getListCustomersQueryKey({ bakerId }),
      },
    },
  );

  const { data: agentConfig } = useGetAgentConfig(bakerId, {
    query: { enabled: !!bakerId, queryKey: ["agent-config", bakerId] },
  });

  const atRiskCount = customers?.filter((c) => c.isAtRisk).length ?? 0;
  const regularCount = customers?.filter((c) => c.isRegular).length ?? 0;
  const recentOrders = [...(orders ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const attentionItems = [
    (stats?.pendingOrders ?? 0) > 0
      ? {
          label: `${stats?.pendingOrders} orders need kitchen action`,
          href: "/dashboard/orders",
          tone: "text-blue-700 bg-blue-50 border-blue-200",
        }
      : null,
    (stats?.outstandingPayments ?? 0) > 0
      ? {
          label: `PKR ${stats?.outstandingPayments?.toLocaleString()} awaiting payment confirmation`,
          href: "/dashboard/payments",
          tone: "text-orange-700 bg-orange-50 border-orange-200",
        }
      : null,
    atRiskCount > 0
      ? {
          label: `${atRiskCount} regular${atRiskCount > 1 ? "s" : ""} haven't ordered in 30+ days`,
          href: "/dashboard/customers",
          tone: "text-amber-700 bg-amber-50 border-amber-200",
        }
      : null,
    !agentConfig?.agentActive
      ? {
          label: "Shop assistant is off — buyers won't get auto-replies",
          href: "/dashboard/agent-hub",
          tone: "text-red-700 bg-red-50 border-red-200",
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; tone: string }>;

  const shopUrl = bakerId ? `/bakers/${bakerId}` : "/bakers";

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
            <h1 className="font-serif text-4xl font-bold text-foreground mt-1">
              {greeting()}
              {baker?.ownerName ? `, ${baker.ownerName.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Your command center — orders, payments, and the AI assistant that answers buyers while you bake.
            </p>
          </div>
          <Link
            href={shopUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View public shop
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's orders" value={String(stats?.todayOrders ?? 0)} icon={ShoppingBag} />
          <StatCard
            label="Today's revenue"
            value={`PKR ${(stats?.todayRevenue ?? 0).toLocaleString()}`}
            icon={DollarSign}
            highlight
          />
          <StatCard
            label="This week"
            value={`${stats?.weekOrders ?? 0} orders`}
            sub={`PKR ${(stats?.weekRevenue ?? 0).toLocaleString()}`}
            icon={TrendingUp}
          />
          <StatCard
            label="Agent"
            value={agentConfig?.agentActive !== false && stats?.agentActive ? "Live" : "Paused"}
            sub="WhatsApp assistant"
            icon={Bot}
            valueClass={agentConfig?.agentActive !== false ? "text-green-600" : "text-amber-600"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 space-y-6">
            {attentionItems.length > 0 ? (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="font-serif text-lg font-bold">Needs your attention</h2>
                </div>
                <ul className="space-y-2">
                  {attentionItems.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:opacity-90 ${item.tone}`}
                      >
                        <span>{item.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="rounded-xl border border-green-200 bg-green-50/50 p-5 text-sm text-green-800">
                All caught up — no urgent orders, payments, or agent issues right now.
              </section>
            )}

            <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-serif text-lg font-bold">Recent orders</h2>
                <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No orders yet. Share your shop link or run a test checkout from the marketplace.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentOrders.map((order) => (
                    <li key={order.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/20">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{order.buyerName}</p>
                        <p className="text-xs text-muted-foreground">
                          #{order.id} · {format(new Date(order.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusStyle(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono text-sm font-semibold">PKR {order.totalPkr.toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold">Quick actions</h2>
              <div className="grid gap-2">
                <QuickLink href="/dashboard/agent-hub" icon={Bot} label="Test your AI agent" />
                <QuickLink href="/dashboard/catalog" icon={ShoppingBag} label="Update menu & prices" />
                <QuickLink href="/dashboard/analytics" icon={TrendingUp} label="See sales & forecasts" />
                <QuickLink href="/dashboard/customers" icon={Users} label={`CRM · ${regularCount} regulars`} />
              </div>
            </section>

            {stats?.topProduct && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Best seller</p>
                <p className="font-serif text-lg font-bold mt-1">{stats.topProduct}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.newCustomersThisMonth ?? 0} new buyers this month
                </p>
              </section>
            )}
          </div>
        </div>

        <Suspense fallback={<div className="mt-8 h-48 bg-muted/60 rounded-xl animate-pulse" />}>
          <DashboardWorkspace />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`p-5 rounded-xl border shadow-sm ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueClass ?? (highlight ? "text-primary" : "")}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors"
    >
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}
