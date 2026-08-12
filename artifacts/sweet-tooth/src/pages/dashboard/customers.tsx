import { format } from "date-fns";
import { useMemo, useState } from "react";
import {
  customFetch,
  getListCustomersQueryKey,
  getListOrdersQueryKey,
  useListCustomers,
  useListOrders,
} from "@workspace/api-client-react";
import { AlertTriangle, Check, Heart, Search, Send, Users, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";

type CustomerFilter = "all" | "regular" | "at-risk" | "cancelled";

export default function DashboardCustomers() {
  const { bakerId } = useBuyerSession();
  const { data: customers, isLoading } = useListCustomers(
    { bakerId },
    { query: { enabled: !!bakerId, queryKey: getListCustomersQueryKey({ bakerId }), ...liveDashboardQuery(ORDERS_POLL_MS) } },
  );
  const { data: orders } = useListOrders(
    { bakerId },
    { query: { enabled: !!bakerId, queryKey: getListOrdersQueryKey({ bakerId }), ...liveDashboardQuery(ORDERS_POLL_MS) } },
  );
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState(
    "Assalam-o-Alaikum {{name}}! We have a special offer for you from our bakery. Reply here to order or ask for today's menu.",
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const all = customers ?? [];
  const regulars = all.filter((customer) => customer.isRegular);
  const atRisk = all.filter((customer) => customer.isAtRisk);
  const totalSpent = all.reduce((sum, customer) => sum + customer.totalSpentPkr, 0);
  const cancelledByCustomer = useMemo(() => {
    const counts = new Map<number, number>();
    for (const order of orders ?? []) {
      const cancellationActor = (order as typeof order & { cancelledBy?: string | null }).cancelledBy;
      if (order.status === "cancelled" && cancellationActor === "customer" && order.buyerId) {
        counts.set(order.buyerId, (counts.get(order.buyerId) ?? 0) + 1);
      }
    }
    return counts;
  }, [orders]);
  const visible = all.filter((customer) => {
    const matchesSearch = `${customer.name} ${customer.whatsappNumber} ${customer.preferredArea ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "regular") return customer.isRegular;
    if (filter === "at-risk") return customer.isAtRisk;
    if (filter === "cancelled") return cancelledByCustomer.has(customer.id);
    return true;
  });

  const toggleCustomer = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const selectVisible = () => {
    setSelectedIds((current) => {
      const visibleIds = visible.map((customer) => customer.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));
      return allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])];
    });
  };
  const sendOffer = async () => {
    if (!bakerId || selectedIds.length === 0 || message.trim().length < 5) return;
    setSending(true);
    setSendResult(null);
    try {
      const result = await customFetch<{ sent: number; failed: number; targeted: number }>(
        `/api/bakers/${bakerId}/broadcast`,
        {
          method: "POST",
          responseType: "json",
          body: JSON.stringify({ message: message.trim(), customerIds: selectedIds, limit: selectedIds.length }),
        },
      );
      setSendResult(`Sent to ${result.sent} of ${result.targeted} selected customers${result.failed ? ` (${result.failed} failed)` : ""}.`);
    } catch (cause) {
      setSendResult(
        cause instanceof Error
          ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "")
          : "Message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        <h1 className="mb-2 font-serif text-4xl font-bold text-primary">Customer CRM</h1>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Notice loyal buyers, customers at risk, and cancellation patterns. Select the right people and send a personal offer.
        </p>

        {isLoading && !customers ? (
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <CrmStat icon={Users} label="Total customers" value={String(all.length)} />
              <CrmStat icon={Heart} label="Regulars" value={String(regulars.length)} highlight />
              <CrmStat icon={AlertTriangle} label="At risk" value={String(atRisk.length)} warn={atRisk.length > 0} />
              <CrmStat icon={Users} label="Lifetime value" value={`PKR ${totalSpent.toLocaleString()}`} />
            </div>

            <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-serif text-xl font-bold">Customer groups</h2>
                  <p className="text-sm text-muted-foreground">Filter, select, then send a relevant WhatsApp offer.</p>
                </div>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => { setComposerOpen(true); setSendResult(null); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" /> Message selected ({selectedIds.length})
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {([
                    ["all", "All", all.length],
                    ["regular", "Regulars", regulars.length],
                    ["at-risk", "At risk", atRisk.length],
                    ["cancelled", "Cancelled before", cancelledByCustomer.size],
                  ] as const).map(([id, label, count]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {label} Â· {count}
                    </button>
                  ))}
                </div>
                <label className="relative block lg:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Search customers</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or area" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm" />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <button type="button" onClick={selectVisible} className="text-xs font-bold text-primary">Select all shown</button>
                <span className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "customer" : "customers"} shown</span>
              </div>
              <div className="mt-4 divide-y divide-border">
                {visible.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    selected={selectedIds.includes(customer.id)}
                    onToggle={() => toggleCustomer(customer.id)}
                    cancellationCount={cancelledByCustomer.get(customer.id) ?? 0}
                  />
                ))}
                {visible.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No customers match this filter.</p>}
              </div>
            </section>
          </>
        )}
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="offer-title">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Personalized outreach</p>
                <h2 id="offer-title" className="mt-1 font-serif text-2xl font-bold">Message {selectedIds.length} {selectedIds.length === 1 ? "customer" : "customers"}</h2>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} aria-label="Close message composer" className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Use <code className="rounded bg-muted px-1">{"{{name}}"}</code> to insert each customer&apos;s name automatically.</p>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} maxLength={900} className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>WhatsApp Business connection required</span><span>{message.length}/900</span></div>
            {sendResult && <p role="status" className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{sendResult}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setComposerOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold">Close</button>
              <button type="button" disabled={sending || message.trim().length < 5} onClick={sendOffer} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {sending ? "Sendingâ€¦" : <><Send className="h-4 w-4" /> Send personalized offer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function CrmStat({ icon: Icon, label, value, highlight, warn }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${warn ? "border-amber-200 bg-amber-50/40" : highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <Icon className={`mb-2 h-4 w-4 ${warn ? "text-amber-700" : "text-muted-foreground"}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${warn ? "text-amber-800" : highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function CustomerRow({ customer, selected, onToggle, cancellationCount }: {
  customer: { id: number; name: string; whatsappNumber: string; preferredArea?: string | null; totalSpentPkr: number; totalOrders: number; lastOrderAt?: string | null; isAtRisk?: boolean };
  selected: boolean;
  onToggle: () => void;
  cancellationCount: number;
}) {
  return (
    <button type="button" onClick={onToggle} className={`flex w-full items-center gap-3 py-4 text-left transition-colors ${selected ? "bg-primary/5" : "hover:bg-muted/40"}`}>
      <span className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{customer.name}</p>
          {customer.totalOrders >= 2 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Regular</span>}
          {customer.isAtRisk && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">At risk</span>}
          {cancellationCount > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">{cancellationCount} customer cancellation{cancellationCount > 1 ? "s" : ""}</span>}
        </div>
        <p className="truncate text-sm text-muted-foreground">{customer.whatsappNumber}{customer.preferredArea ? ` Â· ${customer.preferredArea}` : ""}</p>
        {customer.lastOrderAt && <p className="mt-0.5 text-xs text-muted-foreground">Last order {format(new Date(customer.lastOrderAt), "MMM d, yyyy")}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono font-bold text-primary">PKR {customer.totalSpentPkr.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{customer.totalOrders} orders</p>
      </div>
    </button>
  );
}
