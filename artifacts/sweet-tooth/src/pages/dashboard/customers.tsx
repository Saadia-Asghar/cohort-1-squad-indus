import { format } from "date-fns";
import {
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  customFetch,
  getListCustomersQueryKey,
  getListOrdersQueryKey,
  useListCustomers,
  useListOrders,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CircleDollarSign,
  Heart,
  MapPin,
  Search,
  Send,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";
import {
  liveDashboardQuery,
  ORDERS_POLL_MS,
} from "@/lib/dashboard-query";

type CustomerFilter =
  | "all"
  | "regular"
  | "at-risk"
  | "cancelled";

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-3.5 text-sm text-[#241629] outline-none transition placeholder:text-[#a99ca9] focus:border-[#c24f7a]/60 focus:ring-4 focus:ring-[#c24f7a]/10";

function safeDate(value?: string | null): string {
  if (!value) {
    return "No order recorded";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "No order recorded";
  }

  return format(parsed, "dd MMM yyyy");
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CU"
  );
}

export default function DashboardCustomers() {
  const { bakerId } = useBuyerSession();

  const { data: customers, isLoading } =
    useListCustomers(
      { bakerId },
      {
        query: {
          enabled: Boolean(bakerId),
          queryKey: getListCustomersQueryKey({
            bakerId,
          }),
          ...liveDashboardQuery(ORDERS_POLL_MS),
        },
      },
    );

  const { data: orders } = useListOrders(
    { bakerId },
    {
      query: {
        enabled: Boolean(bakerId),
        queryKey: getListOrdersQueryKey({
          bakerId,
        }),
        ...liveDashboardQuery(ORDERS_POLL_MS),
      },
    },
  );

  const [filter, setFilter] =
    useState<CustomerFilter>("all");

  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<
    number[]
  >([]);

  const [message, setMessage] = useState(
    "Assalam-o-Alaikum {{name}}! We have a special offer for you from our bakery. Reply here to order or ask for today's menu.",
  );

  const [composerOpen, setComposerOpen] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [sendResult, setSendResult] = useState<
    string | null
  >(null);

  const allCustomers = customers ?? [];

  const regularCustomers = allCustomers.filter(
    (customer) => customer.isRegular,
  );

  const atRiskCustomers = allCustomers.filter(
    (customer) => customer.isAtRisk,
  );

  const totalSpent = allCustomers.reduce(
    (sum, customer) =>
      sum + customer.totalSpentPkr,
    0,
  );

  const totalOrders = allCustomers.reduce(
    (sum, customer) =>
      sum + customer.totalOrders,
    0,
  );

  const cancelledByCustomer = useMemo(() => {
    const counts = new Map<number, number>();

    for (const order of orders ?? []) {
      if (
        order.status === "cancelled" &&
        order.cancelledBy === "customer" &&
        order.buyerId
      ) {
        counts.set(
          order.buyerId,
          (counts.get(order.buyerId) ?? 0) + 1,
        );
      }
    }

    return counts;
  }, [orders]);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allCustomers.filter((customer) => {
      const matchesSearch = [
        customer.name,
        customer.whatsappNumber,
        customer.preferredArea,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "regular") {
        return customer.isRegular;
      }

      if (filter === "at-risk") {
        return customer.isAtRisk;
      }

      if (filter === "cancelled") {
        return cancelledByCustomer.has(
          customer.id,
        );
      }

      return true;
    });
  }, [
    allCustomers,
    cancelledByCustomer,
    filter,
    search,
  ]);

  const visibleIds = visibleCustomers.map(
    (customer) => customer.id,
  );

  const everyVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) =>
      selectedIds.includes(id),
    );

  const toggleCustomer = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const selectVisible = () => {
    setSelectedIds((current) => {
      if (everyVisibleSelected) {
        return current.filter(
          (id) => !visibleIds.includes(id),
        );
      }

      return [
        ...new Set([...current, ...visibleIds]),
      ];
    });
  };

  const openComposer = () => {
    setSendResult(null);
    setComposerOpen(true);
  };

  const sendOffer = async () => {
    if (
      !bakerId ||
      selectedIds.length === 0 ||
      message.trim().length < 5
    ) {
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const result = await customFetch<{
        sent: number;
        failed: number;
        targeted: number;
      }>(`/api/bakers/${bakerId}/broadcast`, {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({
          message: message.trim(),
          customerIds: selectedIds,
          limit: selectedIds.length,
        }),
      });

      setSendResult(
        `Sent to ${result.sent} of ${result.targeted} selected customers${
          result.failed
            ? ` (${result.failed} failed)`
            : ""
        }.`,
      );
    } catch (cause) {
      setSendResult(
        cause instanceof Error
          ? cause.message.replace(
              /^HTTP \d+\s*[^:]*:\s*/,
              "",
            )
          : "Message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  };

  const customerGroups = [
    {
      id: "all" as const,
      label: "All customers",
      count: allCustomers.length,
    },
    {
      id: "regular" as const,
      label: "Regulars",
      count: regularCustomers.length,
    },
    {
      id: "at-risk" as const,
      label: "At risk",
      count: atRiskCustomers.length,
    },
    {
      id: "cancelled" as const,
      label: "Cancelled before",
      count: cancelledByCustomer.size,
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c24f7a]">
                Customer relationships
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Customers
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746876]">
                Understand loyal buyers, notice customers
                at risk and send relevant personalized
                offers without losing the human touch.
              </p>
            </div>

            <button
              type="button"
              onClick={openComposer}
              disabled={selectedIds.length === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(47,24,55,0.12)] transition hover:bg-[#542261] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />

              Message selected
              {selectedIds.length > 0
                ? ` (${selectedIds.length})`
                : ""}
            </button>
          </header>

          <section className="grid border-b border-[#dfd1c4] sm:grid-cols-2 xl:grid-cols-4">
            <CustomerMetric
              icon={Users}
              label="Total customers"
              value={allCustomers.length
                .toString()
                .padStart(2, "0")}
            />

            <CustomerMetric
              icon={Heart}
              label="Regular customers"
              value={regularCustomers.length
                .toString()
                .padStart(2, "0")}
              valueClass="text-[#c24f7a]"
            />

            <CustomerMetric
              icon={AlertTriangle}
              label="At risk"
              value={atRiskCustomers.length
                .toString()
                .padStart(2, "0")}
              valueClass={
                atRiskCustomers.length > 0
                  ? "text-[#b86a24]"
                  : ""
              }
            />

            <CustomerMetric
              icon={CircleDollarSign}
              label="Lifetime value"
              value={`PKR ${totalSpent.toLocaleString()}`}
              valueClass="text-[#168a55]"
            />
          </section>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <main className="min-w-0">
              <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                <div className="border-b border-[#dfd1c4] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative min-w-0 flex-1 lg:max-w-md">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8d9c]" />

                      <input
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        placeholder="Search name, phone number or area"
                        className={`${inputClass} pl-10`}
                      />
                    </div>

                    <p className="text-xs text-[#746876]">
                      Showing{" "}
                      <strong className="text-[#241629]">
                        {visibleCustomers.length}
                      </strong>{" "}
                      of {allCustomers.length} customers
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {customerGroups.map((group) => {
                      const active =
                        filter === group.id;

                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() =>
                            setFilter(group.id)
                          }
                          aria-pressed={active}
                          className={`min-h-9 shrink-0 rounded-lg px-3.5 text-xs font-semibold transition ${
                            active
                              ? "bg-[#632a73] text-white"
                              : "border border-[#dfd1c4] bg-[#fffaf6] text-[#746876] hover:text-[#241629]"
                          }`}
                        >
                          {group.label} · {group.count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-[#dfd1c4] bg-[#fffaf6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={selectVisible}
                    disabled={
                      visibleCustomers.length === 0
                    }
                    className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-[#c24f7a] disabled:opacity-40"
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-md border ${
                        everyVisibleSelected
                          ? "border-[#632a73] bg-[#632a73] text-white"
                          : "border-[#cdbfc8] bg-white"
                      }`}
                    >
                      {everyVisibleSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </span>

                    {everyVisibleSelected
                      ? "Clear shown customers"
                      : "Select all shown"}
                  </button>

                  <p className="text-xs text-[#746876]">
                    {selectedIds.length} selected
                  </p>
                </div>

                {isLoading && !customers ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="h-28 animate-pulse rounded-2xl bg-[#f1e9e2]"
                      />
                    ))}
                  </div>
                ) : visibleCustomers.length > 0 ? (
                  <div className="divide-y divide-[#eadfd5]">
                    {visibleCustomers.map(
                      (customer) => (
                        <CustomerRecord
                          key={customer.id}
                          customer={customer}
                          selected={selectedIds.includes(
                            customer.id,
                          )}
                          onToggle={() =>
                            toggleCustomer(customer.id)
                          }
                          cancellationCount={
                            cancelledByCustomer.get(
                              customer.id,
                            ) ?? 0
                          }
                        />
                      ),
                    )}
                  </div>
                ) : (
                  <div className="grid min-h-[380px] place-items-center p-6 text-center">
                    <div>
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                        <UserRound className="h-6 w-6" />
                      </span>

                      <h2 className="mt-4 font-serif text-2xl font-semibold">
                        No matching customers
                      </h2>

                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#746876]">
                        Change the search or customer
                        group to view another segment.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                        }}
                        className="mt-5 min-h-11 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </main>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
                <h2 className="font-serif text-xl font-semibold">
                  Customer health
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#746876]">
                  A quick view of the relationships behind
                  your order activity.
                </p>

                <div className="mt-5 space-y-4">
                  <HealthRow
                    label="Total orders"
                    value={totalOrders}
                  />

                  <HealthRow
                    label="Regular customers"
                    value={regularCustomers.length}
                  />

                  <HealthRow
                    label="Customers at risk"
                    value={atRiskCustomers.length}
                    warning={
                      atRiskCustomers.length > 0
                    }
                  />

                  <HealthRow
                    label="Customer cancellations"
                    value={Array.from(
                      cancelledByCustomer.values(),
                    ).reduce(
                      (sum, count) => sum + count,
                      0,
                    )}
                    warning={
                      cancelledByCustomer.size > 0
                    }
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5cfd9] bg-[#fff0f5] p-4">
                <Sparkles className="h-5 w-5 text-[#c24f7a]" />

                <h2 className="mt-3 font-serif text-xl font-semibold">
                  Relevant outreach
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#746876]">
                  Select a meaningful customer segment
                  before sending an offer. Avoid sending
                  the same promotion to everyone.
                </p>

                <button
                  type="button"
                  onClick={openComposer}
                  disabled={selectedIds.length === 0}
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dcb8c8] bg-white/55 text-xs font-semibold text-[#632a73] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  Compose message
                </button>
              </section>

              <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
                <h2 className="font-serif text-xl font-semibold">
                  Customer groups
                </h2>

                <div className="mt-4 space-y-3">
                  {customerGroups
                    .filter(
                      (group) => group.id !== "all",
                    )
                    .map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() =>
                          setFilter(group.id)
                        }
                        className="flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left transition hover:bg-[#fffaf6]"
                      >
                        <span className="text-xs font-semibold">
                          {group.label}
                        </span>

                        <span className="rounded-lg bg-[#f1e9e2] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#632a73]">
                          {group.count
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </button>
                    ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {composerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241629]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-title"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#dfd1c4] bg-[#fbf6ee] text-[#241629] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#dfd1c4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c24f7a]">
                  Personalized outreach
                </p>

                <h2
                  id="offer-title"
                  className="mt-2 font-serif text-3xl font-semibold"
                >
                  Message {selectedIds.length}{" "}
                  {selectedIds.length === 1
                    ? "customer"
                    : "customers"}
                </h2>

                <p className="mt-2 text-sm text-[#746876]">
                  Each selected customer receives their
                  own personalized message.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setComposerOpen(false)
                }
                aria-label="Close message composer"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-[#e5cfd9] bg-[#fff0f5] px-4 py-3 text-xs leading-5 text-[#746876]">
                Use{" "}
                <code className="rounded-md bg-white px-1.5 py-1 font-mono font-semibold text-[#632a73]">
                  {"{{name}}"}
                </code>{" "}
                to insert each customer&apos;s name
                automatically.
              </div>

              <label className="mt-5 grid gap-2">
                <span className="text-sm font-semibold">
                  WhatsApp message
                </span>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  rows={7}
                  maxLength={900}
                  className="w-full resize-none rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4 text-sm leading-6 outline-none transition focus:border-[#c24f7a]/60 focus:ring-4 focus:ring-[#c24f7a]/10"
                />
              </label>

              <div className="mt-2 flex flex-col gap-1 text-[10px] text-[#746876] sm:flex-row sm:justify-between">
                <span>
                  WhatsApp Business connection required
                </span>

                <span>{message.length}/900</span>
              </div>

              {sendResult ? (
                <p
                  role="status"
                  className="mt-4 rounded-xl border border-[#dfd1c4] bg-[#f1e9e2] px-4 py-3 text-sm"
                >
                  {sendResult}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dfd1c4] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setComposerOpen(false)
                }
                className="min-h-11 rounded-xl border border-[#dfd1c4] bg-white/55 px-5 text-sm font-semibold"
              >
                Close
              </button>

              <button
                type="button"
                disabled={
                  sending ||
                  selectedIds.length === 0 ||
                  message.trim().length < 5
                }
                onClick={sendOffer}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />

                {sending
                  ? "Sending messages…"
                  : "Send personalized offer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function CustomerMetric({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border-[#dfd1c4] px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-[#746876]">
        <Icon className="h-5 w-5 text-[#c24f7a]" />

        <span className="text-[11px] font-medium">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 whitespace-nowrap font-mono text-2xl font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function CustomerRecord({
  customer,
  selected,
  onToggle,
  cancellationCount,
}: {
  customer: {
    id: number;
    name: string;
    whatsappNumber: string;
    preferredArea?: string | null;
    totalSpentPkr: number;
    totalOrders: number;
    lastOrderAt?: string | null;
    isRegular?: boolean;
    isAtRisk?: boolean;
  };
  selected: boolean;
  onToggle: () => void;
  cancellationCount: number;
}) {
  return (
    <article
      className={`grid gap-4 px-4 py-4 transition sm:px-5 lg:grid-cols-[40px_minmax(0,1.35fr)_minmax(170px,0.75fr)_minmax(145px,0.55fr)] lg:items-center ${
        selected
          ? "bg-[#fff0f5]"
          : "hover:bg-[#fff8f3]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${
          selected ? "Deselect" : "Select"
        } ${customer.name}`}
        aria-pressed={selected}
        className={`grid h-8 w-8 place-items-center rounded-xl border transition ${
          selected
            ? "border-[#632a73] bg-[#632a73] text-white"
            : "border-[#dfd1c4] bg-[#fffaf6] text-transparent"
        }`}
      >
        <Check className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f1dde5] text-xs font-bold text-[#632a73]">
          {initials(customer.name)}
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-serif text-lg font-semibold">
              {customer.name}
            </span>

            {customer.isRegular ||
            customer.totalOrders >= 2 ? (
              <span className="rounded-lg bg-[#e4f3e8] px-2 py-1 text-[9px] font-semibold text-[#168a55]">
                Regular
              </span>
            ) : null}

            {customer.isAtRisk ? (
              <span className="rounded-lg bg-[#fff0dd] px-2 py-1 text-[9px] font-semibold text-[#b86a24]">
                At risk
              </span>
            ) : null}

            {cancellationCount > 0 ? (
              <span className="rounded-lg bg-[#f8dddd] px-2 py-1 text-[9px] font-semibold text-[#a7313b]">
                {cancellationCount} cancellation
                {cancellationCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </span>

          <span className="mt-1 block truncate text-xs text-[#746876]">
            {customer.whatsappNumber}
          </span>
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#fffaf6] p-3 lg:grid-cols-1 lg:bg-transparent lg:p-0">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
            <MapPin className="h-3 w-3" />
            Area
          </p>

          <p className="mt-1 truncate text-xs font-semibold">
            {customer.preferredArea ||
              "Not recorded"}
          </p>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
            <CalendarDays className="h-3 w-3" />
            Last order
          </p>

          <p className="mt-1 truncate text-xs font-semibold">
            {safeDate(customer.lastOrderAt)}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 lg:block lg:text-right">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
            Lifetime spend
          </p>

          <p className="mt-1 font-mono text-sm font-semibold text-[#632a73]">
            PKR{" "}
            {customer.totalSpentPkr.toLocaleString()}
          </p>
        </div>

        <p className="text-xs text-[#746876] lg:mt-1">
          {customer.totalOrders}{" "}
          {customer.totalOrders === 1
            ? "order"
            : "orders"}
        </p>
      </div>
    </article>
  );
}

function HealthRow({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[#746876]">
        {label}
      </span>

      <span
        className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold ${
          warning
            ? "bg-[#fff0dd] text-[#b86a24]"
            : "bg-[#f1e9e2] text-[#632a73]"
        }`}
      >
        {value.toString().padStart(2, "0")}
      </span>
    </div>
  );
}