import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetBakerAnalytics,
  useGetOrderSources,
  getGetBakerAnalyticsQueryKey,
  getGetOrderSourcesQueryKey,
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { Users, Megaphone, Sparkles, Percent, Calendar, Heart, Send, CheckCircle } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";
type Tab = "sales" | "marketing";

const PERIODS: { id: Period; label: string }[] = [
  { id: "daily", label: "7 days" },
  { id: "weekly", label: "4 weeks" },
  { id: "monthly", label: "90 days" },
];

const SOURCE_COLORS = ["#4A0E8F", "#F5C518", "#E879A9", "#6B7280"];

const SEGMENTS = [
  {
    id: "frequent_buyers",
    name: "Loyal Custom Buyers",
    description: "Ordered custom cakes 2+ times in the last 60 days.",
    count: 24,
    templates: {
      launch: "Salam! We just launched our premium Salted Caramel Fudge cake! Since you love our custom treats, get an exclusive early-bird taste. Reply to order!",
      discount: "Hi there! To thank you for being a loyal customer, here is a special 15% discount code: LOYAL15 for your next custom order!",
      festival: "Eid Mubarak! Celebrate Eid with Sana's customized festival platters. Pre-book your delivery today and get free delivery!"
    }
  },
  {
    id: "inactive_loyalists",
    name: "We Miss You (Inactive)",
    description: "Ordered 2+ times before, but inactive for over 30 days.",
    count: 15,
    templates: {
      launch: "Salam! We haven't heard from you in a while. We just launched our summer mango desserts! Try them out today.",
      discount: "Hi! We miss your orders. Here is a special 'Welcome Back' 20% discount code: WE_MISS_YOU on your next cake order!",
      festival: "Happy Independence Day! Commemorate the holiday with our signature green-and-white theme cupcakes. Place your order now!"
    }
  },
  {
    id: "festival_buyers",
    name: "Seasonal / Festival Buyers",
    description: "Only order during major holidays (Eid, Independence Day).",
    count: 42,
    templates: {
      launch: "Salam! Planning your next holiday gathering? Check out our brand new custom dessert table setups!",
      discount: "Salam! Get ready for the festive season with 10% off on all pre-orders using code: FESTIVAL10.",
      festival: "Eid Mubarak from Sana's Studio! Make this Eid sweeter with our handmade macarons and custom cakes. Pre-book yours today!"
    }
  }
];

export default function DashboardAnalytics() {
  const { bakerId } = useBuyerSession();
  const [period, setPeriod] = useState<Period>("monthly");
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  
  // Marketing Campaign State
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<typeof SEGMENTS[0] | null>(null);
  const [campaignType, setCampaignType] = useState<"launch" | "discount" | "festival">("launch");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignSentSuccess, setCampaignSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { data: analytics, isLoading } = useGetBakerAnalytics(bakerId, period, {
    query: { enabled: !!bakerId, queryKey: getGetBakerAnalyticsQueryKey(bakerId, period) },
  });

  const { data: sources } = useGetOrderSources(bakerId, {
    query: { enabled: !!bakerId, queryKey: getGetOrderSourcesQueryKey(bakerId) },
  });

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

  const handleOpenCampaign = (segment: typeof SEGMENTS[0]) => {
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

  const handleSendCampaign = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setCampaignSentSuccess(true);
      setTimeout(() => {
        setCampaignModalOpen(false);
        setCampaignSentSuccess(false);
      }, 2000);
    }, 1500);
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

        {isLoading ? (
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
                    {((analytics as any)?.topDeliveryAreas ?? []).map((item: { area: string; orders: number }) => (
                      <div key={item.area} className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                        <span className="font-semibold">{item.area}</span><span className="ml-2 font-mono text-xs">{item.orders} orders</span>
                      </div>
                    ))}
                    {!((analytics as any)?.topDeliveryAreas?.length) && <p className="text-sm text-muted-foreground">Delivery-area data appears after customers complete checkout.</p>}
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
                        <span className="font-mono font-bold text-emerald-600">32.4%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Orders Per returning Buyer</span>
                        <span className="font-mono font-bold">2.6 orders</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg. Customer Lifetime Value</span>
                        <span className="font-mono font-bold text-primary">PKR 8,400</span>
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
                      {SEGMENTS.map((segment) => (
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

                {/* Message Customization Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Customize Broadcast Message</label>
                  <textarea
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted/20 focus:ring-1 focus:ring-primary focus:outline-none resize-none text-foreground font-sans leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    💡 Variables like customer name will be automatically populated on dispatch.
                  </p>
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
