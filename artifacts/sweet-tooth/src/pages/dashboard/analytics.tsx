import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetBakerAnalytics,
  useGetOrderSources,
  useListCustomers,
  getGetBakerAnalyticsQueryKey,
  getGetOrderSourcesQueryKey,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { Users, Megaphone, Sparkles, Percent, Calendar, Heart, Send, CheckCircle } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { ANALYTICS_POLL_MS, liveDashboardQuery } from "@/lib/dashboard-query";

type Period = "daily" | "weekly" | "monthly";
type Tab = "sales" | "marketing";

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "7 days" },
  { id: "weekly", label: "4 weeks" },
  { id: "monthly", label: "90 days" },
];

const SOURCE_COLORS = ["#4A0E8F", "#F5C518", "#E879A9", "#6B7280"];

type CampaignSegment = {
  id: string;
  name: string;
  description: string;
  count: number;
  templates: {
    launch: string;
    discount: string;
    festival: string;
  };
};

function buildCampaignSegments(
  customers: Array<{ isRegular?: boolean; isAtRisk?: boolean; totalOrders?: number }>,
  bakeryName: string,
): CampaignSegment[] {
  const loyal = customers.filter((c) => c.isRegular && !c.isAtRisk);
  const inactive = customers.filter((c) => c.isAtRisk);
  const occasional = customers.filter((c) => !c.isRegular && !c.isAtRisk && (c.totalOrders ?? 0) > 0);

  return [
    {
      id: "frequent_buyers",
      name: "Loyal Custom Buyers",
      description: "Regular customers who ordered recently.",
      count: loyal.length,
      templates: {
        launch: `Salam! We just launched a new item at ${bakeryName}! Since you love our treats, reply to pre-order.`,
        discount: `Hi! Thank you for being a loyal ${bakeryName} customer — use LOYAL15 for 15% off your next order.`,
        festival: `Eid Mubarak from ${bakeryName}! Pre-book festival platters today for free delivery.`,
      },
    },
    {
      id: "inactive_loyalists",
      name: "We Miss You (Inactive)",
      description: "Past buyers who have not ordered in 30+ days.",
      count: inactive.length,
      templates: {
        launch: `Salam from ${bakeryName}! We miss you — try our latest seasonal menu this week.`,
        discount: `Welcome back to ${bakeryName}! Use WEMISSYOU for 20% off your next order.`,
        festival: `Happy holidays from ${bakeryName}! Celebrate with our limited festival boxes.`,
      },
    },
    {
      id: "festival_buyers",
      name: "Occasional / Festival Buyers",
      description: "Customers who order for special occasions.",
      count: occasional.length,
      templates: {
        launch: `Salam! Planning your next gathering? ${bakeryName} now offers custom dessert tables.`,
        discount: `Pre-order from ${bakeryName} with FESTIVAL10 for 10% off.`,
        festival: `Eid Mubarak! ${bakeryName} is taking Eid orders — reply to reserve yours.`,
      },
    },
  ];
}

export default function DashboardAnalytics() {
  const { bakerId } = useBuyerSession();
  const [period, setPeriod] = useState<Period>("monthly");
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  
  // Marketing Campaign State
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<CampaignSegment | null>(null);
  const [campaignType, setCampaignType] = useState<"launch" | "discount" | "festival">("launch");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignSentSuccess, setCampaignSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [lastBroadcastSummary, setLastBroadcastSummary] = useState<string | null>(null);

  const { data: analytics, isLoading } = useGetBakerAnalytics(bakerId, period, {
    query: {
      enabled: !!bakerId,
      queryKey: getGetBakerAnalyticsQueryKey(bakerId, period),
      ...liveDashboardQuery(ANALYTICS_POLL_MS),
    },
  });

  const { data: sources } = useGetOrderSources(bakerId, {
    query: {
      enabled: !!bakerId,
      queryKey: getGetOrderSourcesQueryKey(bakerId),
      ...liveDashboardQuery(ANALYTICS_POLL_MS),
    },
  });

  const { data: customers = [] } = useListCustomers(
    { bakerId },
    {
      query: {
        enabled: !!bakerId,
        queryKey: getListCustomersQueryKey({ bakerId }),
        ...liveDashboardQuery(ANALYTICS_POLL_MS),
      },
    },
  );

  const { data: feedbackStats } = useQuery({
    queryKey: ["feedback-analytics", bakerId],
    queryFn: () =>
      customFetch<{
        deliveredCount: number;
        feedbackReceived: number;
        feedbackPending: number;
        lovedIt: number;
        okay: number;
        hadIssue: number;
        satisfactionRate: number | null;
        happyRate: number | null;
      }>(`/api/analytics/baker/${bakerId}/feedback`),
    enabled: !!bakerId,
    refetchInterval: ANALYTICS_POLL_MS,
    refetchIntervalInBackground: false,
  });

  const segments = buildCampaignSegments(customers, "your bakery");
  const returningBuyers = customers.filter((c) => c.totalOrders > 1);
  const repeatOrderRatio =
    customers.length > 0
      ? Math.round((returningBuyers.length / customers.length) * 1000) / 10
      : 0;
  const avgOrdersPerReturning =
    returningBuyers.length > 0
      ? Math.round(
          (returningBuyers.reduce((sum, c) => sum + c.totalOrders, 0) / returningBuyers.length) * 10,
        ) / 10
      : 0;
  const avgCustomerLifetimeValue =
    customers.length > 0
      ? Math.round(customers.reduce((sum, c) => sum + c.totalSpentPkr, 0) / customers.length)
      : 0;

  const chartData = analytics?.dataPoints?.map((point) => ({
    label: format(parseISO(point.date), period === "daily" ? "EEE" : "MMM d"),
    orders: point.orders,
    revenue: point.revenue,
  })) ?? [];

  const sourceData = sources?.map((s) => ({
    name: s.source.replace(/_/g, " "),
    value: s.orders,
    percentage: s.percentage,
  })) ?? [];

  const handleOpenCampaign = (segment: CampaignSegment) => {
    setSelectedSegment(segment);
    setCampaignType("launch");
    setCampaignMessage(segment.templates.launch);
    setCampaignSentSuccess(false);
    setCampaignModalOpen(true);
  };

  const handleCampaignTypeChange = (type: "launch" | "discount" | "festival") => {
    setCampaignType(type);
    if (selectedSegment) {
      setCampaignMessage(selectedSegment.templates[type]);
    }
  };

  const handleSendCampaign = async () => {
    if (!bakerId || !campaignMessage.trim()) return;
    setIsSending(true);
    setBroadcastError(null);
    setLastBroadcastSummary(null);
    try {
      const result = await customFetch<{
        sent: number;
        failed: number;
        targeted?: number;
        mode: string;
      }>(`/api/bakers/${bakerId}/broadcast`, {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({
          message: campaignMessage.trim(),
          segment: selectedSegment?.id ?? "all",
          limit: Math.min(selectedSegment?.count || 50, 50),
        }),
      });
      setLastBroadcastSummary(
        `Sent ${result.sent} of ${result.targeted ?? result.sent + result.failed} via WhatsApp (${result.failed} failed).`,
      );
      setCampaignSentSuccess(true);
      setTimeout(() => {
        setCampaignModalOpen(false);
        setCampaignSentSuccess(false);
      }, 2200);
    } catch (cause) {
      setBroadcastError(
        cause instanceof Error
          ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "")
          : "Broadcast failed. Connect WhatsApp in Agent Hub first.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!bakerId || !campaignMessage.trim() || !testPhone.trim()) return;
    setBroadcastError(null);
    try {
      const result = await customFetch<{ sent: number; failed: number }>(
        `/api/bakers/${bakerId}/broadcast`,
        {
          method: "POST",
          responseType: "json",
          body: JSON.stringify({
            message: campaignMessage.trim(),
            testPhone: testPhone.trim(),
          }),
        },
      );
      setLastBroadcastSummary(
        result.sent
          ? `Test message delivered to ${testPhone.trim()}.`
          : `Test message failed for ${testPhone.trim()}.`,
      );
    } catch (cause) {
      setBroadcastError(
        cause instanceof Error
          ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "")
          : "Test send failed. Connect WhatsApp in Agent Hub first.",
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold font-serif text-primary">Analytics & Growth</h1>
            <p className="text-muted-foreground text-sm mt-1">Track performance and run marketing outreach campaigns.</p>
          </div>
          
          <div className="flex gap-4">
            {/* Sales vs Marketing Tab Switcher */}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
              <button
                onClick={() => setActiveTab("sales")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "sales" ? "bg-background shadow-xs text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📊 Performance
              </button>
              <button
                onClick={() => setActiveTab("marketing")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "marketing" ? "bg-background shadow-xs text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📣 Customer Outreach
              </button>
            </div>

            {activeTab === "sales" && (
              <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === p.id ? "bg-background shadow-xs text-primary border border-border/30" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && !analytics ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 bg-muted rounded-xl" />
              ))}
            </div>
            <div className="h-80 bg-muted rounded-xl w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold font-mono text-primary mt-2">PKR {analytics?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl font-bold font-mono mt-2">{analytics?.totalOrders || 0}</p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Order Value</p>
                <p className="text-2xl font-bold font-mono text-secondary mt-2">PKR {analytics?.avgOrderValue?.toLocaleString() || 0}</p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Customers</p>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">{analytics?.newCustomers || 0}</p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Repeat Customers</p>
                <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">{analytics?.repeatCustomers || 0}</p>
              </div>
            </div>

            {activeTab === "sales" ? (
              <>
                {feedbackStats && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-serif text-lg font-bold mb-1">Service quality (after delivery)</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      When you mark orders Delivered, buyers get a WhatsApp feedback request automatically.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold">Delivered</p>
                        <p className="text-2xl font-bold">{feedbackStats.deliveredCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold">Feedback received</p>
                        <p className="text-2xl font-bold text-primary">{feedbackStats.feedbackReceived}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold">Happy rate</p>
                        <p className="text-2xl font-bold text-green-700">
                          {feedbackStats.happyRate != null ? `${feedbackStats.happyRate}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold">Issues flagged</p>
                        <p className="text-2xl font-bold text-amber-700">{feedbackStats.hadIssue}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-green-100 text-green-800 px-3 py-1">Loved it: {feedbackStats.lovedIt}</span>
                      <span className="rounded-full bg-muted px-3 py-1">Okay: {feedbackStats.okay}</span>
                      <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1">Pending: {feedbackStats.feedbackPending}</span>
                    </div>
                  </div>
                )}

                {/* Revenue & Orders Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-4 text-foreground">Revenue over time</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Revenue"]} />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-4 text-foreground">Orders over time</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="orders" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sources & Top Products */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-4 text-foreground">Order sources</h3>
                    {sourceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percentage }) => `${name} (${percentage}%)`}>
                            {sourceData.map((_, i) => (
                              <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground">No source data yet.</p>
                    )}
                  </div>

                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-4 text-foreground">Top Products</h3>
                    <div className="space-y-4">
                      {analytics?.topProducts?.map((product, i) => (
                        <div key={i} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.orders} orders</p>
                          </div>
                          <p className="font-mono font-medium text-primary">PKR {product.revenue.toLocaleString()}</p>
                        </div>
                      ))}
                      {(!analytics?.topProducts || analytics.topProducts.length === 0) && (
                        <p className="text-muted-foreground">No data available.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-serif text-xl font-bold">7-day sales estimate</h3>
                    <p className="mt-3 text-3xl font-bold font-mono text-primary">
                      PKR {analytics?.salesForecast?.next7DaysRevenue.toLocaleString() ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      About {analytics?.salesForecast?.next7DaysOrders ?? 0} orders · {analytics?.salesForecast?.confidence ?? "low"} confidence
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Simple {analytics?.salesForecast?.method ?? "historical run-rate estimate"}; this is planning guidance, not a guarantee.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-3">Customer price bands</h3>
                    <div className="space-y-3">
                      {analytics?.priceBands?.map((band) => (
                        <div key={band.name} className="flex items-center justify-between gap-3 text-sm">
                          <div><p className="font-medium">{band.name}</p><p className="text-xs text-muted-foreground">{band.orders} orders</p></div>
                          <span className="font-mono">PKR {band.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-3">Product momentum</h3>
                    <div className="space-y-3">
                      {analytics?.productTrends?.map((trend) => (
                        <div key={trend.name} className="flex items-center justify-between gap-3 text-sm">
                          <div><p className="font-medium">{trend.name}</p><p className="text-xs text-muted-foreground">{trend.currentOrders} vs {trend.previousOrders} prior</p></div>
                          <span className={`font-mono font-semibold ${trend.changePercent >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {trend.changePercent >= 0 ? "+" : ""}{trend.changePercent}%
                          </span>
                        </div>
                      ))}
                      {!analytics?.productTrends?.length && <p className="text-sm text-muted-foreground">Product trends appear after orders are recorded.</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold">Order cancellations</h3>
                    <p className="mt-2 text-3xl font-bold font-mono text-destructive">{analytics?.cancellationAnalytics?.total ?? 0}</p>
                    <p className="text-sm text-muted-foreground">{analytics?.cancellationAnalytics?.rate ?? 0}% of all orders</p>
                  </div>
                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-3">Why orders cancel</h3>
                    <div className="space-y-2 text-sm">
                      {analytics?.cancellationAnalytics?.byReason?.slice(0, 4).map((item) => <div key={item.name} className="flex justify-between gap-3"><span className="truncate">{item.name}</span><span className="font-mono">{item.count}</span></div>)}
                      {!analytics?.cancellationAnalytics?.byReason?.length && <p className="text-muted-foreground">No cancellation data yet.</p>}
                    </div>
                  </div>
                  <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-serif text-xl font-bold mb-3">Products affected</h3>
                    <div className="space-y-2 text-sm">
                      {analytics?.cancellationAnalytics?.byProduct?.slice(0, 4).map((item) => <div key={item.name} className="flex justify-between gap-3"><span className="truncate">{item.name}</span><span className="font-mono">{item.count}</span></div>)}
                      {!analytics?.cancellationAnalytics?.byProduct?.length && <p className="text-muted-foreground">No cancelled products yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="font-serif text-xl font-bold">Most requested delivery areas</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Based on checkout locations from your marketplace orders.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(analytics?.topDeliveryAreas ?? []).map((item) => (
                      <div key={item.area} className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                        <span className="font-semibold">{item.area}</span><span className="ml-2 font-mono text-xs">{item.orders} orders</span>
                      </div>
                    ))}
                    {!analytics?.topDeliveryAreas?.length && <p className="text-sm text-muted-foreground">Delivery-area data appears after customers complete checkout.</p>}
                  </div>
                </div>
              </>
            ) : (
              /* Returning Customer Activity & Marketing Outreach Hub */
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Returning Customer Activity Insight card */}
                  <div className="lg:col-span-1 p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <Users className="w-6 h-6" />
                      <h3 className="font-serif text-xl font-bold">Loyalty Retention</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Analyze repeat buyer patterns. Bakers who reach out to past customers with discount coupons or new product announcements during festivals double their sales conversion.
                    </p>

                    <div className="pt-4 border-t border-border/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Repeat Order Ratio</span>
                        <span className="font-mono font-bold text-emerald-600">{repeatOrderRatio}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Orders Per returning Buyer</span>
                        <span className="font-mono font-bold">{avgOrdersPerReturning} orders</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Customer Lifetime Value</span>
                        <span className="font-mono font-bold text-primary">PKR {avgCustomerLifetimeValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Smart customer marketing panel */}
                  <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-card shadow-sm space-y-6">
                    <div>
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="font-serif text-xl font-bold">Sweet Tooth Smart Campaigns</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Select a customer segment below to blast custom WhatsApp/SMS announcements automatically.</p>
                    </div>

                    <div className="space-y-4">
                      {segments.map((segment) => (
                        <div key={segment.id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/40 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-foreground">{segment.name}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {segment.count} customers
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{segment.description}</p>
                          </div>

                          <button
                            onClick={() => handleOpenCampaign(segment)}
                            className="w-full sm:w-auto shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            Launch Campaign
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign Details Modal */}
      {campaignModalOpen && selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-200">
            {campaignSentSuccess ? (
              <div className="py-8 text-center space-y-3 flex flex-col items-center justify-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />
                <h3 className="text-xl font-bold font-serif text-foreground">Campaign Sent!</h3>
                <p className="text-sm text-muted-foreground">
                  Your broadcast has been successfully queued and sent to {selectedSegment.count} customers!
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-border pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold font-serif text-primary">Outreach Broadcast</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Targeting: {selectedSegment.name} ({selectedSegment.count} buyers)</p>
                  </div>
                  <button
                    onClick={() => setCampaignModalOpen(false)}
                    className="text-muted-foreground hover:text-foreground text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Campaign Type Tab Selectors */}
                <div className="grid grid-cols-3 gap-2 bg-muted/50 p-1 rounded-xl">
                  <button
                    onClick={() => handleCampaignTypeChange("launch")}
                    className={`py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      campaignType === "launch" ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    New Launch
                  </button>
                  <button
                    onClick={() => handleCampaignTypeChange("discount")}
                    className={`py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      campaignType === "discount" ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    Discount
                  </button>
                  <button
                    onClick={() => handleCampaignTypeChange("festival")}
                    className={`py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      campaignType === "festival" ? "bg-background text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    Festival Special
                  </button>
                </div>

                {/* Message Customization Input & WhatsApp Preview */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customize Broadcast Message</label>
                    <textarea
                      value={campaignMessage}
                      onChange={(e) => setCampaignMessage(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none resize-none text-foreground font-sans leading-relaxed"
                    />
                  </div>

                  {/* Live WhatsApp Preview */}
                  <div className="border border-border rounded-xl bg-muted/30 p-3 space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Live WhatsApp Broadcast Preview</span>
                    <div className="rounded-lg p-3 bg-[#e5ddd5] dark:bg-zinc-800 border border-[#b4a996]/30 text-zinc-800 dark:text-zinc-100 flex flex-col gap-1 max-w-sm mx-auto shadow-sm">
                      <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md flex items-center justify-between">
                        <span>Sweet Tooth Agent</span>
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-950 p-2.5 rounded-b-md rounded-tr-md text-xs relative shadow-xs leading-relaxed">
                        <p className="whitespace-pre-wrap">{campaignMessage}</p>
                        <span className="absolute bottom-1 right-2 text-[9px] text-muted-foreground">Delivered</span>
                      </div>
                    </div>
                  </div>

                  {/* Test Send Input */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Send Test WhatsApp (Optional)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="e.g. +92 300 1234567"
                        className="flex-1 px-3 py-1.5 border border-border rounded-lg text-xs bg-background text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendTest()}
                        disabled={!campaignMessage.trim() || !testPhone.trim()}
                        className="px-3 py-1.5 bg-secondary text-primary rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Send Test
                      </button>
                    </div>
                    {broadcastError && (
                      <p role="alert" className="text-xs text-destructive">{broadcastError}</p>
                    )}
                    {lastBroadcastSummary && !broadcastError && (
                      <p className="text-xs text-muted-foreground">{lastBroadcastSummary}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Requires a connected WhatsApp Business number in Agent Hub. Broadcasts use real CRM segment filters (loyal / inactive / occasional).
                    </p>
                  </div>
                </div>

                {/* Send button */}
                <button
                  onClick={handleSendCampaign}
                  disabled={isSending || !campaignMessage.trim()}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? "Dispatching broadcast..." : `Send Broadcast to ${selectedSegment.count} Customers`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
