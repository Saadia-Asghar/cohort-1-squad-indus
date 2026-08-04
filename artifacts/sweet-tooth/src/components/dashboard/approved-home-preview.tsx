import { Link } from "wouter";
import { NotificationBell } from "@/components/notification-bell";
import { useBuyerSession } from "@/hooks/use-session";
import type { ComponentType } from "react";
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
  Users,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

const attentionItems = [
  {
    title: "New orders",
    detail: "3 orders awaiting confirmation",
    action: "Review",
    href: "/dashboard/orders",
    icon: ShoppingBag,
  },
  {
    title: "Payments to review",
    detail: "2 payment proofs to verify",
    action: "Review",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
  {
    title: "Orders missing information",
    detail: "1 order missing delivery details",
    action: "Open",
    href: "/dashboard/orders",
    icon: PackageCheck,
  },
  {
    title: "Production updates",
    detail: "1 order running behind schedule",
    action: "Update",
    href: "/dashboard/orders",
    icon: CalendarDays,
  },
  {
    title: "Assistant escalations",
    detail: "1 conversation needs your help",
    action: "View",
    href: "/dashboard/agent-hub",
    icon: Bot,
  },
];

const productionItems = [
  {
    time: "9:00 AM",
    product: "Red Velvet Cake",
    customer: "Ayesha Khan",
    status: "In production",
    tone: "bg-[#efe1f3] text-[#632a73]",
  },
  {
    time: "11:30 AM",
    product: "Chocolate Cupcakes",
    customer: "Ali Raza",
    status: "In preparation",
    tone: "bg-[#f7e3ea] text-[#a23e68]",
  },
  {
    time: "2:00 PM",
    product: "Vanilla Cake",
    customer: "Fatima Ali",
    status: "Ready",
    tone: "bg-[#e4f3e8] text-[#168a55]",
  },
  {
    time: "5:00 PM",
    product: "Brownie Box",
    customer: "Hassan & Family",
    status: "Out for delivery",
    tone: "bg-[#e2f3f1] text-[#19736e]",
  },
];

const recentOrders = [
  {
    id: "#1024",
    customer: "Ayesha Khan",
    item: "Red Velvet Cake (1kg)",
    delivery: "Today, 5:00 PM",
    total: "PKR 2,900",
    payment: "Paid",
    paymentTone: "bg-[#e4f3e8] text-[#168a55]",
    status: "In production",
    statusTone: "bg-[#efe1f3] text-[#632a73]",
    action: "View",
  },
  {
    id: "#1023",
    customer: "Ali Raza",
    item: "Chocolate Cupcakes (6)",
    delivery: "Today, 11:30 AM",
    total: "PKR 1,350",
    payment: "Unpaid",
    paymentTone: "bg-[#fae5d8] text-[#b86a24]",
    status: "New",
    statusTone: "bg-[#fde7ef] text-[#9b2c5a]",
    action: "Review",
  },
  {
    id: "#1022",
    customer: "Hassan & Family",
    item: "Brownie Box (12)",
    delivery: "Today, 5:00 PM",
    total: "PKR 1,800",
    payment: "Paid",
    paymentTone: "bg-[#e4f3e8] text-[#168a55]",
    status: "Out for delivery",
    statusTone: "bg-[#e2f3f1] text-[#19736e]",
    action: "View",
  },
  {
    id: "#1021",
    customer: "Fatima Ali",
    item: "Vanilla Cake (1.5kg)",
    delivery: "Today, 2:00 PM",
    total: "PKR 2,200",
    payment: "Partially paid",
    paymentTone: "bg-[#f7edcf] text-[#8b641e]",
    status: "Ready",
    statusTone: "bg-[#e4f3e8] text-[#168a55]",
    action: "Update",
  },
];

export function ApprovedHomePreview() {
  const { bakerId } = useBuyerSession();

  return (
    <div className="min-h-screen bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-6 xl:px-5">
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_264px]">
          <main className="min-w-0">
            <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium text-[#746876]">
                  Monday, 3 August
                </p>

                <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[3.35rem]">
                  Good morning, Sana.
                </h1>

                <p className="mt-3 text-sm text-[#746876] sm:text-base">
                  Two orders and one payment need your attention today.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/bakers"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfd1c4] bg-white/65 px-4 text-sm font-semibold shadow-[0_8px_24px_rgba(47,24,55,0.05)] transition hover:-translate-y-0.5"
                >
                  Preview storefront
                  <ExternalLink className="h-4 w-4" />
                </Link>

                {bakerId ? (
                  <div className="hidden rounded-xl border border-[#dfd1c4] bg-white/65 shadow-[0_8px_24px_rgba(47,24,55,0.05)] xl:block">
                    <NotificationBell bakerId={bakerId} />
                  </div>
                ) : null}
              </div>
            </header>

            <section className="grid border-b border-[#dfd1c4] sm:grid-cols-2 lg:grid-cols-5">
              <Metric
                label="Orders today"
                value="04"
                action="View orders"
                href="/dashboard/orders"
                icon={ShoppingBag}
              />

              <Metric
                label="Revenue today"
                value="PKR 18,400"
                action="View report"
                href="/dashboard/analytics"
                icon={DollarSign}
              />

              <Metric
                label="Due tomorrow"
                value="06"
                action="See schedule"
                href="/dashboard/calendar"
                icon={CalendarDays}
              />

              <Metric
                label="Outstanding"
                value="PKR 7,800"
                action="Review payments"
                href="/dashboard/payments"
                icon={CreditCard}
              />

              <Metric
                label="Assistant status"
                value="Live"
                action="Test assistant"
                href="/dashboard/agent-hub"
                icon={Sparkles}
                valueClass="text-[#168a55]"
              />
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                <div className="flex items-center gap-2 border-b border-[#dfd1c4] px-4 py-3.5">
                  <h2 className="font-serif text-xl font-semibold">
                    Needs your attention
                  </h2>

                  <span className="rounded-full bg-[#c24f7a] px-2 py-0.5 text-xs font-bold text-white">
                    5
                  </span>
                </div>

                <div className="divide-y divide-[#eadfd5]">
                  {attentionItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="group flex min-h-[57px] items-center gap-3 px-4 py-3 transition hover:bg-[#fff8f3]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#eadfd5] bg-[#fffaf6] text-[#c24f7a]">
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {item.title}
                          </span>

                          <span className="mt-0.5 block truncate text-xs text-[#746876]">
                            {item.detail}
                          </span>
                        </span>

                        <span className="flex items-center gap-1 text-xs font-semibold text-[#c24f7a]">
                          {item.action}
                          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                <div className="border-b border-[#dfd1c4] px-4 py-3.5">
                  <h2 className="font-serif text-xl font-semibold">
                    Today&apos;s production
                  </h2>
                </div>

                <div className="divide-y divide-[#eadfd5]">
                  {productionItems.map((item) => (
                    <Link
                      key={`${item.time}-${item.product}`}
                      href="/dashboard/orders"
                      className="grid min-h-[57px] grid-cols-[72px_10px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-[#fff8f3]"
                    >
                      <span className="text-xs font-medium text-[#746876]">
                        {item.time}
                      </span>

                      <span className="h-2 w-2 rounded-full bg-[#632a73]" />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.product}
                        </span>

                        <span className="mt-0.5 block truncate text-xs text-[#746876]">
                          {item.customer}
                        </span>
                      </span>

                      <span
                        className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}
                      >
                        {item.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
              <div className="flex items-center justify-between border-b border-[#dfd1c4] px-4 py-3.5">
                <h2 className="font-serif text-xl font-semibold">
                  Recent orders
                </h2>

                <Link
                  href="/dashboard/orders"
                  className="flex items-center gap-1 text-xs font-semibold text-[#c24f7a]"
                >
                  View all orders
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-[#eadfd5] text-[10px] uppercase tracking-[0.08em] text-[#746876]">
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
                          {order.id}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {order.customer}
                        </td>

                        <td className="max-w-[170px] truncate px-4 py-3">
                          {order.item}
                        </td>

                        <td className="px-4 py-3">{order.delivery}</td>

                        <td className="px-4 py-3 font-mono font-semibold">
                          {order.total}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-semibold ${order.paymentTone}`}
                          >
                            {order.payment}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-semibold ${order.statusTone}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Link
                            href="/dashboard/orders"
                            className="font-semibold text-[#c24f7a]"
                          >
                            {order.action}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
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
                  href="/bakers"
                  label="Storefront"
                  icon={Store}
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
    <div className="border-[#dfd1c4] px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-[#746876]">
        <Icon className="h-5 w-5 text-[#c24f7a]" />

        <span className="whitespace-nowrap text-[10px] font-medium">{label}</span>
      </div>

      <p
        className={`mt-2 whitespace-nowrap text-2xl font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>

      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#c24f7a]"
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
}: {
  href: string;
  label: string;
  icon: IconType;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-[#eadfd5] bg-[#fffaf6] px-1.5 text-center transition hover:border-[#c24f7a]/35 hover:bg-white"
    >
      <Icon className="h-4 w-4 text-[#c24f7a]" />

      <span className="mt-2 text-[9px] font-semibold leading-tight">
        {label}
      </span>
    </Link>
  );
}