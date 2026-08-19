import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, CreditCard, MessageCircle, RefreshCw, Store } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

type UsageMeter = { used: number; limit: number | null };
type TabId = "conversations" | "orders" | "customers" | "menu" | "memory";

type ConversationKind = "ai_agent" | "human_agent";
type ConversationFilter = "all" | ConversationKind;

type MonitorPayload = {
  baker: {
    id: number;
    businessName: string;
    ownerName: string;
    email: string | null;
    whatsappNumber: string;
    city: string;
    area: string | null;
    slug: string;
    tagline: string | null;
    bio: string | null;
    subscriptionPlan: string;
    agentActive: boolean;
    marketplaceVisible: boolean;
    whatsappAgentEnabled: boolean;
    instagramAgentEnabled: boolean;
    totalOrders: number;
    ratingAvg: number;
    trialEndsAt: string | null;
    createdAt: string;
    pendingPlanId: string | null;
    billingRequestedAt: string | null;
    billingNote: string | null;
    lastPlanActivatedAt: string | null;
    lastPlanActivationNote: string | null;
    signupFeatureIds?: string[];
    signupFeedbackNote?: string | null;
    signupFeedbackSkipped?: boolean;
  };
  usage: {
    aiReplies: UsageMeter;
    ordersThisMonth: UsageMeter;
    products: UsageMeter;
    whatsapp: UsageMeter;
    instagram: UsageMeter;
  };
  conversations: Array<{
    sessionId: string;
    channel: string;
    kind?: ConversationKind;
    buyerId: number | null;
    buyerName: string | null;
    lastMessageAt: string;
    messageCount: number;
    preview: string;
    handoff: {
      id: number;
      status: string;
      reason: string;
      assignedMemberId: number | null;
    } | null;
    messages: Array<{ id: number; role: string; content: string; createdAt: string }>;
  }>;
  orders: Array<{
    id: number;
    buyerName: string;
    buyerWhatsapp: string;
    totalPkr: number;
    status: string;
    paymentStatus: string;
    source: string;
    deliveryDate: string | null;
    createdAt: string;
  }>;
  customers: Array<{
    id: number;
    name: string;
    whatsappNumber: string;
    city: string | null;
    preferredArea: string | null;
    totalOrders: number;
    totalSpentPkr: number;
    lastOrderAt: string | null;
    isRegular: boolean;
    isAtRisk: boolean;
  }>;
  products: Array<{
    id: number;
    name: string;
    category: string;
    basePricePkr: number;
    isAvailable: boolean;
    totalOrders: number;
  }>;
  memories: Array<{
    id: number;
    buyerId: number;
    buyerName: string | null;
    summary: string | null;
    preferences: Record<string, unknown> | null;
    messageCount: number;
    lastActiveAt: string;
  }>;
  reviews: Array<{
    id: number;
    buyerName: string;
    rating: number;
    reviewText: string | null;
    productName: string | null;
    createdAt: string;
  }>;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free trial",
  starter: "Kitchen Standard",
  pro: "Kitchen Pro",
  bakery_plus: "Bakery Team",
};

const FEATURE_LABELS: Record<string, string> = {
  assistant: "AI bakery assistant",
  orders: "Order management",
  payments: "Payment review",
  calendar: "Production calendar",
};

const inputClass =
  "w-full min-h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10";
const cardClass = "rounded-2xl border border-border bg-white p-6 shadow-sm";
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50";
const ghostBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-background";

function adminHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function meterLabel(meter: UsageMeter): string {
  if (meter.limit == null) return `${meter.used} / unlimited`;
  return `${meter.used} / ${meter.limit}`;
}

function sessionKind(session: MonitorPayload["conversations"][number]): ConversationKind {
  if (session.kind === "human_agent" || session.kind === "ai_agent") return session.kind;
  if (session.handoff || session.messages.some((message) => message.role === "human")) return "human_agent";
  return "ai_agent";
}

function speakerLabel(role: string): string {
  if (role === "human") return "Human agent";
  if (role === "assistant") return "AI agent";
  if (role === "user") return "Customer";
  return role;
}

function bubbleClass(role: string): string {
  if (role === "user") return "bg-background";
  if (role === "human") return "ml-auto bg-primary text-white";
  return "ml-auto bg-accent";
}

export default function AdminBakerMonitor() {
  const params = useParams<{ id: string }>();
  const bakerId = Number(params.id);
  const [token, setToken] = useState("");
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("conversations");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [planId, setPlanId] = useState("starter");
  const [activationNote, setActivationNote] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planMessage, setPlanMessage] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");

  const load = async (bearer: string) => {
    if (!Number.isInteger(bakerId) || bakerId <= 0) {
      setError("Invalid bakery.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/bakers/${bakerId}`), { headers: adminHeaders(bearer) });
      if (res.status === 401) {
        setError("Session expired. Sign in again.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not load bakery.");
        return;
      }
      const payload = (await res.json()) as MonitorPayload;
      setData(payload);
      setPlanId(payload.baker.pendingPlanId || payload.baker.subscriptionPlan || "starter");
      setSessionId((current) => current ?? payload.conversations[0]?.sessionId ?? null);
    } catch {
      setError("Failed to connect to admin server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_bearer_token");
    if (!saved) {
      setError("Sign in from the admin home first.");
      setLoading(false);
      return;
    }
    setToken(saved);
    void load(saved);
  }, [bakerId]);

  const aiCount = data?.conversations.filter((session) => sessionKind(session) === "ai_agent").length ?? 0;
  const humanCount = data?.conversations.filter((session) => sessionKind(session) === "human_agent").length ?? 0;
  const filteredConversations = useMemo(() => {
    if (!data) return [];
    if (conversationFilter === "all") return data.conversations;
    return data.conversations.filter((session) => sessionKind(session) === conversationFilter);
  }, [data, conversationFilter]);
  const visibleSession =
    filteredConversations.find((session) => session.sessionId === sessionId) ??
    filteredConversations[0] ??
    null;

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    if (orderFilter === "all") return data.orders;
    return data.orders.filter((order) => order.status === orderFilter);
  }, [data, orderFilter]);

  const handleActivate = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSavingPlan(true);
    setPlanMessage("");
    try {
      const res = await fetch(apiUrl("/api/admin/activate-plan"), {
        method: "POST",
        headers: adminHeaders(token, true),
        body: JSON.stringify({
          bakerId,
          planId,
          note: activationNote || "Confirmed off-platform payment",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlanMessage(body.error || "Could not activate plan.");
        return;
      }
      setPlanMessage(body.message || "Plan activated.");
      setActivationNote("");
      await load(token);
    } catch {
      setPlanMessage("Network error while activating plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-background px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{error || "Admin sign-in required."}</p>
        <Link href="/admin" className={`${primaryBtn} mt-6`}>Go to admin</Link>
      </main>
    );
  }

  const baker = data?.baker;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> All bakeries
            </Link>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Bakery monitor</p>
            <h1 className="font-serif text-3xl font-bold text-foreground">{baker?.businessName || (loading ? "Loading…" : "Bakery")}</h1>
            {baker && (
              <p className="mt-1 text-sm text-muted-foreground">
                {baker.ownerName} · {baker.city}{baker.area ? `, ${baker.area}` : ""} · {baker.whatsappNumber} · #{baker.id}
              </p>
            )}
            {baker && (baker.signupFeatureIds?.length || baker.signupFeedbackNote || baker.signupFeedbackSkipped) ? (
              <p className="mt-3 text-sm text-foreground">
                <span className="font-bold">Asked for at signup: </span>
                {baker.signupFeedbackSkipped && !baker.signupFeatureIds?.length
                  ? "Skipped"
                  : (baker.signupFeatureIds ?? []).map((id) => FEATURE_LABELS[id] || id).join(" · ") || "Note only"}
                {baker.signupFeedbackNote ? ` — ${baker.signupFeedbackNote}` : ""}
              </p>
            ) : null}
          </div>
          <button type="button" className={ghostBtn} disabled={loading} onClick={() => void load(token)}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload from database
          </button>
        </header>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        {baker && data && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { label: "Plan", value: PLAN_LABELS[baker.subscriptionPlan] || baker.subscriptionPlan, icon: CreditCard },
                { label: "AI agent chats", value: String(aiCount), icon: MessageCircle },
                { label: "Human agent chats", value: String(humanCount), icon: MessageCircle },
                { label: "Orders", value: String(data.orders.length), icon: Store },
                { label: "AI replies", value: meterLabel(data.usage.aiReplies), icon: MessageCircle },
                { label: "This month", value: meterLabel(data.usage.ordersThisMonth), icon: Store },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-white p-5">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 font-serif text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </section>

            <section className={`${cardClass} mt-8`}>
              <h2 className="font-serif text-xl font-bold">Activate subscription</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When a baker WhatsApps you and you confirm payment, activate their plan here.
              </p>
              {baker.pendingPlanId && (
                <p className="mt-3 rounded-xl bg-background px-3 py-2 text-sm font-medium text-primary">
                  Pending request: {PLAN_LABELS[baker.pendingPlanId] || baker.pendingPlanId}
                  {baker.billingRequestedAt ? ` · ${new Date(baker.billingRequestedAt).toLocaleString()}` : ""}
                  {baker.billingNote ? ` · ${baker.billingNote}` : ""}
                </p>
              )}
              {baker.lastPlanActivatedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last activated {new Date(baker.lastPlanActivatedAt).toLocaleString()}
                  {baker.lastPlanActivationNote ? ` · ${baker.lastPlanActivationNote}` : ""}
                </p>
              )}
              <form onSubmit={handleActivate} className="mt-5 grid gap-3 sm:grid-cols-[200px_1fr_auto]">
                <select className={inputClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="free">Free trial</option>
                  <option value="starter">Kitchen Standard</option>
                  <option value="pro">Kitchen Pro</option>
                  <option value="bakery_plus">Bakery Team</option>
                </select>
                <input
                  className={inputClass}
                  placeholder="Note, e.g. WhatsApp receipt confirmed 18 Aug"
                  value={activationNote}
                  onChange={(e) => setActivationNote(e.target.value)}
                />
                <button type="submit" disabled={savingPlan} className={primaryBtn}>
                  {savingPlan ? "Saving…" : "Activate in database"}
                </button>
              </form>
              {planMessage && <p className="mt-3 text-sm font-medium text-primary">{planMessage}</p>}
            </section>

            <div className="mt-8 flex flex-wrap gap-2">
              {([
                ["conversations", `Conversations (${data.conversations.length})`],
                ["orders", `Orders (${data.orders.length})`],
                ["customers", `Customers (${data.customers.length})`],
                ["menu", `Menu (${data.products.length})`],
                ["memory", `Memory (${data.memories.length})`],
              ] as Array<[TabId, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={tab === id ? primaryBtn : ghostBtn}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "conversations" && (
              <section className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {([
                    ["all", `All (${data.conversations.length})`],
                    ["ai_agent", `AI agent (${aiCount})`],
                    ["human_agent", `Human agent (${humanCount})`],
                  ] as Array<[ConversationFilter, string]>).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setConversationFilter(id)}
                      className={conversationFilter === id ? primaryBtn : ghostBtn}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                  <div className={`${cardClass} max-h-[70vh] overflow-y-auto p-0`}>
                    {filteredConversations.length === 0 && (
                      <p className="p-6 text-sm text-muted-foreground">
                        {conversationFilter === "human_agent"
                          ? "No human-agent conversations for this bakery yet."
                          : conversationFilter === "ai_agent"
                            ? "No AI-agent conversations for this bakery yet."
                            : "No conversations yet."}
                      </p>
                    )}
                    {filteredConversations.map((session) => {
                      const kind = sessionKind(session);
                      return (
                        <button
                          key={session.sessionId}
                          type="button"
                          onClick={() => setSessionId(session.sessionId)}
                          className={`w-full border-b border-border px-4 py-3 text-left ${visibleSession?.sessionId === session.sessionId ? "bg-background" : "bg-white"}`}
                        >
                          <p className="text-xs font-bold uppercase tracking-wide text-primary/70">
                            {kind === "human_agent" ? "Human agent" : "AI agent"} · {session.channel}
                            {session.handoff ? ` · ${session.handoff.status}` : ""}
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {session.buyerName || (session.buyerId ? `Buyer #${session.buyerId}` : "Guest")}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{session.preview}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {session.messageCount} msgs · {new Date(session.lastMessageAt).toLocaleString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className={`${cardClass} max-h-[70vh] overflow-y-auto`}>
                    {!visibleSession && <p className="text-sm text-muted-foreground">Select a conversation.</p>}
                    {visibleSession && (
                      <>
                        <div className="mb-4 rounded-xl border border-border bg-background px-4 py-3">
                          <p className="text-sm font-bold">
                            {sessionKind(visibleSession) === "human_agent" ? "Human agent" : "AI agent"} · {visibleSession.channel}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {visibleSession.buyerName || (visibleSession.buyerId ? `Buyer #${visibleSession.buyerId}` : "Guest")}
                          </p>
                          {visibleSession.handoff && (
                            <p className="mt-2 text-sm">
                              Inbox {visibleSession.handoff.status}: {visibleSession.handoff.reason}
                            </p>
                          )}
                        </div>
                        {visibleSession.messages.length === 0 && (
                          <p className="text-sm text-muted-foreground">No messages stored for this handoff yet.</p>
                        )}
                        {visibleSession.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`mb-3 max-w-[85%] rounded-2xl px-4 py-3 text-sm ${bubbleClass(message.role)}`}
                          >
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${message.role === "human" ? "text-white/70" : "text-muted-foreground"}`}>
                              {speakerLabel(message.role)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                            <p className={`mt-1 text-[10px] ${message.role === "human" ? "text-white/70" : "text-muted-foreground"}`}>
                              {new Date(message.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {tab === "orders" && (
              <section className={`${cardClass} mt-4 overflow-hidden p-0`}>
                <div className="flex items-center justify-end border-b border-border p-4">
                  <select className={`${inputClass} max-w-xs`} value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_production">In production</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Buyer</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-t border-border">
                          <td className="px-4 py-3 font-mono">#{order.id}</td>
                          <td className="px-4 py-3">{order.buyerName}<p className="text-xs text-muted-foreground">{order.buyerWhatsapp}</p></td>
                          <td className="px-4 py-3 font-semibold">PKR {order.totalPkr.toLocaleString()}</td>
                          <td className="px-4 py-3">{order.status}</td>
                          <td className="px-4 py-3">{order.paymentStatus}</td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No orders in this view.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === "customers" && (
              <section className={`${cardClass} mt-4 overflow-hidden p-0`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Orders</th>
                        <th className="px-4 py-3">Spent</th>
                        <th className="px-4 py-3">Last order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((customer) => (
                        <tr key={customer.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{customer.name} {customer.isRegular ? "· regular" : ""}{customer.isAtRisk ? " · at risk" : ""}</p>
                            <p className="text-xs text-muted-foreground">{customer.whatsappNumber} · {customer.city || customer.preferredArea || "—"}</p>
                          </td>
                          <td className="px-4 py-3">{customer.totalOrders}</td>
                          <td className="px-4 py-3 font-semibold">PKR {customer.totalSpentPkr.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                      {data.customers.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No customers yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === "menu" && (
              <section className={`${cardClass} mt-4 overflow-hidden p-0`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-background text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((product) => (
                        <tr key={product.id} className="border-t border-border">
                          <td className="px-4 py-3 font-semibold">{product.name} {!product.isAvailable && <span className="text-xs text-muted-foreground">hidden</span>}</td>
                          <td className="px-4 py-3">{product.category}</td>
                          <td className="px-4 py-3">PKR {product.basePricePkr.toLocaleString()}</td>
                          <td className="px-4 py-3">{product.totalOrders}</td>
                        </tr>
                      ))}
                      {data.products.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No menu items.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === "memory" && (
              <section className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className={cardClass}>
                  <h3 className="font-serif text-lg font-bold">Buyer memory</h3>
                  <div className="mt-4 space-y-3">
                    {data.memories.map((memory) => (
                      <div key={memory.id} className="rounded-xl border border-border p-3">
                        <p className="font-semibold">{memory.buyerName || `Buyer #${memory.buyerId}`}</p>
                        <p className="text-sm text-muted-foreground">{memory.summary || "No summary yet."}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{memory.messageCount} messages · {new Date(memory.lastActiveAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {data.memories.length === 0 && <p className="text-sm text-muted-foreground">No stored preferences yet.</p>}
                  </div>
                </div>
                <div className={cardClass}>
                  <h3 className="font-serif text-lg font-bold">Reviews</h3>
                  <div className="mt-4 space-y-3">
                    {data.reviews.map((review) => (
                      <div key={review.id} className="rounded-xl border border-border p-3">
                        <p className="font-semibold">{review.buyerName} · {review.rating}/5</p>
                        <p className="text-sm">{review.reviewText || review.productName || "No comment"}</p>
                      </div>
                    ))}
                    {data.reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
