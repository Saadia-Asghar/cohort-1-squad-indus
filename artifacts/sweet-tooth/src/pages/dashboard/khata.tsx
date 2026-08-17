import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { customFetch, useGetBaker } from "@workspace/api-client-react";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Download,
  PackagePlus,
  Plus,
  ReceiptText,
  Scale,
  ShoppingBag,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";
import { exportKhataLedgerPDF } from "@/lib/pdf-export";

type KhataPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

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
  type:
    | "expense"
    | "delivery_cost"
    | "sale_adjustment";
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

const periodOptions: Array<{
  id: KhataPeriod;
  label: string;
}> = [
  {
    id: "daily",
    label: "Day",
  },
  {
    id: "weekly",
    label: "Week",
  },
  {
    id: "monthly",
    label: "Month",
  },
  {
    id: "yearly",
    label: "Year",
  },
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-3.5 text-sm text-[#241629] outline-none transition placeholder:text-[#a99ca9] focus:border-[#c24f7a]/60 focus:ring-4 focus:ring-[#c24f7a]/10";

function money(value?: number | null): string {
  return `PKR ${(value ?? 0).toLocaleString()}`;
}

function monthLabel(value: string): string {
  const [year, month] = value
    .split("-")
    .map(Number);

  const parsed = new Date(
    year,
    month - 1,
    1,
  );

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(
    "en-PK",
    {
      month: "short",
      year: "numeric",
    },
  );
}

function ledgerTypeLabel(
  type: LedgerEntry["type"],
): string {
  return type
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

export default function DashboardKhata() {
  const { bakerId } = useBuyerSession();
  const { data: baker } = useGetBaker(bakerId);
  const queryClient = useQueryClient();

  const [period, setPeriod] =
    useState<KhataPeriod>("monthly");

  const [selectedMonth, setSelectedMonth] =
    useState("");

  const [inventoryForm, setInventoryForm] =
    useState({
      name: "",
      unit: "kg",
      qtyInStock: "0",
      reorderLevel: "0",
      unitCostPkr: "0",
    });

  const [ledgerForm, setLedgerForm] =
    useState({
      type: "expense" as LedgerEntry["type"],
      category: "ingredients",
      amountPkr: "",
      entryDate: new Date()
        .toISOString()
        .slice(0, 10),
      description: "",
    });

  const khataQueryKey = [
    "khata-analytics",
    bakerId,
    period,
    selectedMonth,
  ];

  const monthsQuery = useQuery({
    queryKey: ["khata-months", bakerId],
    enabled: Boolean(bakerId),
    queryFn: () =>
      customFetch<MonthSummary[]>(
        `/api/analytics/baker/${bakerId}/khata/months`,
      ),
  });

  const khataQuery = useQuery({
    queryKey: khataQueryKey,
    enabled: Boolean(bakerId),
    queryFn: () => {
      const params = new URLSearchParams();

      if (selectedMonth) {
        params.set(
          "month",
          selectedMonth,
        );
      } else {
        params.set("period", period);
      }

      return customFetch<KhataAnalytics>(
        `/api/analytics/baker/${bakerId}/khata?${params}`,
      );
    },
  });

  const inventoryQuery = useQuery({
    queryKey: [
      "inventory-items",
      bakerId,
    ],
    enabled: Boolean(bakerId),
    queryFn: () =>
      customFetch<InventoryItem[]>(
        `/api/inventory/baker/${bakerId}`,
      ),
  });

  const ledgerQuery = useQuery({
    queryKey: [
      "ledger-entries",
      bakerId,
      khataQuery.data?.startDate,
      khataQuery.data?.endDate,
    ],
    enabled:
      Boolean(bakerId) &&
      Boolean(khataQuery.data),
    queryFn: () => {
      const params = new URLSearchParams({
        startDate:
          khataQuery.data!.startDate,
        endDate: khataQuery.data!.endDate,
      });

      return customFetch<LedgerEntry[]>(
        `/api/ledger/baker/${bakerId}/entries?${params}`,
      );
    },
  });

  const invalidateKhata = async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "khata-analytics",
        bakerId,
      ],
    });

    await queryClient.invalidateQueries({
      queryKey: ["khata-months", bakerId],
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "ledger-entries",
        bakerId,
      ],
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "inventory-items",
        bakerId,
      ],
    });
  };

  const addInventory = useMutation({
    mutationFn: () =>
      customFetch(
        `/api/inventory/baker/${bakerId}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            name: inventoryForm.name.trim(),
            unit:
              inventoryForm.unit.trim() ||
              "pcs",
            qtyInStock:
              Number(
                inventoryForm.qtyInStock,
              ) || 0,
            reorderLevel:
              Number(
                inventoryForm.reorderLevel,
              ) || 0,
            unitCostPkr:
              Number(
                inventoryForm.unitCostPkr,
              ) || 0,
          }),
        },
      ),
    onSuccess: async () => {
      setInventoryForm({
        name: "",
        unit: "kg",
        qtyInStock: "0",
        reorderLevel: "0",
        unitCostPkr: "0",
      });

      await invalidateKhata();
    },
  });

  const deleteInventory = useMutation({
    mutationFn: (itemId: number) =>
      customFetch(
        `/api/inventory/baker/${bakerId}/items/${itemId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: async () => {
      await invalidateKhata();
    },
  });

  const addLedger = useMutation({
    mutationFn: () =>
      customFetch(
        `/api/ledger/baker/${bakerId}/entries`,
        {
          method: "POST",
          body: JSON.stringify({
            type: ledgerForm.type,
            category:
              ledgerForm.category.trim() ||
              "general",
            amountPkr:
              Number(ledgerForm.amountPkr) ||
              0,
            entryDate: ledgerForm.entryDate,
            description:
              ledgerForm.description.trim() ||
              undefined,
          }),
        },
      ),
    onSuccess: async () => {
      setLedgerForm((current) => ({
        ...current,
        amountPkr: "",
        description: "",
      }));

      await invalidateKhata();
    },
  });

  const deleteLedger = useMutation({
    mutationFn: (entryId: number) =>
      customFetch(
        `/api/ledger/baker/${bakerId}/entries/${entryId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: async () => {
      await invalidateKhata();
    },
  });

  const inventoryItems =
    inventoryQuery.data ?? [];

  const ledgerEntries =
    ledgerQuery.data ?? [];

  const lowStockItems = useMemo(
    () =>
      inventoryItems.filter(
        (item) =>
          item.qtyInStock <=
          item.reorderLevel,
      ),
    [inventoryItems],
  );

  const data = khataQuery.data;

  const profitPositive =
    (data?.estimatedProfit ?? 0) >= 0;

  const gapPositive =
    (data?.orderVsExpenseGap ?? 0) >= 0;

  const submitInventory = (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!inventoryForm.name.trim()) {
      return;
    }

    addInventory.mutate();
  };

  const submitLedger = (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!ledgerForm.amountPkr) {
      return;
    }

    addLedger.mutate();
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c24f7a]">
                Financial control
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Khata
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746876]">
                Compare order revenue with expenses,
                monitor product margins and keep
                ingredient stock records in one
                workspace.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex rounded-xl border border-[#dfd1c4] bg-[#f4eae1] p-1">
                {periodOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPeriod(item.id);
                      setSelectedMonth("");
                    }}
                    className={`min-h-10 rounded-lg px-3 text-xs font-semibold transition ${
                      !selectedMonth &&
                      period === item.id
                        ? "bg-white text-[#632a73] shadow-sm"
                        : "text-[#746876]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-3">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#c24f7a]" />

                <span className="sr-only">
                  Select financial month
                </span>

                <select
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(
                      event.target.value,
                    )
                  }
                  className="min-w-[150px] bg-transparent text-xs font-semibold text-[#4d404e] outline-none"
                >
                  <option value="">
                    Current period
                  </option>

                  {(monthsQuery.data ?? []).map(
                    (month) => (
                      <option
                        key={month.month}
                        value={month.month}
                      >
                        {monthLabel(
                          month.month,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <button
                type="button"
                onClick={() =>
                  exportKhataLedgerPDF(
                    khataQuery.data,
                    ledgerQuery.data || [],
                    baker?.businessName ?? "My Bakery"
                  )
                }
                disabled={khataQuery.isLoading || !khataQuery.data}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfd1c4] bg-[#632a73] px-4 text-xs font-bold text-white transition hover:bg-[#c24f7a] disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-1 border-b border-[#dfd1c4] py-3 text-xs text-[#746876] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing{" "}
              <strong className="text-[#241629]">
                {data?.label ??
                  "current financial period"}
              </strong>
            </p>

            {data ? (
              <p className="font-mono text-[10px]">
                {data.startDate} — {data.endDate}
              </p>
            ) : null}
          </div>

          <section className="grid border-b border-[#dfd1c4] sm:grid-cols-2 xl:grid-cols-6">
            <KhataMetric
              icon={CircleDollarSign}
              label="Order revenue"
              value={money(
                data?.revenueFromOrders,
              )}
              valueClass="text-[#168a55]"
            />

            <KhataMetric
              icon={ShoppingBag}
              label="Orders"
              value={(data?.orders ?? 0)
                .toString()
                .padStart(2, "0")}
            />

            <KhataMetric
              icon={ReceiptText}
              label="Manual expenses"
              value={money(
                data?.manualExpenses,
              )}
              valueClass="text-[#b86a24]"
            />

            <KhataMetric
              icon={Scale}
              label="Recipe COGS"
              value={money(
                data?.estimatedCogsFromRecipes,
              )}
            />

            <KhataMetric
              icon={TrendingUp}
              label="Estimated profit"
              value={money(
                data?.estimatedProfit,
              )}
              valueClass={
                profitPositive
                  ? "text-[#168a55]"
                  : "text-[#a7313b]"
              }
            />

            <KhataMetric
              icon={WalletCards}
              label="Profit margin"
              value={
                data?.profitMargin !== null &&
                data?.profitMargin !== undefined
                  ? `${data.profitMargin}%`
                  : "—"
              }
              valueClass="text-[#632a73]"
            />
          </section>

          {khataQuery.isLoading && !data ? (
            <div className="mt-5 space-y-4">
              <div className="h-40 animate-pulse rounded-2xl bg-[#f1e9e2]" />

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-96 animate-pulse rounded-2xl bg-[#f1e9e2]" />
                <div className="h-96 animate-pulse rounded-2xl bg-[#f1e9e2]" />
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <section className="grid gap-4 rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 lg:grid-cols-[0.9fr_1.4fr]">
                <div>
                  <WalletCards className="h-5 w-5 text-[#c24f7a]" />

                  <h2 className="mt-3 font-serif text-2xl font-semibold">
                    Orders versus expenses
                  </h2>

                  <p className="mt-2 max-w-md text-xs leading-5 text-[#746876]">
                    Order revenue is recorded
                    automatically. Manual expenses
                    come from the ledger entries you
                    add below.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <FinancialBlock
                    label="Order revenue"
                    value={money(
                      data?.revenueFromOrders,
                    )}
                    tone="positive"
                  />

                  <FinancialBlock
                    label="Manual expenses"
                    value={money(
                      data?.manualExpenses,
                    )}
                    tone="warning"
                  />

                  <FinancialBlock
                    label="Revenue gap"
                    value={money(
                      data?.orderVsExpenseGap,
                    )}
                    tone={
                      gapPositive
                        ? "positive"
                        : "negative"
                    }
                  />
                </div>
              </section>

              {(monthsQuery.data?.length ?? 0) >
              0 ? (
                <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                  <div className="border-b border-[#dfd1c4] px-4 py-4 sm:px-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
                      Financial history
                    </p>

                    <h2 className="mt-1 font-serif text-2xl font-semibold">
                      Monthly overview
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-[#746876]">
                      Select a month to review its
                      detailed Khata records.
                    </p>
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {(monthsQuery.data ?? [])
                      .slice(0, 12)
                      .map((month) => (
                        <MonthCard
                          key={month.month}
                          month={month}
                          active={
                            selectedMonth ===
                            month.month
                          }
                          onClick={() =>
                            setSelectedMonth(
                              month.month,
                            )
                          }
                        />
                      ))}
                  </div>
                </section>
              ) : null}

              {(data?.productMargins?.length ??
                0) > 0 ? (
                <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                  <div className="border-b border-[#dfd1c4] px-4 py-4 sm:px-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
                      Product profitability
                    </p>

                    <h2 className="mt-1 font-serif text-2xl font-semibold">
                      Margin per product
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-[#746876]">
                      Recipe costs are managed from
                      Catalog. Margin equals revenue
                      minus estimated recipe cost.
                    </p>
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="border-b border-[#eadfd5] text-[9px] uppercase tracking-[0.08em] text-[#746876]">
                        <tr>
                          <th className="px-4 py-3">
                            Product
                          </th>

                          <th className="px-4 py-3">
                            Units sold
                          </th>

                          <th className="px-4 py-3">
                            Revenue
                          </th>

                          <th className="px-4 py-3">
                            Recipe cost
                          </th>

                          <th className="px-4 py-3 text-right">
                            Margin
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#eadfd5]">
                        {data!.productMargins.map(
                          (row) => (
                            <tr
                              key={row.productId}
                              className="transition hover:bg-[#fff8f3]"
                            >
                              <td className="px-4 py-4">
                                <p className="text-sm font-semibold">
                                  {
                                    row.productName
                                  }
                                </p>
                              </td>

                              <td className="px-4 py-4 font-mono">
                                {row.unitsSold}
                              </td>

                              <td className="px-4 py-4 font-mono">
                                {money(
                                  row.revenuePkr,
                                )}
                              </td>

                              <td className="px-4 py-4 font-mono text-[#746876]">
                                {row.recipeCostPkr !==
                                null
                                  ? money(
                                      row.recipeCostPkr,
                                    )
                                  : "Not configured"}
                              </td>

                              <td className="px-4 py-4 text-right">
                                <p
                                  className={`font-mono text-sm font-semibold ${
                                    row.marginPkr >= 0
                                      ? "text-[#168a55]"
                                      : "text-[#a7313b]"
                                  }`}
                                >
                                  {money(
                                    row.marginPkr,
                                  )}
                                </p>

                                {row.marginPercent !==
                                null ? (
                                  <p className="mt-1 text-[10px] text-[#746876]">
                                    {
                                      row.marginPercent
                                    }
                                    % margin
                                  </p>
                                ) : null}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-[#eadfd5] md:hidden">
                    {data!.productMargins.map(
                      (row) => (
                        <article
                          key={row.productId}
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-serif text-lg font-semibold">
                                {row.productName}
                              </h3>

                              <p className="mt-1 text-xs text-[#746876]">
                                {row.unitsSold} units
                                sold
                              </p>
                            </div>

                            <p
                              className={`font-mono text-sm font-semibold ${
                                row.marginPkr >= 0
                                  ? "text-[#168a55]"
                                  : "text-[#a7313b]"
                              }`}
                            >
                              {money(
                                row.marginPkr,
                              )}
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#fffaf6] p-3 text-xs">
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9b8d9c]">
                                Revenue
                              </p>

                              <p className="mt-1 font-mono font-semibold">
                                {money(
                                  row.revenuePkr,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9b8d9c]">
                                Recipe cost
                              </p>

                              <p className="mt-1 font-mono font-semibold">
                                {row.recipeCostPkr !==
                                null
                                  ? money(
                                      row.recipeCostPkr,
                                    )
                                  : "Not set"}
                              </p>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                  <SectionHeader
                    icon={Boxes}
                    eyebrow="Stock control"
                    title="Inventory"
                    description="Track ingredient quantities, unit costs and reorder levels."
                  />

                  <form
                    onSubmit={submitInventory}
                    className="grid gap-3 border-b border-[#dfd1c4] bg-[#fffaf6] p-4 sm:grid-cols-2"
                  >
                    <label className="grid gap-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Item name
                      </span>

                      <input
                        value={
                          inventoryForm.name
                        }
                        onChange={(event) =>
                          setInventoryForm(
                            (current) => ({
                              ...current,
                              name: event.target
                                .value,
                            }),
                          )
                        }
                        placeholder="Example: Flour"
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Unit
                      </span>

                      <input
                        value={
                          inventoryForm.unit
                        }
                        onChange={(event) =>
                          setInventoryForm(
                            (current) => ({
                              ...current,
                              unit: event.target
                                .value,
                            }),
                          )
                        }
                        placeholder="kg, litre, pcs"
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Quantity in stock
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          inventoryForm.qtyInStock
                        }
                        onChange={(event) =>
                          setInventoryForm(
                            (current) => ({
                              ...current,
                              qtyInStock:
                                event.target.value,
                            }),
                          )
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Reorder level
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          inventoryForm.reorderLevel
                        }
                        onChange={(event) =>
                          setInventoryForm(
                            (current) => ({
                              ...current,
                              reorderLevel:
                                event.target.value,
                            }),
                          )
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Unit cost in PKR
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          inventoryForm.unitCostPkr
                        }
                        onChange={(event) =>
                          setInventoryForm(
                            (current) => ({
                              ...current,
                              unitCostPkr:
                                event.target.value,
                            }),
                          )
                        }
                        className={inputClass}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={
                        addInventory.isPending ||
                        !inventoryForm.name.trim()
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#632a73] px-4 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2"
                    >
                      <PackagePlus className="h-4 w-4" />

                      {addInventory.isPending
                        ? "Adding item…"
                        : "Add stock item"}
                    </button>
                  </form>

                  <div className="max-h-[430px] divide-y divide-[#eadfd5] overflow-y-auto">
                    {inventoryItems.length > 0 ? (
                      inventoryItems.map((item) => (
                        <InventoryRecord
                          key={item.id}
                          item={item}
                          deleting={
                            deleteInventory.isPending
                          }
                          onDelete={() => {
                            const approved =
                              window.confirm(
                                `Remove "${item.name}" from inventory?`,
                              );

                            if (approved) {
                              deleteInventory.mutate(
                                item.id,
                              );
                            }
                          }}
                        />
                      ))
                    ) : (
                      <EmptyPanel
                        icon={Boxes}
                        title="No stock items yet"
                        description="Add ingredients or packaging supplies using the form above."
                      />
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                  <SectionHeader
                    icon={ReceiptText}
                    eyebrow="Manual records"
                    title="Expense ledger"
                    description="Record expenses, delivery costs and revenue adjustments."
                  />

                  <form
                    onSubmit={submitLedger}
                    className="grid gap-3 border-b border-[#dfd1c4] bg-[#fffaf6] p-4 sm:grid-cols-2"
                  >
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Entry type
                      </span>

                      <select
                        value={ledgerForm.type}
                        onChange={(event) =>
                          setLedgerForm(
                            (current) => ({
                              ...current,
                              type: event.target
                                .value as LedgerEntry["type"],
                            }),
                          )
                        }
                        className={inputClass}
                      >
                        <option value="expense">
                          Expense
                        </option>

                        <option value="delivery_cost">
                          Delivery cost
                        </option>

                        <option value="sale_adjustment">
                          Sale adjustment
                        </option>
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Category
                      </span>

                      <input
                        value={
                          ledgerForm.category
                        }
                        onChange={(event) =>
                          setLedgerForm(
                            (current) => ({
                              ...current,
                              category:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Ingredients"
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Amount in PKR
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          ledgerForm.amountPkr
                        }
                        onChange={(event) =>
                          setLedgerForm(
                            (current) => ({
                              ...current,
                              amountPkr:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="0"
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Entry date
                      </span>

                      <input
                        type="date"
                        value={
                          ledgerForm.entryDate
                        }
                        onChange={(event) =>
                          setLedgerForm(
                            (current) => ({
                              ...current,
                              entryDate:
                                event.target.value,
                            }),
                          )
                        }
                        className={inputClass}
                      />
                    </label>

                    <label className="grid gap-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold text-[#746876]">
                        Description
                      </span>

                      <input
                        value={
                          ledgerForm.description
                        }
                        onChange={(event) =>
                          setLedgerForm(
                            (current) => ({
                              ...current,
                              description:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Optional note"
                        className={inputClass}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={
                        addLedger.isPending ||
                        !ledgerForm.amountPkr
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#632a73] px-4 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2"
                    >
                      <Plus className="h-4 w-4" />

                      {addLedger.isPending
                        ? "Adding entry…"
                        : "Add ledger entry"}
                    </button>
                  </form>

                  <div className="max-h-[430px] divide-y divide-[#eadfd5] overflow-y-auto">
                    {ledgerEntries.length > 0 ? (
                      ledgerEntries.map(
                        (entry) => (
                          <LedgerRecord
                            key={entry.id}
                            entry={entry}
                            deleting={
                              deleteLedger.isPending
                            }
                            onDelete={() => {
                              const approved =
                                window.confirm(
                                  "Delete this ledger entry?",
                                );

                              if (approved) {
                                deleteLedger.mutate(
                                  entry.id,
                                );
                              }
                            }}
                          />
                        ),
                      )
                    ) : (
                      <EmptyPanel
                        icon={ReceiptText}
                        title="No ledger entries"
                        description="Expenses recorded for the selected period will appear here."
                      />
                    )}
                  </div>
                </section>
              </div>

              <section className="grid gap-4 rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 lg:grid-cols-[0.8fr_1.4fr]">
                <div>
                  <Scale className="h-5 w-5 text-[#c24f7a]" />

                  <h2 className="mt-3 font-serif text-2xl font-semibold">
                    Financial summary
                  </h2>

                  <p className="mt-2 max-w-md text-xs leading-5 text-[#746876]">
                    Stock value and delivery costs
                    help complete the operating view
                    for this period.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryCard
                    label="Inventory value"
                    value={money(
                      data?.inventoryValue,
                    )}
                  />

                  <SummaryCard
                    label="Low-stock items"
                    value={(
                      data?.lowStockCount ?? 0
                    ).toString()}
                    warning={
                      (data?.lowStockCount ??
                        0) > 0
                    }
                    detail={
                      lowStockItems.length > 0
                        ? lowStockItems
                            .slice(0, 3)
                            .map(
                              (item) =>
                                item.name,
                            )
                            .join(", ")
                        : "Stock levels are healthy"
                    }
                  />

                  <SummaryCard
                    label="Delivery costs"
                    value={money(
                      data?.deliveryCosts,
                    )}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function KhataMetric({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: ComponentType<{
    className?: string;
  }>;
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
        className={`mt-2 whitespace-nowrap font-mono text-lg font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function FinancialBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "positive"
    | "negative"
    | "warning";
}) {
  return (
    <div className="rounded-2xl bg-[#fffaf6] p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
        {label}
      </p>

      <p
        className={`mt-2 font-mono text-xl font-semibold ${
          tone === "positive"
            ? "text-[#168a55]"
            : tone === "negative"
              ? "text-[#a7313b]"
              : "text-[#b86a24]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MonthCard({
  month,
  active,
  onClick,
}: {
  month: MonthSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#c24f7a] bg-[#fff0f5]"
          : "border-[#dfd1c4] bg-[#fffaf6] hover:border-[#d5a8bb]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg font-semibold">
            {monthLabel(month.month)}
          </p>

          <p className="mt-1 text-xs text-[#746876]">
            {month.orders}{" "}
            {month.orders === 1
              ? "order"
              : "orders"}
          </p>
        </div>

        <span
          className={`rounded-lg px-2 py-1 font-mono text-[9px] font-semibold ${
            month.profit >= 0
              ? "bg-[#e4f3e8] text-[#168a55]"
              : "bg-[#f8dddd] text-[#a7313b]"
          }`}
        >
          {money(month.profit)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.08em] text-[#9b8d9c]">
            Revenue
          </p>

          <p className="mt-1 font-mono text-xs font-semibold">
            {money(month.revenue)}
          </p>
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-[0.08em] text-[#9b8d9c]">
            Expenses
          </p>

          <p className="mt-1 font-mono text-xs font-semibold">
            {money(month.expenses)}
          </p>
        </div>
      </div>
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: ComponentType<{
    className?: string;
  }>;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[#dfd1c4] px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1dde5] text-[#c24f7a]">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#c24f7a]">
            {eyebrow}
          </p>

          <h2 className="mt-1 font-serif text-2xl font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-[#746876]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function InventoryRecord({
  item,
  deleting,
  onDelete,
}: {
  item: InventoryItem;
  deleting: boolean;
  onDelete: () => void;
}) {
  const low =
    item.qtyInStock <= item.reorderLevel;

  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-semibold">
            {item.name}
          </h3>

          {low ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#fff0dd] px-2 py-1 text-[9px] font-semibold text-[#b86a24]">
              <AlertTriangle className="h-3 w-3" />
              Low stock
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-xs text-[#746876]">
          {item.qtyInStock.toLocaleString()}{" "}
          {item.unit} in stock · reorder at{" "}
          {item.reorderLevel.toLocaleString()}
        </p>

        <p className="mt-1 font-mono text-[10px] text-[#632a73]">
          {money(item.unitCostPkr)} per{" "}
          {item.unit}
        </p>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Delete ${item.name}`}
        className="grid h-9 w-9 place-items-center rounded-xl border border-[#dfd1c4] bg-[#fffaf6] text-[#746876] transition hover:border-[#efc3c0] hover:bg-[#fff0ee] hover:text-[#a7313b] disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </article>
  );
}

function LedgerRecord({
  entry,
  deleting,
  onDelete,
}: {
  entry: LedgerEntry;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-semibold capitalize">
            {entry.category}
          </h3>

          <span className="rounded-lg bg-[#f1e9e2] px-2 py-1 text-[9px] font-semibold text-[#632a73]">
            {ledgerTypeLabel(entry.type)}
          </span>
        </div>

        <p className="mt-1 text-xs text-[#746876]">
          {entry.entryDate}
          {entry.description
            ? ` · ${entry.description}`
            : ""}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="font-mono text-sm font-semibold text-[#b86a24]">
          {money(entry.amountPkr)}
        </p>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete ${entry.category} ledger entry`}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#dfd1c4] bg-[#fffaf6] text-[#746876] transition hover:border-[#efc3c0] hover:bg-[#fff0ee] hover:text-[#a7313b] disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[220px] place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
          <Icon className="h-5 w-5" />
        </span>

        <h3 className="mt-3 font-serif text-xl font-semibold">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#746876]">
          {description}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#fffaf6] p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
        {label}
      </p>

      <p
        className={`mt-2 font-mono text-xl font-semibold ${
          warning
            ? "text-[#b86a24]"
            : "text-[#241629]"
        }`}
      >
        {value}
      </p>

      {detail ? (
        <p
          className={`mt-2 text-[10px] leading-5 ${
            warning
              ? "text-[#b86a24]"
              : "text-[#746876]"
          }`}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}