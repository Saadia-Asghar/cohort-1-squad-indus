import {
  useState,
  type ComponentType,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  customFetch,
  getGetBakerAnalyticsQueryKey,
  getGetOrderSourcesQueryKey,
  getGetWeeklySuccessReportQueryKey,
  getListCustomersQueryKey,
  useGetBaker,
  useGetBakerAnalytics,
  useGetOrderSources,
  useGetWeeklySuccessReport,
  useListCustomers,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Heart,
  Megaphone,
  PackageCheck,
  Percent,
  Send,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";
import {
  ANALYTICS_POLL_MS,
  liveDashboardQuery,
} from "@/lib/dashboard-query";
import { exportAnalyticsPDF } from "@/lib/pdf-export";

type Period = "daily" | "weekly" | "monthly";
type Tab = "sales" | "marketing";

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

const periods: {
  id: Period;
  label: string;
}[] = [
  {
    id: "daily",
    label: "7 days",
  },
  {
    id: "weekly",
    label: "4 weeks",
  },
  {
    id: "monthly",
    label: "90 days",
  },
];

const sourceColors = [
  "#632a73",
  "#c24f7a",
  "#d8a846",
  "#168a55",
  "#746876",
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-3.5 text-sm text-[#241629] outline-none transition placeholder:text-[#a99ca9] focus:border-[#c24f7a]/60 focus:ring-4 focus:ring-[#c24f7a]/10";

function buildCampaignSegments(
  customers: Array<{
    isRegular?: boolean;
    isAtRisk?: boolean;
    totalOrders?: number;
  }>,
  bakeryName: string,
): CampaignSegment[] {
  const loyal = customers.filter(
    (customer) =>
      customer.isRegular && !customer.isAtRisk,
  );

  const inactive = customers.filter(
    (customer) => customer.isAtRisk,
  );

  const occasional = customers.filter(
    (customer) =>
      !customer.isRegular &&
      !customer.isAtRisk &&
      (customer.totalOrders ?? 0) > 0,
  );

  return [
    {
      id: "frequent_buyers",
      name: "Loyal custom buyers",
      description:
        "Regular customers who ordered recently.",
      count: loyal.length,
      templates: {
        launch: `Salam! We just launched a new item at ${bakeryName}! Since you love our treats, reply to pre-order.`,
        discount: `Hi! Thank you for being a loyal ${bakeryName} customer — use LOYAL15 for 15% off your next order.`,
        festival: `Eid Mubarak from ${bakeryName}! Pre-book festival platters today for free delivery.`,
      },
    },
    {
      id: "inactive_loyalists",
      name: "We miss you",
      description:
        "Past buyers who have not ordered in 30+ days.",
      count: inactive.length,
      templates: {
        launch: `Salam from ${bakeryName}! We miss you — try our latest seasonal menu this week.`,
        discount: `Welcome back to ${bakeryName}! Use WEMISSYOU for 20% off your next order.`,
        festival: `Happy holidays from ${bakeryName}! Celebrate with our limited festival boxes.`,
      },
    },
    {
      id: "festival_buyers",
      name: "Occasional buyers",
      description:
        "Customers who order for special occasions.",
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
  const { data: baker } = useGetBaker(bakerId);

  const [period, setPeriod] =
    useState<Period>("monthly");

  const [activeTab, setActiveTab] =
    useState<Tab>("sales");

  const [campaignModalOpen, setCampaignModalOpen] =
    useState(false);

  const [selectedSegment, setSelectedSegment] =
    useState<CampaignSegment | null>(null);

  const [campaignType, setCampaignType] = useState<
    "launch" | "discount" | "festival"
  >("launch");

  const [campaignMessage, setCampaignMessage] =
    useState("");

  const [
    campaignSentSuccess,
    setCampaignSentSuccess,
  ] = useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [broadcastError, setBroadcastError] =
    useState<string | null>(null);

  const [testPhone, setTestPhone] = useState("");

  const [
    lastBroadcastSummary,
    setLastBroadcastSummary,
  ] = useState<string | null>(null);

  const { data: analytics, isLoading } =
    useGetBakerAnalytics(bakerId, period, {
      query: {
        enabled: Boolean(bakerId),
        queryKey:
          getGetBakerAnalyticsQueryKey(
            bakerId,
            period,
          ),
        ...liveDashboardQuery(
          ANALYTICS_POLL_MS,
        ),
      },
    });

  const { data: sources } =
    useGetOrderSources(bakerId, {
      query: {
        enabled: Boolean(bakerId),
        queryKey:
          getGetOrderSourcesQueryKey(bakerId),
        ...liveDashboardQuery(
          ANALYTICS_POLL_MS,
        ),
      },
    });

  const { data: weeklyReport } =
    useGetWeeklySuccessReport(bakerId, {
      query: {
        enabled: Boolean(bakerId),
        queryKey:
          getGetWeeklySuccessReportQueryKey(
            bakerId,
          ),
        ...liveDashboardQuery(
          ANALYTICS_POLL_MS,
        ),
      },
    });

  const { data: customers = [] } =
    useListCustomers(
      { bakerId },
      {
        query: {
          enabled: Boolean(bakerId),
          queryKey: getListCustomersQueryKey({
            bakerId,
          }),
          ...liveDashboardQuery(
            ANALYTICS_POLL_MS,
          ),
        },
      },
    );

  const { data: feedbackStats } = useQuery({
    queryKey: [
      "feedback-analytics",
      bakerId,
    ],
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
      }>(
        `/api/analytics/baker/${bakerId}/feedback`,
      ),
    enabled: Boolean(bakerId),
    refetchInterval: ANALYTICS_POLL_MS,
    refetchIntervalInBackground: false,
  });

  const segments = buildCampaignSegments(
    customers,
    "your bakery",
  );

  const returningBuyers = customers.filter(
    (customer) => customer.totalOrders > 1,
  );

  const repeatOrderRatio =
    customers.length > 0
      ? Math.round(
          (returningBuyers.length /
            customers.length) *
            1000,
        ) / 10
      : 0;

  const avgOrdersPerReturning =
    returningBuyers.length > 0
      ? Math.round(
          (returningBuyers.reduce(
            (sum, customer) =>
              sum + customer.totalOrders,
            0,
          ) /
            returningBuyers.length) *
            10,
        ) / 10
      : 0;

  const avgCustomerLifetimeValue =
    customers.length > 0
      ? Math.round(
          customers.reduce(
            (sum, customer) =>
              sum +
              customer.totalSpentPkr,
            0,
          ) / customers.length,
        )
      : 0;

  const chartData =
    analytics?.dataPoints?.map((point) => ({
      label: format(
        parseISO(point.date),
        period === "daily"
          ? "EEE"
          : "MMM d",
      ),
      orders: point.orders,
      revenue: point.revenue,
    })) ?? [];

  const sourceData =
    sources?.map((source) => ({
      name: source.source
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase(),
        ),
      value: source.orders,
      percentage: source.percentage,
    })) ?? [];

  const handleOpenCampaign = (
    segment: CampaignSegment,
  ) => {
    setSelectedSegment(segment);
    setCampaignType("launch");
    setCampaignMessage(
      segment.templates.launch,
    );
    setCampaignSentSuccess(false);
    setBroadcastError(null);
    setLastBroadcastSummary(null);
    setCampaignModalOpen(true);
  };

  const closeCampaign = () => {
    setCampaignModalOpen(false);
    setBroadcastError(null);
    setLastBroadcastSummary(null);
  };

  const handleCampaignTypeChange = (
    type:
      | "launch"
      | "discount"
      | "festival",
  ) => {
    setCampaignType(type);

    if (selectedSegment) {
      setCampaignMessage(
        selectedSegment.templates[type],
      );
    }
  };

  const handleSendCampaign = async () => {
    if (
      !bakerId ||
      !campaignMessage.trim()
    ) {
      return;
    }

    setIsSending(true);
    setBroadcastError(null);
    setLastBroadcastSummary(null);

    try {
      const result = await customFetch<{
        sent: number;
        failed: number;
        targeted?: number;
        mode: string;
      }>(
        `/api/bakers/${bakerId}/broadcast`,
        {
          method: "POST",
          responseType: "json",
          body: JSON.stringify({
            message:
              campaignMessage.trim(),
            segment:
              selectedSegment?.id ?? "all",
            limit: Math.min(
              selectedSegment?.count || 50,
              50,
            ),
          }),
        },
      );

      setLastBroadcastSummary(
        `Sent ${result.sent} of ${
          result.targeted ??
          result.sent + result.failed
        } via WhatsApp (${result.failed} failed).`,
      );

      setCampaignSentSuccess(true);

      window.setTimeout(() => {
        setCampaignModalOpen(false);
        setCampaignSentSuccess(false);
      }, 2200);
    } catch (cause) {
      setBroadcastError(
        cause instanceof Error
          ? cause.message.replace(
              /^HTTP \d+\s*[^:]*:\s*/,
              "",
            )
          : "Broadcast failed. Connect WhatsApp in Agent Hub first.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    if (
      !bakerId ||
      !campaignMessage.trim() ||
      !testPhone.trim()
    ) {
      return;
    }

    setBroadcastError(null);
    setLastBroadcastSummary(null);

    try {
      const result = await customFetch<{
        sent: number;
        failed: number;
      }>(
        `/api/bakers/${bakerId}/broadcast`,
        {
          method: "POST",
          responseType: "json",
          body: JSON.stringify({
            message:
              campaignMessage.trim(),
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
          ? cause.message.replace(
              /^HTTP \d+\s*[^:]*:\s*/,
              "",
            )
          : "Test send failed. Connect WhatsApp in Agent Hub first.",
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c24f7a]">
                Business intelligence
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Analytics
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746876]">
                Understand revenue, customer
                behaviour, service quality and
                marketing opportunities using your
                bakery&apos;s live activity.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex rounded-xl border border-[#dfd1c4] bg-[#f4eae1] p-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab("sales")
                  }
                  className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition ${
                    activeTab === "sales"
                      ? "bg-white text-[#632a73] shadow-sm"
                      : "text-[#746876]"
                  }`}
                >
                  Performance
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab("marketing")
                  }
                  className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition ${
                    activeTab === "marketing"
                      ? "bg-white text-[#632a73] shadow-sm"
                      : "text-[#746876]"
                  }`}
                >
                  Customer outreach
                </button>
              </div>

              {activeTab === "sales" ? (
                <div className="flex rounded-xl border border-[#dfd1c4] bg-[#fffaf6] p-1">
                  {periods.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setPeriod(item.id)
                      }
                      className={`min-h-10 rounded-lg px-3 text-xs font-semibold transition ${
                        period === item.id
                          ? "bg-[#632a73] text-white"
                          : "text-[#746876]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  exportAnalyticsPDF(
                    analytics,
                    weeklyReport,
                    feedbackStats,
                    chartData,
                    sourceData,
                    period,
                    baker?.businessName ?? "My Bakery"
                  )
                }
                disabled={isLoading || !analytics}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfd1c4] bg-[#632a73] px-4 text-xs font-bold text-white transition hover:bg-[#c24f7a] disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </header>

          <section className="grid border-b border-[#dfd1c4] sm:grid-cols-2 xl:grid-cols-5">
            <AnalyticsMetric
              icon={CircleDollarSign}
              label="Revenue"
              value={`PKR ${(
                analytics?.totalRevenue ?? 0
              ).toLocaleString()}`}
              valueClass="text-[#168a55]"
            />

            <AnalyticsMetric
              icon={ShoppingBag}
              label="Orders"
              value={(analytics?.totalOrders ?? 0)
                .toString()
                .padStart(2, "0")}
            />

            <AnalyticsMetric
              icon={PackageCheck}
              label="Average order"
              value={`PKR ${(
                analytics?.avgOrderValue ?? 0
              ).toLocaleString()}`}
              valueClass="text-[#632a73]"
            />

            <AnalyticsMetric
              icon={Users}
              label="New customers"
              value={(analytics?.newCustomers ?? 0)
                .toString()
                .padStart(2, "0")}
              valueClass="text-[#c24f7a]"
            />

            <AnalyticsMetric
              icon={Heart}
              label="Repeat customers"
              value={(
                analytics?.repeatCustomers ?? 0
              )
                .toString()
                .padStart(2, "0")}
              valueClass="text-[#b86a24]"
            />
          </section>

          {isLoading && !analytics ? (
            <div className="mt-5 space-y-4">
              <div className="h-40 animate-pulse rounded-2xl bg-[#f1e9e2]" />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-80 animate-pulse rounded-2xl bg-[#f1e9e2]" />
                <div className="h-80 animate-pulse rounded-2xl bg-[#f1e9e2]" />
              </div>
            </div>
          ) : activeTab === "sales" ? (
            <PerformanceView
              analytics={analytics}
              weeklyReport={weeklyReport}
              feedbackStats={feedbackStats}
              chartData={chartData}
              sourceData={sourceData}
              period={period}
            />
          ) : (
            <OutreachView
              segments={segments}
              repeatOrderRatio={
                repeatOrderRatio
              }
              avgOrdersPerReturning={
                avgOrdersPerReturning
              }
              avgCustomerLifetimeValue={
                avgCustomerLifetimeValue
              }
              customerCount={customers.length}
              onOpenCampaign={
                handleOpenCampaign
              }
            />
          )}
        </div>
      </div>

      {campaignModalOpen &&
      selectedSegment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241629]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-title"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-3xl border border-[#dfd1c4] bg-[#fbf6ee] text-[#241629] shadow-2xl">
            {campaignSentSuccess ? (
              <div className="grid min-h-[420px] place-items-center p-8 text-center">
                <div>
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e4f3e8] text-[#168a55]">
                    <CheckCircle2 className="h-10 w-10" />
                  </span>

                  <h2 className="mt-5 font-serif text-3xl font-semibold">
                    Campaign sent
                  </h2>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#746876]">
                    The broadcast was processed for
                    the selected customer group.
                  </p>

                  {lastBroadcastSummary ? (
                    <p className="mt-3 text-xs font-semibold text-[#168a55]">
                      {lastBroadcastSummary}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-[#dfd1c4] px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c24f7a]">
                      WhatsApp outreach
                    </p>

                    <h2
                      id="campaign-title"
                      className="mt-2 font-serif text-3xl font-semibold"
                    >
                      Create campaign
                    </h2>

                    <p className="mt-2 text-sm text-[#746876]">
                      {selectedSegment.name} ·{" "}
                      {selectedSegment.count}{" "}
                      customers
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeCampaign}
                    aria-label="Close campaign composer"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-white/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#dfd1c4] bg-[#f4eae1] p-1">
                    <CampaignTypeButton
                      active={
                        campaignType === "launch"
                      }
                      icon={Sparkles}
                      label="New launch"
                      onClick={() =>
                        handleCampaignTypeChange(
                          "launch",
                        )
                      }
                    />

                    <CampaignTypeButton
                      active={
                        campaignType ===
                        "discount"
                      }
                      icon={Percent}
                      label="Discount"
                      onClick={() =>
                        handleCampaignTypeChange(
                          "discount",
                        )
                      }
                    />

                    <CampaignTypeButton
                      active={
                        campaignType ===
                        "festival"
                      }
                      icon={CalendarDays}
                      label="Festival"
                      onClick={() =>
                        handleCampaignTypeChange(
                          "festival",
                        )
                      }
                    />
                  </div>

                  <label className="mt-5 grid gap-2">
                    <span className="text-sm font-semibold">
                      Broadcast message
                    </span>

                    <textarea
                      value={campaignMessage}
                      onChange={(event) =>
                        setCampaignMessage(
                          event.target.value,
                        )
                      }
                      rows={5}
                      maxLength={900}
                      className="w-full resize-none rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4 text-sm leading-6 outline-none transition focus:border-[#c24f7a]/60 focus:ring-4 focus:ring-[#c24f7a]/10"
                    />
                  </label>

                  <div className="mt-2 flex justify-end text-[10px] text-[#746876]">
                    {campaignMessage.length}/900
                  </div>

                  <section className="mt-5 rounded-2xl border border-[#dfd1c4] bg-[#f1e9e2] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
                      WhatsApp preview
                    </p>

                    <div className="mt-3 rounded-2xl bg-[#dfe6dc] p-3">
                      <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-white px-4 py-3 shadow-sm">
                        <p className="whitespace-pre-wrap text-xs leading-5 text-[#3f373f]">
                          {campaignMessage ||
                            "Your message preview will appear here."}
                        </p>

                        <p className="mt-2 text-right text-[8px] text-[#8b8089]">
                          {new Date().toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}{" "}
                          ✓✓
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="mt-5 rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4">
                    <p className="text-sm font-semibold">
                      Test message
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#746876]">
                      Send the campaign to one phone
                      number before broadcasting it.
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={(event) =>
                          setTestPhone(
                            event.target.value,
                          )
                        }
                        placeholder="+92 300 1234567"
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          void handleSendTest()
                        }
                        disabled={
                          !campaignMessage.trim() ||
                          !testPhone.trim()
                        }
                        className="min-h-11 rounded-xl border border-[#dcb8c8] bg-[#fff0f5] px-4 text-xs font-semibold text-[#632a73] disabled:opacity-40"
                      >
                        Send test
                      </button>
                    </div>
                  </section>

                  {broadcastError ? (
                    <p
                      role="alert"
                      className="mt-4 rounded-xl bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[#a7313b]"
                    >
                      {broadcastError}
                    </p>
                  ) : null}

                  {lastBroadcastSummary &&
                  !broadcastError ? (
                    <p
                      role="status"
                      className="mt-4 rounded-xl bg-[#e4f3e8] px-4 py-3 text-sm font-semibold text-[#168a55]"
                    >
                      {lastBroadcastSummary}
                    </p>
                  ) : null}

                  <p className="mt-4 text-[10px] leading-5 text-[#746876]">
                    A connected WhatsApp Business
                    number is required in Agent Hub.
                    Campaigns use real CRM customer
                    segments.
                  </p>
                </div>

                <div className="border-t border-[#dfd1c4] px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={
                      handleSendCampaign
                    }
                    disabled={
                      isSending ||
                      !campaignMessage.trim()
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />

                    {isSending
                      ? "Sending campaign…"
                      : `Send to ${selectedSegment.count} customers`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function PerformanceView({
  analytics,
  weeklyReport,
  feedbackStats,
  chartData,
  sourceData,
  period,
}: {
  analytics: any;
  weeklyReport: any;
  feedbackStats:
    | {
        deliveredCount: number;
        feedbackReceived: number;
        feedbackPending: number;
        lovedIt: number;
        okay: number;
        hadIssue: number;
        satisfactionRate: number | null;
        happyRate: number | null;
      }
    | undefined;
  chartData: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  sourceData: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  period: Period;
}) {
  return (
    <div className="mt-5 space-y-4">
      {weeklyReport ? (
        <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
          <div className="flex flex-col gap-3 border-b border-[#dfd1c4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
                Seven-day report
              </p>

              <h2 className="mt-1 font-serif text-2xl font-semibold">
                Weekly performance
              </h2>
            </div>

            <TrendBadge
              value={
                weeklyReport.ordersTrendPercent
              }
            />
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            <CompactStat
              label="Weekly orders"
              value={weeklyReport.ordersCount}
              detail="Compared with the previous week"
            />

            <CompactStat
              label="Repeat buyers"
              value={
                weeklyReport.repeatBuyersCount
              }
              detail="Active returning customers"
            />

            <CompactStat
              label="Assistant response"
              value={`${weeklyReport.avgResponseTimeSec}s`}
              detail="Average response time"
            />

            <CompactStat
              label="Payment issues"
              value={
                weeklyReport.failedPaymentReviewsCount
              }
              detail="Reviews requiring attention"
              warning={
                weeklyReport.failedPaymentReviewsCount >
                0
              }
            />
          </div>
        </section>
      ) : null}

      {feedbackStats ? (
        <section className="grid gap-4 rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
          <div>
            <Heart className="h-5 w-5 text-[#c24f7a]" />

            <h2 className="mt-3 font-serif text-2xl font-semibold">
              Service quality
            </h2>

            <p className="mt-2 max-w-md text-xs leading-5 text-[#746876]">
              Feedback requested after orders are
              marked as delivered.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <FeedbackPill
                label="Loved it"
                value={feedbackStats.lovedIt}
                tone="positive"
              />

              <FeedbackPill
                label="Okay"
                value={feedbackStats.okay}
              />

              <FeedbackPill
                label="Pending"
                value={
                  feedbackStats.feedbackPending
                }
                tone="warning"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniValue
              label="Delivered"
              value={feedbackStats.deliveredCount}
            />

            <MiniValue
              label="Responses"
              value={
                feedbackStats.feedbackReceived
              }
            />

            <MiniValue
              label="Happy rate"
              value={
                feedbackStats.happyRate !== null
                  ? `${feedbackStats.happyRate}%`
                  : "—"
              }
              positive
            />

            <MiniValue
              label="Issues"
              value={feedbackStats.hadIssue}
              warning={
                feedbackStats.hadIssue > 0
              }
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Revenue over time"
          description={`Revenue recorded during the selected ${period} period.`}
        >
          {chartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={280}
            >
              <LineChart data={chartData}>
                <CartesianGrid
                  stroke="#eadfd5"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 10,
                    fill: "#746876",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#746876",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value: number) => [
                    `PKR ${value.toLocaleString()}`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#dfd1c4",
                    background: "#fffaf6",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#632a73"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#c24f7a",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartPanel>

        <ChartPanel
          title="Orders over time"
          description="Daily order volume for the selected reporting period."
        >
          {chartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={280}
            >
              <BarChart data={chartData}>
                <CartesianGrid
                  stroke="#eadfd5"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 10,
                    fill: "#746876",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 10,
                    fill: "#746876",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#dfd1c4",
                    background: "#fffaf6",
                  }}
                />

                <Bar
                  dataKey="orders"
                  fill="#c24f7a"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Order sources"
          description="Where your customer orders originated."
        >
          {sourceData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={290}
            >
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {sourceData.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        fill={
                          sourceColors[
                            index %
                              sourceColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Pie>

                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#dfd1c4",
                    background: "#fffaf6",
                  }}
                />

                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </ChartPanel>

        <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
            Product performance
          </p>

          <h2 className="mt-1 font-serif text-2xl font-semibold">
            Top products
          </h2>

          <div className="mt-5 divide-y divide-[#eadfd5]">
            {analytics?.topProducts?.length ? (
              analytics.topProducts.map(
                (
                  product: {
                    name: string;
                    orders: number;
                    revenue: number;
                  },
                  index: number,
                ) => (
                  <div
                    key={`${product.name}-${index}`}
                    className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0"
                  >
                    <span className="font-mono text-xs font-semibold text-[#c24f7a]">
                      {(index + 1)
                        .toString()
                        .padStart(2, "0")}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {product.name}
                      </p>

                      <p className="mt-1 text-[10px] text-[#746876]">
                        {product.orders} orders
                      </p>
                    </div>

                    <p className="font-mono text-xs font-semibold text-[#632a73]">
                      PKR{" "}
                      {product.revenue.toLocaleString()}
                    </p>
                  </div>
                ),
              )
            ) : (
              <EmptyMessage text="Product performance appears after orders are recorded." />
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          eyebrow="Planning estimate"
          title="Next seven days"
          icon={TrendingUp}
        >
          <p className="font-mono text-2xl font-semibold text-[#632a73]">
            PKR{" "}
            {(
              analytics?.salesForecast
                ?.next7DaysRevenue ?? 0
            ).toLocaleString()}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#746876]">
            Approximately{" "}
            {analytics?.salesForecast
              ?.next7DaysOrders ?? 0}{" "}
            orders ·{" "}
            {analytics?.salesForecast
              ?.confidence ?? "low"}{" "}
            confidence.
          </p>

          <p className="mt-3 text-[10px] leading-5 text-[#9b8d9c]">
            Planning guidance based on{" "}
            {analytics?.salesForecast?.method ??
              "historical activity"}.
          </p>
        </InsightCard>

        <InsightCard
          eyebrow="Customer spend"
          title="Price bands"
          icon={CircleDollarSign}
        >
          <div className="space-y-3">
            {analytics?.priceBands?.length ? (
              analytics.priceBands.map(
                (band: {
                  name: string;
                  orders: number;
                  revenue: number;
                }) => (
                  <InsightRow
                    key={band.name}
                    label={band.name}
                    detail={`${band.orders} orders`}
                    value={`PKR ${band.revenue.toLocaleString()}`}
                  />
                ),
              )
            ) : (
              <EmptyMessage text="Customer price bands appear after orders are recorded." />
            )}
          </div>
        </InsightCard>

        <InsightCard
          eyebrow="Product movement"
          title="Momentum"
          icon={Sparkles}
        >
          <div className="space-y-3">
            {analytics?.productTrends?.length ? (
              analytics.productTrends.map(
                (trend: {
                  name: string;
                  currentOrders: number;
                  previousOrders: number;
                  changePercent: number;
                }) => (
                  <InsightRow
                    key={trend.name}
                    label={trend.name}
                    detail={`${trend.currentOrders} vs ${trend.previousOrders} prior`}
                    value={`${
                      trend.changePercent >= 0
                        ? "+"
                        : ""
                    }${trend.changePercent}%`}
                    positive={
                      trend.changePercent >= 0
                    }
                    warning={
                      trend.changePercent < 0
                    }
                  />
                ),
              )
            ) : (
              <EmptyMessage text="Product momentum appears after enough sales history is collected." />
            )}
          </div>
        </InsightCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.7fr_1fr_1fr]">
        <InsightCard
          eyebrow="Order health"
          title="Cancellations"
          icon={AlertTriangle}
        >
          <p className="font-mono text-3xl font-semibold text-[#a7313b]">
            {analytics?.cancellationAnalytics
              ?.total ?? 0}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#746876]">
            {analytics?.cancellationAnalytics
              ?.rate ?? 0}
            % of recorded orders.
          </p>
        </InsightCard>

        <InsightCard
          eyebrow="Cancellation reasons"
          title="Why orders cancel"
          icon={TrendingDown}
        >
          <div className="space-y-3">
            {analytics?.cancellationAnalytics
              ?.byReason?.length ? (
              analytics.cancellationAnalytics.byReason
                .slice(0, 4)
                .map(
                  (item: {
                    name: string;
                    count: number;
                  }) => (
                    <InsightRow
                      key={item.name}
                      label={item.name}
                      value={item.count.toString()}
                    />
                  ),
                )
            ) : (
              <EmptyMessage text="No cancellation reasons have been recorded." />
            )}
          </div>
        </InsightCard>

        <InsightCard
          eyebrow="Affected products"
          title="Product impact"
          icon={PackageCheck}
        >
          <div className="space-y-3">
            {analytics?.cancellationAnalytics
              ?.byProduct?.length ? (
              analytics.cancellationAnalytics.byProduct
                .slice(0, 4)
                .map(
                  (item: {
                    name: string;
                    count: number;
                  }) => (
                    <InsightRow
                      key={item.name}
                      label={item.name}
                      value={item.count.toString()}
                    />
                  ),
                )
            ) : (
              <EmptyMessage text="No cancelled products have been recorded." />
            )}
          </div>
        </InsightCard>
      </section>

      <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
          Delivery demand
        </p>

        <h2 className="mt-1 font-serif text-2xl font-semibold">
          Most requested areas
        </h2>

        <p className="mt-2 text-xs leading-5 text-[#746876]">
          Based on customer checkout locations.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {analytics?.topDeliveryAreas?.length ? (
            analytics.topDeliveryAreas.map(
              (item: {
                area: string;
                orders: number;
              }) => (
                <span
                  key={item.area}
                  className="rounded-xl border border-[#e5cfd9] bg-[#fff0f5] px-4 py-3 text-xs font-semibold text-[#632a73]"
                >
                  {item.area}
                  <span className="ml-2 font-mono text-[10px] text-[#746876]">
                    {item.orders} orders
                  </span>
                </span>
              ),
            )
          ) : (
            <EmptyMessage text="Delivery-area data appears after customers complete checkout." />
          )}
        </div>
      </section>
    </div>
  );
}

function OutreachView({
  segments,
  repeatOrderRatio,
  avgOrdersPerReturning,
  avgCustomerLifetimeValue,
  customerCount,
  onOpenCampaign,
}: {
  segments: CampaignSegment[];
  repeatOrderRatio: number;
  avgOrdersPerReturning: number;
  avgCustomerLifetimeValue: number;
  customerCount: number;
  onOpenCampaign: (
    segment: CampaignSegment,
  ) => void;
}) {
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <main className="min-w-0 space-y-4">
        <section className="grid gap-4 sm:grid-cols-3">
          <RetentionCard
            label="Repeat order ratio"
            value={`${repeatOrderRatio}%`}
            detail="Customers who ordered more than once"
          />

          <RetentionCard
            label="Orders per returning buyer"
            value={`${avgOrdersPerReturning}`}
            detail="Average repeat-customer activity"
          />

          <RetentionCard
            label="Average customer value"
            value={`PKR ${avgCustomerLifetimeValue.toLocaleString()}`}
            detail="Average lifetime spend"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
          <div className="border-b border-[#dfd1c4] px-4 py-4 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
              Smart campaigns
            </p>

            <h2 className="mt-1 font-serif text-2xl font-semibold">
              Customer segments
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#746876]">
              Choose a meaningful customer group,
              review the message and test it before
              broadcasting.
            </p>
          </div>

          <div className="divide-y divide-[#eadfd5]">
            {segments.map((segment) => (
              <article
                key={segment.id}
                className="grid gap-4 p-4 transition hover:bg-[#fff8f3] sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                  <Users className="h-5 w-5" />
                </span>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-xl font-semibold">
                      {segment.name}
                    </h3>

                    <span className="rounded-lg bg-[#f1e9e2] px-2.5 py-1 font-mono text-[9px] font-semibold text-[#632a73]">
                      {segment.count} customers
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-[#746876]">
                    {segment.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenCampaign(segment)
                  }
                  disabled={segment.count === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#632a73] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Megaphone className="h-4 w-4" />
                  Create campaign
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
          <Users className="h-5 w-5 text-[#c24f7a]" />

          <h2 className="mt-3 font-serif text-xl font-semibold">
            Audience overview
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#746876]">
            Customer groups are created from actual
            order and CRM activity.
          </p>

          <div className="mt-5 space-y-4">
            <SideValue
              label="Total customers"
              value={customerCount}
            />

            {segments.map((segment) => (
              <SideValue
                key={segment.id}
                label={segment.name}
                value={segment.count}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5cfd9] bg-[#fff0f5] p-4">
          <Sparkles className="h-5 w-5 text-[#c24f7a]" />

          <h2 className="mt-3 font-serif text-xl font-semibold">
            Better outreach
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#746876]">
            Keep messages relevant, avoid excessive
            broadcasts and test every campaign before
            sending it to customers.
          </p>
        </section>

        <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
          <Megaphone className="h-5 w-5 text-[#c24f7a]" />

          <h2 className="mt-3 font-serif text-xl font-semibold">
            Delivery requirement
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#746876]">
            Real broadcasts require a connected
            WhatsApp Business number in Agent Hub.
          </p>
        </section>
      </aside>
    </div>
  );
}

function AnalyticsMetric({
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
        className={`mt-2 whitespace-nowrap font-mono text-xl font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function TrendBadge({
  value,
}: {
  value: number;
}) {
  const positive = value > 0;
  const negative = value < 0;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
        positive
          ? "bg-[#e4f3e8] text-[#168a55]"
          : negative
            ? "bg-[#f8dddd] text-[#a7313b]"
            : "bg-[#f1e9e2] text-[#746876]"
      }`}
    >
      {positive ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : negative ? (
        <TrendingDown className="h-3.5 w-3.5" />
      ) : null}

      {positive ? "+" : ""}
      {value}% vs previous week
    </span>
  );
}

function CompactStat({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="border-b border-[#dfd1c4] px-4 py-5 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
        {label}
      </p>

      <p
        className={`mt-2 font-mono text-2xl font-semibold ${
          warning
            ? "text-[#b86a24]"
            : "text-[#241629]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[10px] leading-5 text-[#746876]">
        {detail}
      </p>
    </div>
  );
}

function FeedbackPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <span
      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
        tone === "positive"
          ? "bg-[#e4f3e8] text-[#168a55]"
          : tone === "warning"
            ? "bg-[#fff0dd] text-[#b86a24]"
            : "bg-[#f1e9e2] text-[#632a73]"
      }`}
    >
      {label}: {value}
    </span>
  );
}

function MiniValue({
  label,
  value,
  positive = false,
  warning = false,
}: {
  label: string;
  value: string | number;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#fffaf6] p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9b8d9c]">
        {label}
      </p>

      <p
        className={`mt-2 font-mono text-xl font-semibold ${
          positive
            ? "text-[#168a55]"
            : warning
              ? "text-[#b86a24]"
              : "text-[#241629]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 sm:p-5">
      <h2 className="font-serif text-2xl font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-5 text-[#746876]">
        {description}
      </p>

      <div className="mt-5 min-h-[280px]">
        {children}
      </div>
    </section>
  );
}

function ChartEmpty() {
  return (
    <div className="grid h-[280px] place-items-center text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
          <TrendingUp className="h-5 w-5" />
        </span>

        <p className="mt-3 text-sm font-semibold">
          No chart data yet
        </p>

        <p className="mt-1 text-xs text-[#746876]">
          Activity will appear after orders are
          recorded.
        </p>
      </div>
    </div>
  );
}

function EmptyMessage({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-xs leading-5 text-[#746876]">
      {text}
    </p>
  );
}

function InsightCard({
  eyebrow,
  title,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#c24f7a]" />

        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#c24f7a]">
          {eyebrow}
        </p>
      </div>

      <h2 className="mt-2 font-serif text-xl font-semibold">
        {title}
      </h2>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function InsightRow({
  label,
  detail,
  value,
  positive = false,
  warning = false,
}: {
  label: string;
  detail?: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">
          {label}
        </p>

        {detail ? (
          <p className="mt-1 text-[10px] text-[#746876]">
            {detail}
          </p>
        ) : null}
      </div>

      <span
        className={`shrink-0 font-mono text-xs font-semibold ${
          positive
            ? "text-[#168a55]"
            : warning
              ? "text-[#a7313b]"
              : "text-[#632a73]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function RetentionCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
        {label}
      </p>

      <p className="mt-2 font-mono text-2xl font-semibold text-[#632a73]">
        {value}
      </p>

      <p className="mt-2 text-[10px] leading-5 text-[#746876]">
        {detail}
      </p>
    </section>
  );
}

function SideValue({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[#746876]">
        {label}
      </span>

      <span className="rounded-lg bg-[#f1e9e2] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#632a73]">
        {value.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

function CampaignTypeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold transition ${
        active
          ? "bg-white text-[#632a73] shadow-sm"
          : "text-[#746876]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}