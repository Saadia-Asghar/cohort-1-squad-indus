import { Link } from "wouter";
import { NotificationBell } from "@/components/notification-bell";
import { bakerMenuHref } from "@/components/layout/guest-menu-shell";
import { useBuyerSession } from "@/hooks/use-session";
import {
  getGetBakerQueryKey,
  getGetBakerStatsQueryKey,
  getListOrdersQueryKey,
  useGetBaker,
  useGetBakerStats,
  useListOrders,
  type Order,
} from "@workspace/api-client-react";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import { format } from "date-fns";
import { useMemo, type ComponentType } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CreditCard,
  DollarSign,
  ExternalLink,
  MessageSquareText,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

function greetingHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(value?: string | null): string {
  const name = value?.trim().split(/\s+/).filter(Boolean)[0];
  return name || "baker";
}

function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString()}`;
}

function dateKey(value?: string | Date | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, "yyyy-MM-dd");
}

function isSameDayKey(value: string | Date | null | undefined, day: Date): boolean {
  return dateKey(value) === format(day, "yyyy-MM-dd");
}

function orderSummary(order: Order): string {
  const items = order.items
    ?.map((item) => `${item.productName} × ${item.quantity}`)
    .filter(Boolean)
    .join(", ");
  return items || "Custom bakery order";
}

function formatDelivery(order: Order): string {
  if (!order.deliveryDate) {
    return order.fulfillmentType === "pickup" ? "Pickup date not set" : "Date not set";
  }
  const parsed = new Date(order.deliveryDate);
  if (Number.isNaN(parsed.getTime())) return "Date not set";
  const when = format(parsed, "dd MMM yyyy");
  return order.fulfillmentType === "pickup" ? `Pickup · ${when}` : when;
}

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusTone(status: string): string {
  switch (status) {
    case "new":
      return "bg-[#fde7ef] text-[#9b2c5a]";
    case "confirmed":
      return "bg-[#f7edcf] text-[#8b641e]";
    case "in_production":
      return "bg-[#efe1f3] text-primary";
    case "out_for_delivery":
      return "bg-[#e2f3f1] text-[#19736e]";
    case "delivered":
      return "bg-[#e4f3e8] text-[#168a55]";
    case "cancelled":
      return "bg-[#f8dddd] text-[#a7313b]";
    default:
      return "bg-[#eee8ee] text-muted-foreground";
  }
}

function paymentLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Unpaid";
    case "partial":
      return "Partially paid";
    default:
      return statusLabel(status);
  }
}

function paymentTone(status: string): string {
  switch (status) {
    case "paid":
      return "bg-[#e4f3e8] text-[#168a55]";
    case "pending":
      return "bg-[#fae5d8] text-[#b86a24]";
    case "partial":
      return "bg-[#f7edcf] text-[#8b641e]";
    default:
      return "bg-[#eee8ee] text-muted-foreground";
  }
}

function productionTime(order: Order): string {
  if (!order.deliveryDate) return "Anytime";
  const parsed = new Date(order.deliveryDate);
  if (Number.isNaN(parsed.getTime())) return "Anytime";
  if (parsed.getHours() === 0 && parsed.getMinutes() === 0) return "Today";
  return format(parsed, "h:mm a");
}

export function ApprovedHomePreview() {
  const { bakerId } = useBuyerSession();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const { data: baker } = useGetBaker(bakerId, {
    query: {
      enabled: Boolean(bakerId),
      queryKey: getGetBakerQueryKey(bakerId),
    },
  });

  const { data: stats } = useGetBakerStats(bakerId, {
    query: {
      enabled: Boolean(bakerId),
      queryKey: getGetBakerStatsQueryKey(bakerId),
      ...liveDashboardQuery(ORDERS_POLL_MS),
    },
  });

  const { data: orders } = useListOrders(
    { bakerId },
    {
      query: {
        enabled: Boolean(bakerId),
        queryKey: getListOrdersQueryKey({ bakerId }),
        ...liveDashboardQuery(ORDERS_POLL_MS),
      },
    },
  );

  const allOrders = orders ?? [];

  const attentionItems = useMemo(() => {
    const items: Array<{
      title: string;
      detail: string;
      action: string;
      href: string;
      icon: IconType;
    }> = [];

    const newOrders = allOrders.filter((order) => order.status === "new").length;
    const paymentProofs = allOrders.filter(
      (order) => order.paymentStatus !== "paid" && Boolean(order.paymentScreenshotUrl),
    ).length;
    const unpaid = allOrders.filter(
      (order) => order.status !== "cancelled" && order.paymentStatus === "pending",
    ).length;
    const missingInfo = allOrders.filter(
      (order) =>
        order.status !== "cancelled" &&
        order.status !== "delivered" &&
        (!order.deliveryDate || !order.buyerAddress),
    ).length;
    const behind = allOrders.filter(
      (order) =>
        ["confirmed", "in_production"].includes(order.status) &&
        order.deliveryDate != null &&
        dateKey(order.deliveryDate) != null &&
        dateKey(order.deliveryDate)! < format(today, "yyyy-MM-dd"),
    ).length;

    if (newOrders > 0) {
      items.push({
        title: "New orders",
        detail: `${newOrders} order${newOrders === 1 ? "" : "s"} awaiting confirmation`,
        action: "Review",
        href: "/dashboard/orders",
        icon: ShoppingBag,
      });
    }
    if (paymentProofs > 0) {
      items.push({
        title: "Payments to review",
        detail: `${paymentProofs} payment proof${paymentProofs === 1 ? "" : "s"} to verify`,
        action: "Review",
        href: "/dashboard/payments",
        icon: CreditCard,
      });
    } else if (unpaid > 0) {
      items.push({
        title: "Unpaid orders",
        detail: `${unpaid} order${unpaid === 1 ? "" : "s"} still unpaid`,
        action: "Review",
        href: "/dashboard/payments",
        icon: CreditCard,
      });
    }
    if (missingInfo > 0) {
      items.push({
        title: "Orders missing information",
        detail: `${missingInfo} order${missingInfo === 1 ? "" : "s"} missing delivery details`,
        action: "Open",
        href: "/dashboard/orders",
        icon: PackageCheck,
      });
    }
    if (behind > 0) {
      items.push({
        title: "Production updates",
        detail: `${behind} order${behind === 1 ? "" : "s"} past the delivery date`,
        action: "Update",
        href: "/dashboard/orders",
        icon: CalendarDays,
      });
    }

    return items;
  }, [allOrders, today]);

  const productionItems = useMemo(
    () =>
      allOrders
        .filter(
          (order) =>
            order.status !== "cancelled" &&
            order.status !== "delivered" &&
            (isSameDayKey(order.deliveryDate, today) ||
              ["in_production", "confirmed", "out_for_delivery"].includes(order.status)),
        )
        .slice(0, 6),
    [allOrders, today],
  );

  const recentOrders = useMemo(
    () =>
      [...allOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [allOrders],
  );

  const dueTomorrow = allOrders.filter((order) => isSameDayKey(order.deliveryDate, tomorrow)).length;
  const todayOrders = allOrders.filter(
    (order) =>
      order.status !== "cancelled" &&
      (isSameDayKey(order.deliveryDate, today) || isSameDayKey(order.createdAt, today)),
  );
  const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.totalPkr ?? 0), 0);
  const outstandingPkr = allOrders
    .filter((order) => order.status !== "cancelled" && order.paymentStatus !== "paid")
    .reduce((sum, order) => sum + Math.max(0, (order.totalPkr ?? 0) - (order.paymentAmountReceived ?? 0)), 0);
  const ownerName = firstName(baker?.ownerName);
  const attentionCount = attentionItems.length;
  const subtitle =
    allOrders.length === 0
      ? "Your workspace is empty. Add products and share your menu to start taking real orders."
      : attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need your attention today.`
        : "You are all caught up.";

  return (
    <div className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-6 xl:px-5">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_264px]">
          <main className="min-w-0">
            <header className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {format(today, "EEEE, d MMMM")}
                </p>

                <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[3.35rem]">
                  {greetingHour()}, {ownerName}.
                </h1>

                <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                  {subtitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {bakerId ? (
                  <>
                    <a
                      href={bakerMenuHref(bakerId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(47,24,55,0.05)] transition hover:-translate-y-0.5"
                    >
                      Open menu
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(bakerMenuHref(bakerId));
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white/65 px-4 text-sm font-semibold"
                    >
                      Copy link
                    </button>
                  </>
                ) : null}

                {bakerId ? (
                  <div className="hidden rounded-xl border border-border bg-white/65 shadow-[0_8px_24px_rgba(47,24,55,0.05)] xl:block">
                    <NotificationBell bakerId={bakerId} />
                  </div>
                ) : null}
              </div>
            </header>

            <section className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-5">
              <Metric
                label="Orders today"
                value={String(todayOrders.length).padStart(2, "0")}
                action="View orders"
                href="/dashboard/orders"
                icon={ShoppingBag}
              />

              <Metric
                label="Revenue today"
                value={formatPkr(todayRevenue)}
                action="View report"
                href="/dashboard/analytics"
                icon={DollarSign}
              />

              <Metric
                label="Due tomorrow"
                value={String(dueTomorrow).padStart(2, "0")}
                action="See schedule"
                href="/dashboard/calendar"
                icon={CalendarDays}
              />

              <Metric
                label="Outstanding"
                value={formatPkr(outstandingPkr)}
                action="Review payments"
                href="/dashboard/payments"
                icon={CreditCard}
              />

              <Metric
                label="Assistant status"
                value={stats?.agentActive || baker?.agentActive ? "Live" : "Off"}
                action="Test assistant"
                href="/dashboard/agent-hub"
                icon={Sparkles}
                valueClass={stats?.agentActive || baker?.agentActive ? "text-[#168a55]" : ""}
              />
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-border bg-white/45">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
                  <h2 className="font-serif text-xl font-semibold">
                    Needs your attention
                  </h2>

                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-white">
                    {attentionCount}
                  </span>
                </div>

                {attentionItems.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-muted-foreground">
                    Nothing needs attention yet. New orders and unpaid receipts will show up here.
                  </p>
                ) : (
                  <div className="divide-y divide-[#eadfd5]">
                    {attentionItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className="group flex min-h-[57px] items-center gap-3 px-4 py-3 transition hover:bg-[#fff8f3]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-secondary">
                            <Icon className="h-4 w-4" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">
                              {item.title}
                            </span>

                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {item.detail}
                            </span>
                          </span>

                          <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
                            {item.action}
                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-border bg-white/45">
                <div className="border-b border-border px-4 py-3.5">
                  <h2 className="font-serif text-xl font-semibold">
                    Today&apos;s production
                  </h2>
                </div>

                {productionItems.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-muted-foreground">
                    No bakes scheduled yet. Orders you confirm will appear on today&apos;s list.
                  </p>
                ) : (
                  <div className="divide-y divide-[#eadfd5]">
                    {productionItems.map((item) => (
                      <Link
                        key={item.id}
                        href="/dashboard/orders"
                        className="grid min-h-[57px] grid-cols-[72px_10px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-[#fff8f3]"
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {productionTime(item)}
                        </span>

                        <span className="h-2 w-2 rounded-full bg-primary" />

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {orderSummary(item)}
                          </span>

                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {item.buyerName}
                          </span>
                        </span>

                        <span
                          className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold ${statusTone(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-white/45">
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <h2 className="font-serif text-xl font-semibold">
                  Recent orders
                </h2>

                <Link
                  href="/dashboard/orders"
                  className="flex items-center gap-1 text-xs font-semibold text-secondary"
                >
                  View all orders
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground">
                  No orders yet. Add a product, share your menu, or create an order to see real activity here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="border-b border-border text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Delivery</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#eadfd5]">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#fff8f3]">
                          <td className="px-4 py-3 font-mono font-semibold">
                            #{order.id}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {order.buyerName}
                          </td>

                          <td className="max-w-[170px] truncate px-4 py-3">
                            {orderSummary(order)}
                          </td>

                          <td className="px-4 py-3">{formatDelivery(order)}</td>

                          <td className="px-4 py-3 font-mono font-semibold">
                            {formatPkr(order.totalPkr)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-semibold ${paymentTone(order.paymentStatus)}`}
                            >
                              {paymentLabel(order.paymentStatus)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusTone(order.status)}`}
                            >
                              {statusLabel(order.status)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Link
                              href="/dashboard/orders"
                              className="font-semibold text-secondary"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-white/45 p-4">
              <h2 className="font-serif text-lg font-semibold">
                Quick actions
              </h2>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <QuickAction
                  href="/dashboard/catalog"
                  label="Add product"
                  icon={Plus}
                />

                <QuickAction
                  href="/dashboard/orders"
                  label="Create order"
                  icon={PackageCheck}
                />

                <QuickAction
                  href="/dashboard/calendar"
                  label="Open schedule"
                  icon={CalendarDays}
                />

                <QuickAction
                  href="/dashboard/customers"
                  label="Send message"
                  icon={MessageSquareText}
                />

                <QuickAction
                  href="/dashboard/agent-hub"
                  label="Test assistant"
                  icon={Bot}
                />

                <QuickAction
                  href="/dashboard/payments"
                  label="Payments"
                  icon={CreditCard}
                />

                <QuickAction
                  href="/dashboard/analytics"
                  label="Analytics"
                  icon={BarChart3}
                />

                <QuickAction
                  href={bakerId ? bakerMenuHref(bakerId) : "/dashboard"}
                  label="Menu"
                  icon={Store}
                  external={Boolean(bakerId)}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  action,
  href,
  icon: Icon,
  valueClass = "",
}: {
  label: string;
  value: string;
  action: string;
  href: string;
  icon: IconType;
  valueClass?: string;
}) {
  return (
    <div className="border-border px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-5 w-5 text-secondary" />

        <span className="whitespace-nowrap text-[10px] font-medium">{label}</span>
      </div>

      <p
        className={`mt-2 whitespace-nowrap text-2xl font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>

      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-secondary"
      >
        {action}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  external,
}: {
  href: string;
  label: string;
  icon: IconType;
  external?: boolean;
}) {
  const className =
    "group flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-border bg-card px-1.5 text-center transition hover:border-[#c24f7a]/35 hover:bg-white";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon className="h-4 w-4 text-secondary" />
        <span className="mt-2 text-[9px] font-semibold leading-tight">{label}</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <Icon className="h-4 w-4 text-secondary" />
      <span className="mt-2 text-[9px] font-semibold leading-tight">{label}</span>
    </Link>
  );
}
