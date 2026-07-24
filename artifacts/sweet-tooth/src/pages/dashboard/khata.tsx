import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Calendar, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";

type KhataPeriod = "daily" | "weekly" | "monthly" | "yearly";

type InventoryItem = {
  id: number;
  name: string;
  unit: string;
  qtyInStock: number;
  reorderLevel: number;
  unitCostPkr: number;
};

type LedgerEntry = {
  id: number;
  type: "expense" | "delivery_cost" | "sale_adjustment";
  category: string;
  description: string | null;
  amountPkr: number;
  entryDate: string;
};

type ProductMargin = {
  productId: number;
  productName: string;
  unitsSold: number;
  revenuePkr: number;
  recipeCostPkr: number | null;
  estimatedCogsPkr: number;
  marginPkr: number;
  marginPercent: number | null;
};

type KhataAnalytics = {
  period: string;
  label: string;
  startDate: string;
  endDate: string;
  revenueFromOrders: number;
  revenue: number;
  orders: number;
  deliveredOrders: number;
  manualExpenses: number;
  totalExpenses: number;
  deliveryCosts: number;
  estimatedCogsFromRecipes: number;
  grossMarginFromRecipes: number;
  estimatedProfit: number;
  netProfitAfterCogs: number;
  profitMargin: number | null;
  orderVsExpenseGap: number;
  inventoryValue: number;
  lowStockCount: number;
  totalInventoryItems: number;
  productMargins: ProductMargin[];
};

type MonthSummary = {
  month: string;
  revenue: number;
  orders: number;
  expenses: number;
  profit: number;
};

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-PK", { month: "short", year: "numeric" });
}

export default function DashboardKhata() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<KhataPeriod>("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    unit: "kg",
    qtyInStock: "0",
    reorderLevel: "0",
    unitCostPkr: "0",
  });
  const [ledgerForm, setLedgerForm] = useState({
    type: "expense" as LedgerEntry["type"],
    category: "ingredients",
    amountPkr: "",
    entryDate: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const khataQueryKey = ["khata-analytics", bakerId, period, selectedMonth];

  const monthsQuery = useQuery({
    queryKey: ["khata-months", bakerId],
    enabled: !!bakerId,
    queryFn: () => customFetch<MonthSummary[]>(`/api/analytics/baker/${bakerId}/khata/months`),
  });

  const khataQuery = useQuery({
    queryKey: khataQueryKey,
    enabled: !!bakerId,
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedMonth) {
        params.set("month", selectedMonth);
      } else {
        params.set("period", period);
      }
      return customFetch<KhataAnalytics>(`/api/analytics/baker/${bakerId}/khata?${params}`);
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory-items", bakerId],
    enabled: !!bakerId,
    queryFn: () => customFetch<InventoryItem[]>(`/api/inventory/baker/${bakerId}`),
  });

  const ledgerQuery = useQuery({
    queryKey: ["ledger-entries", bakerId, khataQuery.data?.startDate, khataQuery.data?.endDate],
    enabled: !!bakerId && !!khataQuery.data,
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: khataQuery.data!.startDate,
        endDate: khataQuery.data!.endDate,
      });
      return customFetch<LedgerEntry[]>(`/api/ledger/baker/${bakerId}/entries?${params}`);
    },
  });

  const invalidateKhata = async () => {
    await queryClient.invalidateQueries({ queryKey: ["khata-analytics", bakerId] });
    await queryClient.invalidateQueries({ queryKey: ["khata-months", bakerId] });
    await queryClient.invalidateQueries({ queryKey: ["ledger-entries", bakerId] });
    await queryClient.invalidateQueries({ queryKey: ["inventory-items", bakerId] });
  };

  const addInventory = useMutation({
    mutationFn: () =>
      customFetch(`/api/inventory/baker/${bakerId}/items`, {
        method: "POST",
        body: JSON.stringify({
          name: inventoryForm.name.trim(),
          unit: inventoryForm.unit.trim() || "pcs",
          qtyInStock: Number(inventoryForm.qtyInStock) || 0,
          reorderLevel: Number(inventoryForm.reorderLevel) || 0,
          unitCostPkr: Number(inventoryForm.unitCostPkr) || 0,
        }),
      }),
    onSuccess: async () => {
      setInventoryForm({ name: "", unit: "kg", qtyInStock: "0", reorderLevel: "0", unitCostPkr: "0" });
      await invalidateKhata();
    },
  });

  const deleteInventory = useMutation({
    mutationFn: (itemId: number) =>
      customFetch(`/api/inventory/baker/${bakerId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: invalidateKhata,
  });

  const addLedger = useMutation({
    mutationFn: () =>
      customFetch(`/api/ledger/baker/${bakerId}/entries`, {
        method: "POST",
        body: JSON.stringify({
          type: ledgerForm.type,
          category: ledgerForm.category.trim() || "general",
          amountPkr: Number(ledgerForm.amountPkr) || 0,
          entryDate: ledgerForm.entryDate,
          description: ledgerForm.description.trim() || undefined,
        }),
      }),
    onSuccess: async () => {
      setLedgerForm((prev) => ({ ...prev, amountPkr: "", description: "" }));
      await invalidateKhata();
    },
  });

  const deleteLedger = useMutation({
    mutationFn: (entryId: number) =>
      customFetch(`/api/ledger/baker/${bakerId}/entries/${entryId}`, { method: "DELETE" }),
    onSuccess: invalidateKhata,
  });

  const lowStockItems = useMemo(
    () => (inventoryQuery.data ?? []).filter((item) => item.qtyInStock <= item.reorderLevel),
    [inventoryQuery.data],
  );

  const data = khataQuery.data;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-primary">Khata & Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue is tracked from app orders. Add manual expenses to compare profit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border bg-muted/40 p-1">
              {(["daily", "weekly", "monthly", "yearly"] as KhataPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setSelectedMonth(""); }}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize ${!selectedMonth && period === p ? "bg-background text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {p === "daily" ? "Day" : p === "weekly" ? "Week" : p === "monthly" ? "Month" : "Year"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm focus:outline-none"
              >
                <option value="">Current period</option>
                {(monthsQuery.data ?? []).map((m) => (
                  <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {data && (
          <p className="text-sm text-muted-foreground">
            Showing: <strong>{data.label}</strong> ({data.startDate} → {data.endDate})
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Order revenue" value={`PKR ${data?.revenueFromOrders.toLocaleString() ?? 0}`} accent />
          <StatCard label="Orders" value={String(data?.orders ?? 0)} />
          <StatCard label="Manual expenses" value={`PKR ${data?.manualExpenses.toLocaleString() ?? 0}`} />
          <StatCard label="Net profit" value={`PKR ${data?.estimatedProfit.toLocaleString() ?? 0}`} accent />
          <StatCard label="Recipe COGS (est.)" value={`PKR ${data?.estimatedCogsFromRecipes.toLocaleString() ?? 0}`} />
          <StatCard label="Margin %" value={data?.profitMargin != null ? `${data.profitMargin}%` : "—"} />
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="font-semibold">Orders vs expenses</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue comes from orders placed in the app. Expenses are what you enter in the ledger below.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-background p-4 border border-border">
              <p className="text-muted-foreground">Order revenue</p>
              <p className="text-2xl font-bold font-mono text-primary">PKR {data?.revenueFromOrders.toLocaleString() ?? 0}</p>
            </div>
            <div className="rounded-lg bg-background p-4 border border-border">
              <p className="text-muted-foreground">Manual expenses</p>
              <p className="text-2xl font-bold font-mono">PKR {data?.manualExpenses.toLocaleString() ?? 0}</p>
            </div>
            <div className="rounded-lg bg-background p-4 border border-border">
              <p className="text-muted-foreground">Gap (revenue − expenses)</p>
              <p className={`text-2xl font-bold font-mono ${(data?.orderVsExpenseGap ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                PKR {data?.orderVsExpenseGap.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>

        {(monthsQuery.data?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold">Monthly overview</h2>
            <p className="text-sm text-muted-foreground mt-1">Tap a month to view details.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(monthsQuery.data ?? []).slice(0, 12).map((m) => (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => setSelectedMonth(m.month)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${selectedMonth === m.month ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                >
                  <p className="font-semibold">{monthLabel(m.month)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.orders} orders · Rev PKR {m.revenue.toLocaleString()}</p>
                  <p className={`text-xs mt-0.5 font-mono ${m.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    Profit PKR {m.profit.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {(data?.productMargins?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-x-auto">
            <h2 className="font-serif text-xl font-bold">Margin per product</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set recipe cost on each product in Catalog → Edit. Margin = revenue − (recipe cost × units sold).
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Sold</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">Recipe cost</th>
                  <th className="py-2 pr-4">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data!.productMargins.map((row) => (
                  <tr key={row.productId} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{row.productName}</td>
                    <td className="py-2 pr-4">{row.unitsSold}</td>
                    <td className="py-2 pr-4 font-mono">PKR {row.revenuePkr.toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono">
                      {row.recipeCostPkr != null ? `PKR ${row.recipeCostPkr}` : "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      PKR {row.marginPkr.toLocaleString()}
                      {row.marginPercent != null && <span className="text-muted-foreground ml-1">({row.marginPercent}%)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-xl font-bold">Inventory</h2>
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!inventoryForm.name.trim()) return;
                addInventory.mutate();
              }}
            >
              <input className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Item name (e.g. Flour)" value={inventoryForm.name} onChange={(e) => setInventoryForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Unit (kg, pcs)" value={inventoryForm.unit} onChange={(e) => setInventoryForm((p) => ({ ...p, unit: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="In stock" value={inventoryForm.qtyInStock} onChange={(e) => setInventoryForm((p) => ({ ...p, qtyInStock: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Reorder level" value={inventoryForm.reorderLevel} onChange={(e) => setInventoryForm((p) => ({ ...p, reorderLevel: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Unit cost PKR" value={inventoryForm.unitCostPkr} onChange={(e) => setInventoryForm((p) => ({ ...p, unitCostPkr: e.target.value }))} />
              <button type="submit" className="rounded-md bg-primary text-primary-foreground font-semibold px-3 py-2 text-sm disabled:opacity-50" disabled={addInventory.isPending}>Add stock item</button>
            </form>

            <div className="space-y-2 max-h-72 overflow-auto">
              {(inventoryQuery.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.qtyInStock} {item.unit} · reorder at {item.reorderLevel} · PKR {item.unitCostPkr}/{item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.qtyInStock <= item.reorderLevel && (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">Low</span>
                    )}
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Remove "${item.name}" from inventory?`)) deleteInventory.mutate(item.id); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      title="Delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {!inventoryQuery.data?.length && <p className="text-sm text-muted-foreground">No inventory items yet.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-xl font-bold">Expense ledger</h2>
            <form
              className="grid grid-cols-2 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ledgerForm.amountPkr) return;
                addLedger.mutate();
              }}
            >
              <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={ledgerForm.type} onChange={(e) => setLedgerForm((p) => ({ ...p, type: e.target.value as LedgerEntry["type"] }))}>
                <option value="expense">Expense</option>
                <option value="delivery_cost">Delivery cost</option>
                <option value="sale_adjustment">Sale adjustment</option>
              </select>
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Category" value={ledgerForm.category} onChange={(e) => setLedgerForm((p) => ({ ...p, category: e.target.value }))} />
              <input type="number" className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Amount PKR" value={ledgerForm.amountPkr} onChange={(e) => setLedgerForm((p) => ({ ...p, amountPkr: e.target.value }))} />
              <input type="date" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={ledgerForm.entryDate} onChange={(e) => setLedgerForm((p) => ({ ...p, entryDate: e.target.value }))} />
              <input className="col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Description (optional)" value={ledgerForm.description} onChange={(e) => setLedgerForm((p) => ({ ...p, description: e.target.value }))} />
              <button type="submit" className="col-span-2 rounded-md bg-primary text-primary-foreground font-semibold px-3 py-2 text-sm disabled:opacity-50" disabled={addLedger.isPending}>Add expense entry</button>
            </form>

            <div className="space-y-2 max-h-72 overflow-auto">
              {(ledgerQuery.data ?? []).map((entry) => (
                <div key={entry.id} className="flex items-start justify-between rounded-lg border border-border px-3 py-2 text-sm gap-2">
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium">{entry.category} · {entry.type.replace("_", " ")}</p>
                      <p className="font-mono">PKR {entry.amountPkr.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.entryDate}{entry.description ? ` · ${entry.description}` : ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (confirm("Delete this ledger entry?")) deleteLedger.mutate(entry.id); }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                    title="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!ledgerQuery.data?.length && <p className="text-sm text-muted-foreground">No entries for this period.</p>}
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-xl font-bold">Summary</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-muted-foreground">Stock value</p>
              <p className="text-xl font-bold mt-1">PKR {data?.inventoryValue.toLocaleString() ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-muted-foreground">Low stock items</p>
              <p className="text-xl font-bold mt-1">{data?.lowStockCount ?? 0}</p>
              {lowStockItems.length > 0 && <p className="text-xs mt-1 text-amber-700">{lowStockItems.slice(0, 3).map((i) => i.name).join(", ")}</p>}
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-muted-foreground">Delivery costs</p>
              <p className="text-xl font-bold mt-1">PKR {data?.deliveryCosts.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-lg font-bold font-mono ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
