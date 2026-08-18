import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  customFetch,
  getListOrdersQueryKey,
  useGetBaker,
  useListOrders,
  useUpdateOrderStatus,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import {
  liveDashboardQuery,
  ORDERS_POLL_MS,
} from "@/lib/dashboard-query";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  MessageCircle,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { exportOrdersPDF } from "@/lib/pdf-export";

const emptyManualOrder = {
  buyerName: "",
  buyerWhatsapp: "",
  buyerAddress: "",
  buyerArea: "",
  productName: "",
  quantity: "1",
  totalPkr: "",
  deliveryDate: "",
  deliveryTimeSlot: "",
  occasion: "",
  specialInstructions: "",
};

const statusFilters = [
  { value: "all", label: "All orders" },
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_production", label: "In production" },
  { value: "out_for_delivery", label: "Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 8) {
    return null;
  }

  const international = digits.startsWith("0")
    ? `92${digits.slice(1)}`
    : digits;

  return `https://wa.me/${international}`;
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

function orderSummary(order: any): string {
  const items = order.items
    ?.map((item: any) => `${item.productName} × ${item.quantity}`)
    .filter(Boolean)
    .join(", ");

  return items || order.productName || "Custom bakery order";
}

function formatDeliveryDate(value?: string | null): string {
  if (!value) {
    return "Date not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not set";
  }

  return format(parsed, "dd MMM yyyy");
}

function dateIsToday(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return format(parsed, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
}

export default function DashboardOrders() {
  const { bakerId } = useBuyerSession();
  const { data: baker } = useGetBaker(bakerId);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListOrders(
    { bakerId },
    {
      query: {
        enabled: Boolean(bakerId),
        queryKey: getListOrdersQueryKey({ bakerId }),
        ...liveDashboardQuery(ORDERS_POLL_MS),
      },
    },
  );

  const updateStatus = useUpdateOrderStatus();

  const [manualOrder, setManualOrder] = useState(emptyManualOrder);
  const [manualError, setManualError] = useState<string | null>(null);
  const [savingManualOrder, setSavingManualOrder] = useState(false);
  const [approvingQuoteId, setApprovingQuoteId] = useState<number | null>(
    null,
  );
  const [checklistOrder, setChecklistOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const allOrders = orders ?? [];

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allOrders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchText = [
        order.id,
        order.buyerName,
        order.buyerWhatsapp,
        order.buyerArea,
        order.status,
        orderSummary(order),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(query);
    });
  }, [allOrders, searchQuery, statusFilter]);

  const orderMetrics = useMemo(
    () => ({
      total: allOrders.length,
      newOrders: allOrders.filter((order) => order.status === "new").length,
      production: allOrders.filter(
        (order) => order.status === "in_production",
      ).length,
      dueToday: allOrders.filter((order) =>
        dateIsToday(order.deliveryDate),
      ).length,
    }),
    [allOrders],
  );

  const handleStatusUpdate = (orderId: number, status: string) => {
    const cancellationReason =
      status === "cancelled"
        ? window
            .prompt(
              "Why was this order cancelled? This appears in analytics.",
            )
            ?.trim()
        : undefined;

    if (status === "cancelled" && cancellationReason === undefined) {
      return;
    }

    updateStatus.mutate(
      {
        orderId,
        data: {
          status,
          ...(status === "cancelled"
            ? {
                cancellationReason,
                cancelledBy: "baker",
              }
            : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListOrdersQueryKey({ bakerId }),
          });
        },
      },
    );
  };

  const openManualOrder = () => {
    setManualOrder(emptyManualOrder);
    setManualError(null);

    (
      document.getElementById(
        "manual-order-dialog",
      ) as HTMLDialogElement | null
    )?.showModal();
  };

  const closeManualOrder = () => {
    (
      document.getElementById(
        "manual-order-dialog",
      ) as HTMLDialogElement | null
    )?.close();
  };

  const updateManualField = (
    key: keyof typeof emptyManualOrder,
    value: string,
  ) => {
    setManualOrder((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitManualOrder = async (event: FormEvent) => {
    event.preventDefault();
    setManualError(null);

    const quantity = Number(manualOrder.quantity);
    const totalPkr = Number(manualOrder.totalPkr);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isInteger(totalPkr) ||
      totalPkr < 0
    ) {
      setManualError(
        "Enter a whole-number quantity and amount in PKR.",
      );
      return;
    }

    setSavingManualOrder(true);

    try {
      await customFetch("/api/orders/manual", {
        method: "POST",
        responseType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...manualOrder,
          quantity,
          totalPkr,
          buyerArea: manualOrder.buyerArea || undefined,
          deliveryDate: manualOrder.deliveryDate || undefined,
          occasion: manualOrder.occasion || undefined,
          specialInstructions:
            manualOrder.specialInstructions || undefined,
        }),
      });

      await queryClient.invalidateQueries({
        queryKey: getListOrdersQueryKey({ bakerId }),
      });

      closeManualOrder();
    } catch (cause) {
      setManualError(
        cause instanceof Error
          ? cause.message
          : "Could not save the order.",
      );
    } finally {
      setSavingManualOrder(false);
    }
  };

  const approveCustomQuote = async (orderId: number) => {
    const enteredAmount = window.prompt(
      "Enter the agreed total in PKR. The customer will be marked as a confirmed order.",
    );

    if (enteredAmount === null) {
      return;
    }

    const totalPkr = Number(enteredAmount);

    if (!Number.isInteger(totalPkr) || totalPkr < 100) {
      window.alert(
        "Enter a whole-number quote of at least PKR 100.",
      );
      return;
    }

    setApprovingQuoteId(orderId);

    try {
      await customFetch(`/api/orders/${orderId}/quote`, {
        method: "PATCH",
        responseType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ totalPkr }),
      });

      await queryClient.invalidateQueries({
        queryKey: getListOrdersQueryKey({ bakerId }),
      });
    } catch (cause) {
      window.alert(
        cause instanceof Error
          ? cause.message
          : "Could not approve this quote.",
      );
    } finally {
      setApprovingQuoteId(null);
    }
  };

  const saveDispatch = async (order: {
    id: number;
    deliveryTimeSlot?: string | null;
    riderName?: string | null;
    riderPhone?: string | null;
  }) => {
    const deliveryTimeSlot = window.prompt(
      "Delivery / pickup time window (e.g. 3–5 pm)",
      order.deliveryTimeSlot ?? "",
    );

    if (deliveryTimeSlot === null) {
      return;
    }

    const riderName = window.prompt(
      "Rider name (leave blank if not assigned)",
      order.riderName ?? "",
    );

    if (riderName === null) {
      return;
    }

    const riderPhone = window.prompt(
      "Rider phone (leave blank if not assigned)",
      order.riderPhone ?? "",
    );

    if (riderPhone === null) {
      return;
    }

    try {
      await customFetch(`/api/orders/${order.id}/dispatch`, {
        method: "PATCH",
        responseType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliveryTimeSlot,
          riderName,
          riderPhone,
        }),
      });

      await queryClient.invalidateQueries({
        queryKey: getListOrdersQueryKey({ bakerId }),
      });
    } catch (cause) {
      window.alert(
        cause instanceof Error
          ? cause.message
          : "Could not save dispatch details.",
      );
    }
  };

  const recordRefund = async (orderId: number) => {
    const amount = window.prompt(
      "Refund amount in PKR (enter 0 if no money was returned)",
    );

    if (amount === null) {
      return;
    }

    const amountPkr = Number(amount);

    if (!Number.isInteger(amountPkr) || amountPkr < 0) {
      window.alert("Enter a whole refund amount in PKR.");
      return;
    }

    const reason = window.prompt(
      "Refund reason for the financial record",
    );

    if (!reason?.trim()) {
      return;
    }

    try {
      await customFetch(`/api/orders/${orderId}/refund`, {
        method: "PATCH",
        responseType: "json",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountPkr,
          reason: reason.trim(),
        }),
      });

      await queryClient.invalidateQueries({
        queryKey: getListOrdersQueryKey({ bakerId }),
      });
    } catch (cause) {
      window.alert(
        cause instanceof Error
          ? cause.message
          : "Could not record the refund.",
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                Order operations
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Orders
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review customer requests, production progress,
                payments and delivery handovers from one workspace.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/calendar"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white/55 px-4 text-sm font-semibold transition hover:bg-white"
              >
                <CalendarDays className="h-4 w-4 text-secondary" />
                Order schedule
              </Link>

              <button
                type="button"
                onClick={() =>
                  exportOrdersPDF(
                    filteredOrders,
                    baker?.businessName ?? "My Bakery"
                  )
                }
                disabled={isLoading || filteredOrders.length === 0}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-primary transition hover:bg-muted disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download Log
              </button>

              <button
                type="button"
                onClick={openManualOrder}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(47,24,55,0.12)] transition hover:bg-[#542261]"
              >
                <Plus className="h-4 w-4" />
                Add order
              </button>
            </div>
          </header>

          <section className="grid border-b border-border sm:grid-cols-2 xl:grid-cols-4">
            <OrderMetric
              icon={ShoppingBag}
              label="All orders"
              value={orderMetrics.total}
            />

            <OrderMetric
              icon={CircleAlert}
              label="New requests"
              value={orderMetrics.newOrders}
            />

            <OrderMetric
              icon={PackageCheck}
              label="In production"
              value={orderMetrics.production}
            />

            <OrderMetric
              icon={Clock3}
              label="Due today"
              value={orderMetrics.dueToday}
            />
          </section>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
            <main className="min-w-0">
              <section className="overflow-hidden rounded-2xl border border-border bg-white/45">
                <div className="border-b border-border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative min-w-0 flex-1 lg:max-w-sm">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8d9c]" />

                      <input
                        value={searchQuery}
                        onChange={(event) =>
                          setSearchQuery(event.target.value)
                        }
                        placeholder="Search orders, customers or phone numbers"
                        className="min-h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Showing{" "}
                      <strong className="text-foreground">
                        {filteredOrders.length}
                      </strong>{" "}
                      of {allOrders.length} orders
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {statusFilters.map((filter) => {
                      const active = statusFilter === filter.value;

                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setStatusFilter(filter.value)}
                          aria-pressed={active}
                          className={`min-h-9 shrink-0 rounded-lg px-3.5 text-xs font-semibold transition ${
                            active
                              ? "bg-primary text-white"
                              : "border border-border bg-card text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isLoading && !orders ? (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-20 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : filteredOrders.length > 0 ? (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[940px] text-left text-xs">
                        <thead className="border-b border-border text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Delivery</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#eadfd5]">
                          {filteredOrders.map((order) => {
                            const operations = order as typeof order & {
                              deliveryTimeSlot?: string | null;
                              riderName?: string | null;
                              riderPhone?: string | null;
                              refundStatus?: string | null;
                              refundAmountPkr?: number | null;
                            };

                            const whatsapp = whatsappHref(
                              order.buyerWhatsapp,
                            );

                            return (
                              <tr
                                key={order.id}
                                className="align-top transition hover:bg-[#fff8f3]"
                              >
                                <td className="px-4 py-4">
                                  <p className="font-mono text-sm font-semibold">
                                    #{order.id}
                                  </p>

                                  <p className="mt-1 max-w-[190px] truncate text-[11px] text-muted-foreground">
                                    {orderSummary(order)}
                                  </p>

                                  {order.source === "custom_quote" ? (
                                    <span className="mt-2 inline-flex rounded-lg bg-accent px-2 py-1 text-[9px] font-semibold text-[#9b2c5a]">
                                      Custom-cake request
                                    </span>
                                  ) : null}
                                </td>

                                <td className="px-4 py-4">
                                  <p className="text-sm font-semibold">
                                    {order.buyerName}
                                  </p>

                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span>{order.buyerWhatsapp}</span>

                                    {whatsapp ? (
                                      <a
                                        href={whatsapp}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Message ${order.buyerName} on WhatsApp`}
                                        className="grid h-7 w-7 place-items-center rounded-lg bg-[#e4f3e8] text-[#168a55] transition hover:bg-[#d7ecdd]"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </a>
                                    ) : null}
                                  </div>
                                </td>

                                <td className="px-4 py-4">
                                  <p className="font-semibold">
                                    {formatDeliveryDate(
                                      order.deliveryDate,
                                    )}
                                  </p>

                                  <p className="mt-1 max-w-[180px] text-[11px] leading-5 text-muted-foreground">
                                    {operations.deliveryTimeSlot ||
                                      "Time not assigned"}

                                    {operations.riderName
                                      ? ` · ${operations.riderName}`
                                      : ""}
                                  </p>
                                </td>

                                <td className="px-4 py-4">
                                  <p className="font-mono text-sm font-semibold">
                                    PKR{" "}
                                    {order.totalPkr.toLocaleString()}
                                  </p>

                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    {order.requireAdvance
                                      ? order.advancePaid
                                        ? "Advance verified"
                                        : "Advance pending"
                                      : "No advance required"}
                                  </p>
                                </td>

                                <td className="px-4 py-4">
                                  <select
                                    value={order.status}
                                    onChange={(event) =>
                                      handleStatusUpdate(
                                        order.id,
                                        event.target.value,
                                      )
                                    }
                                    disabled={updateStatus.isPending}
                                    className={`min-h-9 rounded-lg border-0 px-3 text-[11px] font-semibold outline-none ${statusTone(
                                      order.status,
                                    )}`}
                                  >
                                    <option value="new">New</option>
                                    <option value="confirmed">
                                      Confirmed
                                    </option>
                                    <option value="in_production">
                                      In Production
                                    </option>
                                    <option value="out_for_delivery">
                                      Out for Delivery
                                    </option>
                                    <option value="delivered">
                                      Delivered
                                    </option>
                                    <option value="cancelled">
                                      Cancelled
                                    </option>
                                  </select>
                                </td>

                                <td className="px-4 py-4">
                                  <div className="flex max-w-[260px] flex-wrap gap-2">
                                    {order.source ===
                                      "custom_quote" &&
                                    order.totalPkr === 0 ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          approveCustomQuote(order.id)
                                        }
                                        disabled={
                                          approvingQuoteId === order.id
                                        }
                                        className="rounded-lg bg-primary px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50"
                                      >
                                        {approvingQuoteId === order.id
                                          ? "Saving…"
                                          : "Set quote"}
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setChecklistOrder(order)
                                      }
                                      className="rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-semibold hover:bg-white"
                                    >
                                      Prep checklist
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void saveDispatch(operations)
                                      }
                                      className="rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-semibold hover:bg-white"
                                    >
                                      Dispatch
                                    </button>

                                    {order.status === "cancelled" &&
                                    operations.refundStatus !==
                                      "refunded" ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void recordRefund(order.id)
                                        }
                                        className="rounded-lg border border-[#e9bd82] bg-[#fff8ec] px-3 py-2 text-[10px] font-semibold text-[#9a5b15]"
                                      >
                                        Record refund
                                      </button>
                                    ) : null}

                                    {operations.refundStatus ===
                                    "refunded" ? (
                                      <span className="rounded-lg bg-[#e4f3e8] px-3 py-2 text-[10px] font-semibold text-[#168a55]">
                                        Refund PKR{" "}
                                        {operations.refundAmountPkr?.toLocaleString() ??
                                          0}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-[#eadfd5] md:hidden">
                      {filteredOrders.map((order) => {
                        const operations = order as typeof order & {
                          deliveryTimeSlot?: string | null;
                          riderName?: string | null;
                          riderPhone?: string | null;
                          refundStatus?: string | null;
                          refundAmountPkr?: number | null;
                        };

                        const whatsapp = whatsappHref(
                          order.buyerWhatsapp,
                        );

                        return (
                          <article key={order.id} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-semibold text-secondary">
                                  #{order.id}
                                </p>

                                <h2 className="mt-1 truncate text-base font-semibold">
                                  {order.buyerName}
                                </h2>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                  {orderSummary(order)}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusTone(
                                  order.status,
                                )}`}
                              >
                                {statusLabel(order.status)}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-card p-3">
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
                                  Delivery
                                </p>

                                <p className="mt-1 text-xs font-semibold">
                                  {formatDeliveryDate(
                                    order.deliveryDate,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
                                  Total
                                </p>

                                <p className="mt-1 font-mono text-xs font-semibold">
                                  PKR{" "}
                                  {order.totalPkr.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <select
                              value={order.status}
                              onChange={(event) =>
                                handleStatusUpdate(
                                  order.id,
                                  event.target.value,
                                )
                              }
                              disabled={updateStatus.isPending}
                              className="mt-3 min-h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-semibold outline-none"
                            >
                              <option value="new">New</option>
                              <option value="confirmed">
                                Confirmed
                              </option>
                              <option value="in_production">
                                In Production
                              </option>
                              <option value="out_for_delivery">
                                Out for Delivery
                              </option>
                              <option value="delivered">
                                Delivered
                              </option>
                              <option value="cancelled">
                                Cancelled
                              </option>
                            </select>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setChecklistOrder(order)
                                }
                                className="min-h-10 rounded-xl border border-border bg-card text-[11px] font-semibold"
                              >
                                Prep checklist
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void saveDispatch(operations)
                                }
                                className="min-h-10 rounded-xl border border-border bg-card text-[11px] font-semibold"
                              >
                                Dispatch
                              </button>

                              {whatsapp ? (
                                <a
                                  href={whatsapp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#e4f3e8] text-[11px] font-semibold text-[#168a55]"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  Message customer
                                </a>
                              ) : null}

                              {order.source === "custom_quote" &&
                              order.totalPkr === 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    approveCustomQuote(order.id)
                                  }
                                  disabled={
                                    approvingQuoteId === order.id
                                  }
                                  className="col-span-2 min-h-10 rounded-xl bg-primary text-[11px] font-semibold text-white"
                                >
                                  {approvingQuoteId === order.id
                                    ? "Saving…"
                                    : "Set custom quote"}
                                </button>
                              ) : null}

                              {order.status === "cancelled" &&
                              operations.refundStatus !==
                                "refunded" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void recordRefund(order.id)
                                  }
                                  className="col-span-2 min-h-10 rounded-xl bg-[#fff2df] text-[11px] font-semibold text-[#9a5b15]"
                                >
                                  Record refund
                                </button>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="grid min-h-[340px] place-items-center p-6 text-center">
                    <div>
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-secondary">
                        <ShoppingBag className="h-6 w-6" />
                      </span>

                      <h2 className="mt-4 font-serif text-2xl font-semibold">
                        No matching orders
                      </h2>

                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        Adjust the search or filter, or create a
                        manual order for a phone, walk-in or social
                        customer.
                      </p>

                      <button
                        type="button"
                        onClick={openManualOrder}
                        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Add order
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </main>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-border bg-white/45 p-4">
                <h2 className="font-serif text-xl font-semibold">
                  Order pipeline
                </h2>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Current workload across every operational stage.
                </p>

                <div className="mt-4 space-y-3">
                  {statusFilters
                    .filter((filter) => filter.value !== "all")
                    .map((filter) => {
                      const count = allOrders.filter(
                        (order) => order.status === filter.value,
                      ).length;

                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() =>
                            setStatusFilter(filter.value)
                          }
                          className="flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left transition hover:bg-card"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${statusTone(
                                filter.value,
                              )
                                .split(" ")
                                .find((className) =>
                                  className.startsWith("bg-"),
                                )}`}
                            />

                            {filter.label}
                          </span>

                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {count.toString().padStart(2, "0")}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5cfd9] bg-accent p-4">
                <Truck className="h-5 w-5 text-secondary" />

                <h2 className="mt-3 font-serif text-xl font-semibold">
                  Delivery handover
                </h2>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Add the delivery window and rider details before
                  moving an order to out for delivery.
                </p>

                <Link
                  href="/dashboard/calendar"
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-white/55 text-xs font-semibold text-primary"
                >
                  <CalendarDays className="h-4 w-4" />
                  Open schedule
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <dialog
        id="manual-order-dialog"
        className="w-[min(94vw,48rem)] rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-[#241629]/55"
      >
        <form onSubmit={submitManualOrder}>
          <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                New customer order
              </p>

              <h2 className="mt-2 font-serif text-3xl font-semibold">
                Add manual order
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Payment remains pending until it is verified.
              </p>
            </div>

            <button
              type="button"
              onClick={closeManualOrder}
              aria-label="Close manual order"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Customer name">
                <input
                  required
                  value={manualOrder.buyerName}
                  onChange={(event) =>
                    updateManualField(
                      "buyerName",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="Customer name"
                />
              </FormField>

              <FormField label="WhatsApp / phone">
                <input
                  required
                  type="tel"
                  value={manualOrder.buyerWhatsapp}
                  onChange={(event) =>
                    updateManualField(
                      "buyerWhatsapp",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="03XX XXXXXXX"
                />
              </FormField>

              <FormField
                label="Delivery address"
                className="sm:col-span-2"
              >
                <input
                  required
                  value={manualOrder.buyerAddress}
                  onChange={(event) =>
                    updateManualField(
                      "buyerAddress",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="Full delivery or pickup address"
                />
              </FormField>

              <FormField label="Area / sector">
                <input
                  value={manualOrder.buyerArea}
                  onChange={(event) =>
                    updateManualField(
                      "buyerArea",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="DHA, Gulberg, F-7..."
                />
              </FormField>

              <FormField label="Delivery date">
                <input
                  type="date"
                  value={manualOrder.deliveryDate}
                  onChange={(event) =>
                    updateManualField(
                      "deliveryDate",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                />
              </FormField>

              <FormField label="Time window">
                <input
                  value={manualOrder.deliveryTimeSlot}
                  onChange={(event) =>
                    updateManualField(
                      "deliveryTimeSlot",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="e.g. 3–5 PM"
                />
              </FormField>

              <FormField
                label="Product / order summary"
                className="sm:col-span-2"
              >
                <input
                  required
                  value={manualOrder.productName}
                  onChange={(event) =>
                    updateManualField(
                      "productName",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="Red velvet cake, cupcakes..."
                />
              </FormField>

              <FormField label="Quantity">
                <input
                  required
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={manualOrder.quantity}
                  onChange={(event) =>
                    updateManualField(
                      "quantity",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                />
              </FormField>

              <FormField label="Total in PKR">
                <input
                  required
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={manualOrder.totalPkr}
                  onChange={(event) =>
                    updateManualField(
                      "totalPkr",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="2500"
                />
              </FormField>

              <FormField label="Occasion">
                <input
                  value={manualOrder.occasion}
                  onChange={(event) =>
                    updateManualField(
                      "occasion",
                      event.target.value,
                    )
                  }
                  className="premium-input"
                  placeholder="Birthday, wedding..."
                />
              </FormField>

              <FormField
                label="Special instructions"
                className="sm:col-span-2"
              >
                <textarea
                  value={manualOrder.specialInstructions}
                  onChange={(event) =>
                    updateManualField(
                      "specialInstructions",
                      event.target.value,
                    )
                  }
                  rows={4}
                  className="premium-input resize-none"
                  placeholder="Design text, allergies or delivery notes"
                />
              </FormField>
            </div>

            {manualError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[#a7313b]"
              >
                {manualError}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-border px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={closeManualOrder}
              className="min-h-11 rounded-xl border border-border bg-white/55 px-5 text-sm font-semibold"
            >
              Cancel
            </button>

            <button
              disabled={savingManualOrder}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingManualOrder
                ? "Saving order…"
                : "Save pending order"}
            </button>
          </div>
        </form>
      </dialog>

      {checklistOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241629]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="production-checklist-title"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-background text-foreground shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Order #{checklistOrder.id}
                </p>

                <h2
                  id="production-checklist-title"
                  className="mt-2 font-serif text-3xl font-semibold"
                >
                  Production checklist
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {checklistOrder.buyerName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setChecklistOrder(null)}
                aria-label="Close production checklist"
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white/55"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              <ChecklistItem
                ready={Boolean(checklistOrder.items?.length)}
                label="Design and order details"
                value={
                  checklistOrder.items
                    ?.map(
                      (item: any) =>
                        `${item.productName} × ${item.quantity}`,
                    )
                    .join(", ") ||
                  "Add the order details before baking."
                }
              />

              <ChecklistItem
                ready={Boolean(
                  checklistOrder.flavour ||
                    checklistOrder.specialInstructions,
                )}
                label="Flavour, design text and dietary notes"
                value={
                  [
                    checklistOrder.flavour,
                    checklistOrder.textOnCake,
                    checklistOrder.specialInstructions,
                  ]
                    .filter(Boolean)
                    .join(" · ") ||
                  "No extra instructions recorded. Confirm with the customer if needed."
                }
              />

              <ChecklistItem
                ready={
                  !checklistOrder.requireAdvance ||
                  checklistOrder.advancePaid
                }
                label="Deposit and payment"
                value={
                  checklistOrder.requireAdvance
                    ? checklistOrder.advancePaid
                      ? "Deposit verified"
                      : "Waiting for baker verification"
                    : "No advance required"
                }
              />

              <ChecklistItem
                ready={Boolean(checklistOrder.deliveryDate)}
                label="Bake and delivery date"
                value={
                  checklistOrder.deliveryDate
                    ? format(
                        new Date(checklistOrder.deliveryDate),
                        "PPP",
                      )
                    : "Set the required date before confirming."
                }
              />

              <ChecklistItem
                ready={[
                  "in_production",
                  "out_for_delivery",
                  "delivered",
                ].includes(checklistOrder.status)}
                label="Production and packing"
                value={
                  checklistOrder.status === "confirmed"
                    ? "Move the order to In Production when baking starts."
                    : checklistOrder.status === "new"
                      ? "Confirm the order and payment first."
                      : "Production stage has started."
                }
              />

              <ChecklistItem
                ready={
                  checklistOrder.fulfillmentType === "pickup" ||
                  ["out_for_delivery", "delivered"].includes(
                    checklistOrder.status,
                  )
                }
                label={
                  checklistOrder.fulfillmentType === "pickup"
                    ? "Pickup handover"
                    : "Rider and delivery"
                }
                value={
                  checklistOrder.fulfillmentType === "pickup"
                    ? "Confirm pickup time with the customer."
                    : checklistOrder.status ===
                        "out_for_delivery"
                      ? "Rider is on the way. Keep the customer updated."
                      : checklistOrder.status === "delivered"
                        ? "Delivered. A feedback request can now be sent."
                        : `${checklistOrder.buyerArea || "Delivery area"}: arrange a rider before dispatch.`
                }
              />

              <p className="rounded-xl bg-muted px-4 py-3 text-xs leading-5 text-muted-foreground">
                This checklist uses the live order, payment,
                production and delivery records. It does not create
                separate checklist data.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function OrderMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number;
}) {
  return (
    <div className="border-border px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-5 w-5 text-secondary" />

        <span className="text-[11px] font-medium">{label}</span>
      </div>

      <p className="mt-2 font-mono text-2xl font-semibold">
        {value.toString().padStart(2, "0")}
      </p>
    </div>
  );
}

function FormField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-semibold ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ChecklistItem({
  ready,
  label,
  value,
}: {
  ready: boolean;
  label: string;
  value: string;
}) {
  const Icon = ready ? CheckCircle2 : CircleAlert;

  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-white/45 p-4">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          ready ? "text-[#168a55]" : "text-[#b86a24]"
        }`}
      />

      <div>
        <p className="text-sm font-semibold">{label}</p>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}