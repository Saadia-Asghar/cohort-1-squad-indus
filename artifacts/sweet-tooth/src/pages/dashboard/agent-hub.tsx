import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useGetAgentConfig,
  useUpdateAgentConfig,
  useListConversations,
  useGetChatHistory,
  useReindexBakerKnowledge,
  useGetBaker,
  getGetAgentConfigQueryKey,
  getListConversationsQueryKey,
  getGetChatHistoryQueryKey,
} from "@workspace/api-client-react";
import { AgentPlayground } from "@/components/dashboard/agent-playground";
import { Link } from "wouter";
import type { KnowledgeReindexResult } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import { WhatsAppEmbeddedSignup } from "@/components/whatsapp-embedded-signup";
import { InstagramMetaConnect } from "@/components/instagram-meta-connect";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bot, MessageSquare, Instagram, Phone, ChevronRight,
  Plus, X, Save, AlertTriangle, CheckCircle, Zap,
  Settings, Users, ArrowLeft, Database, RefreshCw,
  ExternalLink, Sparkles, Clock,
} from "lucide-react";

type Tab = "built-in" | "whatsapp" | "instagram" | "conversations";
type DeliveryZone = { id: string; name: string; feePkr: number; minimumOrderPkr?: number };
const REPLY_TEMPLATES = [
  { trigger: "custom cake", response: "We would love to help with a custom cake. Please share your date, servings, flavour, theme and delivery area so the baker can confirm a quote." },
  { trigger: "same day", response: "Same-day availability depends on the baking schedule. Please share the item, quantity and required time; the baker will confirm what is possible." },
  { trigger: "payment", response: "Payment details and any advance requirement are shared after the order is confirmed. Please send a receipt or transaction reference after transfer." },
  { trigger: "delivery", response: "Please share your area and required delivery date. I will confirm whether delivery is available and the exact baker-set fee." },
] as const;

export default function AgentHub() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("built-in");
  const [selectedBuyerId, setSelectedBuyerId] = useState<number | null>(null);
  const [newBlockedTopic, setNewBlockedTopic] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCustomTrigger, setNewCustomTrigger] = useState("");
  const [newCustomResponse, setNewCustomResponse] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");
  const [newZoneMinimum, setNewZoneMinimum] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reindexResult, setReindexResult] = useState<KnowledgeReindexResult | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  const reindexKnowledge = useReindexBakerKnowledge({
    mutation: {
      onSuccess: (result) => {
        setReindexResult(result);
        setReindexError(null);
      },
      onError: (error) => {
        setReindexError(error.message);
        setReindexResult(null);
      },
    },
  });

  const { data: baker } = useGetBaker(bakerId, {
    query: { enabled: !!bakerId, queryKey: ["baker", bakerId] },
  });

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistWhatsapp, setWaitlistWhatsapp] = useState("");
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState("");

  useEffect(() => {
    if (baker) {
      setWaitlistEmail(baker.email ?? "");
      setWaitlistName(baker.businessName ?? "");
      setWaitlistWhatsapp(baker.whatsappNumber ?? "");
    }
  }, [baker]);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoiningWaitlist(true);
    setWaitlistMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bakerId,
          bakerName: waitlistName,
          bakerEmail: waitlistEmail,
          whatsappNumber: waitlistWhatsapp,
          note: "Joined waitlist from dashboard Agent Hub.",
        }),
      });
      if (res.ok) {
        setWaitlistMessage("Successfully joined the early access waitlist!");
      } else {
        const data = await res.json();
        setWaitlistMessage(`Error: ${data.error || "Failed to join"}`);
      }
    } catch (err) {
      setWaitlistMessage("Network error joining the waitlist.");
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const { data: config } = useGetAgentConfig(bakerId, {
    query: { enabled: !!bakerId, queryKey: getGetAgentConfigQueryKey(bakerId) },
  });

  const { data: conversations } = useListConversations(bakerId, {
    query: {
      enabled: !!bakerId,
      queryKey: getListConversationsQueryKey(bakerId),
      ...liveDashboardQuery(ORDERS_POLL_MS),
    },
  });

  const { data: chatHistory } = useGetChatHistory(bakerId, selectedBuyerId ?? 0, {
    query: {
      enabled: !!bakerId && activeTab === "conversations" && selectedBuyerId !== null,
      queryKey: getGetChatHistoryQueryKey(bakerId, selectedBuyerId ?? 0),
      refetchInterval: activeTab === "conversations" && selectedBuyerId !== null ? ORDERS_POLL_MS : false,
      refetchIntervalInBackground: false,
    },
  });

  const updateConfig = useUpdateAgentConfig();

  const [localConfig, setLocalConfig] = useState<{
    agentActive?: boolean;
    autoReplyEnabled?: boolean;
    customGreeting?: string;
    blockedTopics?: string[];
    escalateKeywords?: string[];
    customResponses?: Array<{ trigger: string; response: string }>;
    whatsappAgentEnabled?: boolean;
    instagramAgentEnabled?: boolean;
    metaWebhookToken?: string;
    instagramPageId?: string;
    menuAccent?: string;
    availabilityHours?: string;
    dietaryPolicy?: string;
    activeOffers?: string;
    deliveryPricing?: string;
    deliveryZones?: DeliveryZone[];
    preferredCustomerChannel?: "web" | "whatsapp" | "instagram";
    agentLanguage?: "english" | "urdu" | "roman_urdu" | "bilingual";
  }>({});

  const merged = { ...config, ...localConfig };

  const handleSave = async () => {
    setSaving(true);
    updateConfig.mutate(
      { bakerId, data: localConfig },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAgentConfigQueryKey(bakerId) });
          setLocalConfig({});
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onSettled: () => setSaving(false),
      }
    );
  };

  const addBlockedTopic = () => {
    if (!newBlockedTopic.trim()) return;
    setLocalConfig(prev => ({
      ...prev,
      blockedTopics: [...(merged.blockedTopics ?? []), newBlockedTopic.trim()],
    }));
    setNewBlockedTopic("");
  };

  const removeBlockedTopic = (topic: string) => {
    setLocalConfig(prev => ({
      ...prev,
      blockedTopics: (merged.blockedTopics ?? []).filter(t => t !== topic),
    }));
  };

  const addEscalateKeyword = () => {
    if (!newKeyword.trim()) return;
    setLocalConfig(prev => ({
      ...prev,
      escalateKeywords: [...(merged.escalateKeywords ?? []), newKeyword.trim()],
    }));
    setNewKeyword("");
  };

  const removeEscalateKeyword = (kw: string) => {
    setLocalConfig(prev => ({
      ...prev,
      escalateKeywords: (merged.escalateKeywords ?? []).filter(k => k !== kw),
    }));
  };

  const customResponses = merged.customResponses ?? [];

  const addCustomResponse = () => {
    if (!newCustomTrigger.trim() || !newCustomResponse.trim()) return;
    setLocalConfig(prev => ({
      ...prev,
      customResponses: [
        ...customResponses,
        { trigger: newCustomTrigger.trim(), response: newCustomResponse.trim() },
      ],
    }));
    setNewCustomTrigger("");
    setNewCustomResponse("");
  };

  const removeCustomResponse = (trigger: string) => {
    setLocalConfig(prev => ({
      ...prev,
      customResponses: customResponses.filter(cr => cr.trigger !== trigger),
    }));
  };
  const addReplyTemplate = (template: { trigger: string; response: string }) => {
    if (customResponses.some((item) => item.trigger.toLowerCase() === template.trigger.toLowerCase())) return;
    setLocalConfig((previous) => ({ ...previous, customResponses: [...customResponses, template] }));
  };

  const deliveryZones = merged.deliveryZones ?? [];
  const addDeliveryZone = () => {
    const name = newZoneName.trim();
    const feePkr = Number(newZoneFee);
    const minimumOrderPkr = newZoneMinimum.trim() ? Number(newZoneMinimum) : undefined;
    if (!name || !Number.isInteger(feePkr) || feePkr < 0 || (minimumOrderPkr !== undefined && (!Number.isInteger(minimumOrderPkr) || minimumOrderPkr < 0))) return;
    if (deliveryZones.some((zone) => zone.name.toLowerCase() === name.toLowerCase())) return;
    setLocalConfig((previous) => ({
      ...previous,
      deliveryZones: [...deliveryZones, { id: `zone-${Date.now()}`, name, feePkr, ...(minimumOrderPkr ? { minimumOrderPkr } : {}) }],
    }));
    setNewZoneName("");
    setNewZoneFee("");
    setNewZoneMinimum("");
  };
  const removeDeliveryZone = (id: string) => setLocalConfig((previous) => ({
    ...previous,
    deliveryZones: deliveryZones.filter((zone) => zone.id !== id),
  }));

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "built-in", label: "Assistant", icon: Bot },
    { id: "whatsapp", label: "WhatsApp", icon: Phone },
    { id: "instagram", label: "Instagram", icon: Instagram },
    { id: "conversations", label: "Conversations", icon: Users },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto min-h-screen max-w-[1480px] overflow-x-hidden bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-7">
        <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c24f7a]">
              Customer assistant
            </p>

            <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
              Agent Hub
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746876]">
              Test your shop assistant, connect customer channels and decide when a conversation needs your attention.
            </p>
          </div>

          <Link
            href={`/bakers/${bakerId}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-4 text-sm font-semibold text-[#632a73] transition hover:bg-white sm:w-fit"
          >
            <ExternalLink className="h-4 w-4" />
            Preview customer view
          </Link>
        </header>

        <div className="grid border-b border-[#dfd1c4] sm:grid-cols-2 xl:grid-cols-4">
          <StatusPill
            label="Shop assistant"
            value={merged.agentActive !== false ? "On" : "Off"}
            ok={merged.agentActive !== false}
          />
          <StatusPill
            label="Conversations"
            value={String(conversations?.length ?? 0)}
            ok={(conversations?.length ?? 0) > 0}
          />
          <StatusPill
            label="WhatsApp"
            value={merged.whatsappAgentEnabled ? "Connected" : "Not set up"}
            ok={!!merged.whatsappAgentEnabled}
          />
          <StatusPill
            label="Saved replies"
            value={String((merged.customResponses?.length ?? 0) + (merged.blockedTopics?.length ?? 0))}
            ok={(merged.customResponses?.length ?? 0) > 0}
          />
        </div>

        {/* Tab bar */}
        <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#dfd1c4] bg-white/45 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === t.id
                    ? "bg-[#632a73] text-white shadow-sm"
                    : "text-[#746876] hover:bg-[#fffaf6] hover:text-[#241629]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ BUILT-IN AGENT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTab === "built-in" && (
          <div className="mt-5 space-y-4">
            {bakerId && (
              <AgentPlayground bakerId={bakerId} bakeryName={baker?.businessName} />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Demo flow:</strong> tap a sample question above, then open{" "}
                  <Link href={`/bakers/${bakerId}`} className="text-primary font-medium hover:underline">
                    your public shop
                  </Link>{" "}
                  to show the same assistant on the buyer side.
                </p>
              </div>
              <Link
                href={`/bakers/${bakerId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Buyer view
              </Link>
            </div>

            {/* Master toggle */}
            <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${merged.agentActive ? "bg-green-100" : "bg-muted"}`}>
                  <Bot className={`w-5 h-5 ${merged.agentActive ? "text-green-600" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold">Built-in Chat Agent</p>
                  <p className="text-sm text-muted-foreground">Answers buyer questions on your shop page automatically</p>
                </div>
              </div>
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, agentActive: !merged.agentActive }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${merged.agentActive ? "bg-green-500" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${merged.agentActive ? "translate-x-6" : ""}`} />
              </button>
            </div>

            {/* Auto-reply toggle */}
            <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Auto-reply</p>
                  <p className="text-sm text-muted-foreground">Instantly reply to every message - no delay</p>
                </div>
              </div>
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, autoReplyEnabled: !merged.autoReplyEnabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${merged.autoReplyEnabled !== false ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${merged.autoReplyEnabled !== false ? "translate-x-6" : ""}`} />
              </button>
            </div>

            {/* Custom greeting */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Custom Greeting</h3>
              </div>
              <p className="text-sm text-muted-foreground">The first message buyers see when they open the chat. Leave blank for the default.</p>
              <textarea
                rows={2}
                value={merged.customGreeting ?? ""}
                onChange={e => setLocalConfig(prev => ({ ...prev, customGreeting: e.target.value }))}
                placeholder={`Assalam-o-Alaikum! Welcome to your baker's shop. How can I help you today?`}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>        <details className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
                Optional controls
              </p>

              <h2 className="mt-1 font-serif text-xl font-semibold">
                Advanced settings
              </h2>

              <p className="mt-1 text-xs text-[#746876]">
                Languages, delivery areas, saved replies and assistant safety rules.
              </p>
            </div>

            <Settings className="h-5 w-5 shrink-0 text-[#632a73]" />
          </summary>

          <div className="space-y-4 border-t border-[#dfd1c4] p-4 sm:p-5">


            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Buyer language mode</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                App dashboard stays in English. This controls how the agent replies to buyers on WhatsApp and web chat.
              </p>
              <select
                value={merged.agentLanguage ?? "bilingual"}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, agentLanguage: e.target.value as typeof merged.agentLanguage }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                <option value="bilingual">English + Roman Urdu (recommended for Pakistan)</option>
                <option value="roman_urdu">Roman Urdu friendly</option>
                <option value="urdu">Urdu script footer</option>
                <option value="english">English only</option>
              </select>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div>
                <p className="font-semibold">How buyers talk to you (channel flow)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your shared menu stays a catalogue. Pick the main channel for questions and bookings. Turn WhatsApp and Instagram agents on separately (your package must allow them).
                </p>
              </div>
              {(config as unknown as { conversationFlow?: { statusNote?: string } } | undefined)?.conversationFlow?.statusNote && (
                <p className="text-xs rounded-lg bg-muted/50 border border-border px-3 py-2">
                  {(config as unknown as { conversationFlow: { statusNote: string } }).conversationFlow.statusNote}
                </p>
              )}
              <label className="block text-sm font-medium">
                Primary conversation channel
                <select
                  value={merged.preferredCustomerChannel ?? "web"}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, preferredCustomerChannel: e.target.value as "web" | "whatsapp" | "instagram" }))}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="web">Built-in web assistant (all packages)</option>
                  <option
                    value="whatsapp"
                    disabled={(config as unknown as { channelEntitlements?: { whatsapp?: boolean } } | undefined)?.channelEntitlements?.whatsapp === false}
                  >
                    WhatsApp agent {(config as unknown as { channelEntitlements?: { whatsapp?: boolean } } | undefined)?.channelEntitlements?.whatsapp === false ? "(needs Kitchen Standard+)" : "(recommended)"}
                  </option>
                  <option
                    value="instagram"
                    disabled={(config as unknown as { channelEntitlements?: { instagram?: boolean } } | undefined)?.channelEntitlements?.instagram === false}
                  >
                    Instagram DMs {(config as unknown as { channelEntitlements?: { instagram?: boolean } } | undefined)?.channelEntitlements?.instagram === false ? "(needs Kitchen Pro+)" : ""}
                  </option>
                </select>
              </label>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Turn on WhatsApp / Instagram agents in their tabs ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â both can run at once.</li>
                <li>If your primary channel is not ready, the menu falls back to the next ready channel.</li>
                <li>Launch Free = web only ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Kitchen Standard = web + WhatsApp ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Kitchen Pro / Bakery Team = web + WhatsApp + Instagram.</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <h3 className="font-semibold">Shop appearance, hours & dietary policy</h3>
              <p className="text-sm text-muted-foreground">This personalizes your shared menu and gives the agent safe facts to use in every reply.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm font-medium">Menu accent colour<input type="color" value={merged.menuAccent ?? "#7c3aed"} onChange={e => setLocalConfig(prev => ({ ...prev, menuAccent: e.target.value }))} className="block mt-1 h-10 w-full rounded border border-border bg-background" /></label>
                <label className="text-sm font-medium">Order availability<input value={merged.availabilityHours ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, availabilityHours: e.target.value }))} placeholder="e.g. MonÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œSat, 10amÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ8pm" className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" /></label>
              </div>
              <label className="block text-sm font-medium">Dietary & allergen policy<textarea rows={3} value={merged.dietaryPolicy ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, dietaryPolicy: e.target.value }))} placeholder="e.g. Eggless on selected items. We cannot guarantee an allergen-free kitchen; confirm severe allergies before ordering." className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" /></label>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">Delivery zones & fees</p><p className="mt-0.5 text-xs text-muted-foreground">Only baker-set areas are quoted. Unknown areas are never guessed.</p></div><span className="text-xs text-muted-foreground">{deliveryZones.length}/30</span></div>
                {deliveryZones.length > 0 && <div className="mt-3 space-y-2">{deliveryZones.map((zone) => <div key={zone.id} className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm"><span><strong>{zone.name}</strong> ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· PKR {zone.feePkr.toLocaleString()}{zone.minimumOrderPkr ? ` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· min PKR ${zone.minimumOrderPkr.toLocaleString()}` : ""}</span><button type="button" onClick={() => removeDeliveryZone(zone.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${zone.name}`}><X className="h-4 w-4" /></button></div>)}</div>}
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_9rem_auto]"><input value={newZoneName} onChange={(event) => setNewZoneName(event.target.value)} placeholder="Area, e.g. DHA Phase 5" className="rounded-md border border-border bg-background px-3 py-2 text-sm" /><input value={newZoneFee} onChange={(event) => setNewZoneFee(event.target.value)} inputMode="numeric" placeholder="Fee PKR" className="rounded-md border border-border bg-background px-3 py-2 text-sm" /><input value={newZoneMinimum} onChange={(event) => setNewZoneMinimum(event.target.value)} inputMode="numeric" placeholder="Min order (optional)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" /><button type="button" onClick={addDeliveryZone} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Add</button></div>
              </div>
              <label className="block text-sm font-medium">Delivery prices<textarea rows={2} value={merged.deliveryPricing ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, deliveryPricing: e.target.value }))} placeholder="e.g. Gulberg: PKR 200 ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· DHA: PKR 350 ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Free above PKR 5,000" className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" /></label>
              <label className="block text-sm font-medium">Current discount offers<textarea rows={2} value={merged.activeOffers ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, activeOffers: e.target.value }))} placeholder="e.g. 10% off cupcakes with code SWEET10 until 31 July. One offer per line." className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" /></label>
              <p className="text-xs text-muted-foreground">The web and WhatsApp agents use these same delivery prices and offers. Leave a charge blank rather than letting the agent guess.</p>
            </div>

            {/* Blocked topics */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold">Blocked Topics</h3>
              </div>
              <p className="text-sm text-muted-foreground">If a buyer mentions any of these words, the agent will politely decline to answer.</p>
              <div className="flex flex-wrap gap-2">
                {(merged.blockedTopics ?? []).map(topic => (
                  <span key={topic} className="flex items-center gap-1 px-3 py-1 bg-orange-50 border border-orange-200 text-orange-800 rounded-full text-sm">
                    {topic}
                    <button onClick={() => removeBlockedTopic(topic)} className="hover:text-orange-600 ml-1"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newBlockedTopic}
                  onChange={e => setNewBlockedTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addBlockedTopic()}
                  placeholder="e.g. discount, refund"
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={addBlockedTopic}
                  className="flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Custom trigger ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ response */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Custom Responses</h3>
              </div>
              <p className="text-sm text-muted-foreground">Teach the agent exact replies when buyers mention specific words.</p>
              <div className="flex flex-wrap gap-2">{REPLY_TEMPLATES.map((template) => <button key={template.trigger} type="button" onClick={() => addReplyTemplate(template)} disabled={customResponses.some((item) => item.trigger.toLowerCase() === template.trigger.toLowerCase())} className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45">+ {template.trigger}</button>)}</div>
              <div className="space-y-2">
                {customResponses.map((cr) => (
                  <div key={cr.trigger} className="p-3 bg-muted/40 rounded-lg text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <p><span className="font-medium">If:</span> "{cr.trigger}"</p>
                      <button onClick={() => removeCustomResponse(cr.trigger)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-muted-foreground mt-1"><span className="font-medium text-foreground">Reply:</span> {cr.response}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={newCustomTrigger}
                  onChange={e => setNewCustomTrigger(e.target.value)}
                  placeholder="Trigger word (e.g. ramadan)"
                  className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
                <input
                  value={newCustomResponse}
                  onChange={e => setNewCustomResponse(e.target.value)}
                  placeholder="Agent reply"
                  className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <button
                onClick={addCustomResponse}
                className="flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20"
              >
                <Plus className="w-4 h-4" />
                Add custom response
              </button>
            </div>

            {/* Escalation keywords */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold">Escalation Keywords</h3>
              </div>
              <p className="text-sm text-muted-foreground">If a buyer uses these words, the chat is flagged and you get a notification to step in.</p>
              <div className="flex flex-wrap gap-2">
                {["complain", "problem", "issue", "wrong", "bad", ...(merged.escalateKeywords ?? [])].map(kw => (
                  <span key={kw} className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${
                    ["complain", "problem", "issue", "wrong", "bad"].includes(kw)
                      ? "bg-muted border-border text-muted-foreground"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    {kw}
                    {!["complain", "problem", "issue", "wrong", "bad"].includes(kw) && (
                      <button onClick={() => removeEscalateKeyword(kw)} className="hover:text-red-600 ml-1"><X className="w-3 h-3" /></button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addEscalateKeyword()}
                  placeholder="e.g. cancel, late"
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={addEscalateKeyword}
                  className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Knowledge RAG index */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Knowledge Base (RAG)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rebuild the knowledge index from your menu, policies, and delivery areas. The agent uses this when rule-based replies miss.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => reindexKnowledge.mutate({ bakerId })}
                  disabled={reindexKnowledge.isPending || !bakerId}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${reindexKnowledge.isPending ? "animate-spin" : ""}`} />
                  {reindexKnowledge.isPending ? "Reindexing..." : "Reindex Knowledge"}
                </button>
              </div>

              {reindexResult && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    Indexed <strong>{reindexResult.chunksIndexed}</strong> chunks using{" "}
                    <strong>{reindexResult.embeddingProvider}</strong> embeddings.
                  </p>
                </div>
              )}

              {reindexError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{reindexError}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Run this after adding products or changing COD/delivery policies. Seed also reindexes automatically.
              </p>
            </div>

          </div>
        </details>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || Object.keys(localConfig).length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
        )}

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ WHATSAPP AGENT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTab === "whatsapp" && (
          <div className="mt-5 space-y-4">
            {(config as unknown as { channelEntitlements?: { whatsapp?: boolean; whatsappConversationsPerMonth?: number } } | undefined)?.channelEntitlements?.whatsapp === false && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                WhatsApp agent is not on Launch Free. Upgrade to <strong>Kitchen Standard</strong> or higher to auto-reply on WhatsApp.
              </div>
            )}
            <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${merged.whatsappAgentEnabled ? "bg-green-100" : "bg-muted"}`}>
                  <Phone className={`w-5 h-5 ${merged.whatsappAgentEnabled ? "text-green-600" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold">WhatsApp Business Agent</p>
                  <p className="text-sm text-muted-foreground">
                    Auto-reply on WhatsApp
                    {(config as unknown as { channelEntitlements?: { whatsappConversationsPerMonth?: number } } | undefined)?.channelEntitlements?.whatsappConversationsPerMonth
                      ? ` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${(config as unknown as { channelEntitlements: { whatsappConversationsPerMonth: number } }).channelEntitlements.whatsappConversationsPerMonth} chats / month included`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if ((config as unknown as { channelEntitlements?: { whatsapp?: boolean } } | undefined)?.channelEntitlements?.whatsapp === false && !merged.whatsappAgentEnabled) {
                    alert("Upgrade to Kitchen Standard or higher to enable the WhatsApp agent.");
                    return;
                  }
                  if (!merged.whatsappAgentEnabled && !whatsappConnected) {
                    alert("Connect a WhatsApp Business number below before enabling the agent.");
                    return;
                  }
                  setLocalConfig(prev => ({ ...prev, whatsappAgentEnabled: !merged.whatsappAgentEnabled }));
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${merged.whatsappAgentEnabled ? "bg-green-500" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${merged.whatsappAgentEnabled ? "translate-x-6" : ""}`} />
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" />Connect with Meta</h3>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
                <p className="font-medium">Secure multi-bakery WhatsApp onboarding:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Click connect and sign in to the bakery's Meta Business account.</li>
                  <li>Select or create the WhatsApp Business account and phone number.</li>
                  <li>Sweet Tooth verifies the granted account, subscribes webhooks, and encrypts the token.</li>
                  <li>Enable the agent toggle only after the connection shows as successful.</li>
                </ol>
              </div>
              <WhatsAppEmbeddedSignup onStatusChange={setWhatsappConnected} />
              <p className="text-xs text-muted-foreground">The shared app webhook is configured once by the platform owner; bakers never paste access tokens into this page.</p>
            </div>

            {/* Waitlist option */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#c24f7a]" />
                Join the WhatsApp Agent Waitlist
              </h3>
              <p className="text-xs text-muted-foreground">
                If the WhatsApp integration is not yet completed for your bakery or you require manual setup from the admin, submit your info here to join the early access waitlist.
              </p>

              <form onSubmit={handleJoinWaitlist} className="space-y-3 max-w-md">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Bakery Name"
                    required
                    value={waitlistName}
                    onChange={(e) => setWaitlistName(e.target.value)}
                    className="min-h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp Number"
                    required
                    value={waitlistWhatsapp}
                    onChange={(e) => setWaitlistWhatsapp(e.target.value)}
                    className="min-h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Owner Email"
                    required
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="flex-1 min-h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={joiningWaitlist}
                    className="min-h-10 px-4 rounded-lg bg-[#632a73] font-semibold text-white text-xs hover:bg-[#542261] disabled:opacity-50"
                  >
                    {joiningWaitlist ? "Joining..." : "Join Waitlist"}
                  </button>
                </div>
              </form>
              {waitlistMessage && (
                <p className="text-xs font-semibold text-green-600">{waitlistMessage}</p>
              )}
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Recent conversations
              </h3>
              {!conversations || conversations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
                  <Phone className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No buyer conversations yet. Web and channel chats will show here once customers message your shop.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("conversations")}
                    className="mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    Open All Conversations
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.slice(0, 8).map((conv) => (
                    <button
                      key={conv.buyerId}
                      type="button"
                      onClick={() => {
                        setSelectedBuyerId(conv.buyerId);
                        setActiveTab("conversations");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                        {conv.buyerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{conv.buyerName}</p>
                          {conv.needsBakerReply && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">Needs you</span>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(conv.lastActiveAt), "MMM d")}
                      </p>
                    </button>
                  ))}
                  {conversations.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("conversations")}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View all {conversations.length} conversations
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ INSTAGRAM AGENT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTab === "instagram" && (
          <div className="mt-5 space-y-4">
            {(config as unknown as { channelEntitlements?: { instagram?: boolean } } | undefined)?.channelEntitlements?.instagram === false && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Instagram DM agent needs <strong>Kitchen Pro</strong> or <strong>Bakery Team</strong>. Kitchen Standard includes WhatsApp only.
              </div>
            )}
            <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${merged.instagramAgentEnabled ? "bg-pink-100" : "bg-muted"}`}>
                  <Instagram className={`w-5 h-5 ${merged.instagramAgentEnabled ? "text-pink-600" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold">Instagram DM Agent</p>
                  <p className="text-sm text-muted-foreground">
                    Auto-reply to Instagram DMs
                    {(config as unknown as { channelEntitlements?: { instagramConversationsPerMonth?: number } } | undefined)?.channelEntitlements?.instagramConversationsPerMonth
                      ? ` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${(config as unknown as { channelEntitlements: { instagramConversationsPerMonth: number } }).channelEntitlements.instagramConversationsPerMonth} chats / month included`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if ((config as unknown as { channelEntitlements?: { instagram?: boolean } } | undefined)?.channelEntitlements?.instagram === false && !merged.instagramAgentEnabled) {
                    alert("Upgrade to Kitchen Pro or higher to enable the Instagram agent.");
                    return;
                  }
                  setLocalConfig(prev => ({ ...prev, instagramAgentEnabled: !merged.instagramAgentEnabled }));
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${merged.instagramAgentEnabled ? "bg-pink-500" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${merged.instagramAgentEnabled ? "translate-x-6" : ""}`} />
              </button>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" />Connect with Meta</h3>
              <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg text-sm text-pink-800 space-y-1">
                <p className="font-medium">Secure Instagram Messaging onboarding:</p>
                <ol className="list-decimal list-inside space-y-1 text-pink-700">
                  <li>Connect with Facebook Login / Embedded Signup for the bakery Meta Business account.</li>
                  <li>Select the Facebook Page linked to the Instagram Business account.</li>
                  <li>Sweet Tooth verifies the Page ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Instagram link, encrypts the token, and stores the connection.</li>
                  <li>Enable the agent toggle only after the connection shows as successful.</li>
                </ol>
              </div>
              <InstagramMetaConnect />
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" />Instagram Page Setup</h3>
              <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg text-sm text-pink-800 space-y-1">
                <p className="font-medium">Manual Page ID (optional fallback):</p>
                <ol className="list-decimal list-inside space-y-1 text-pink-700">
                  <li>Convert to an <strong>Instagram Business or Creator account</strong></li>
                  <li>Link it to a <strong>Facebook Page</strong> in Meta Business Suite</li>
                  <li>Paste the <strong>Instagram Page ID</strong> below if you need it on the baker profile</li>
                </ol>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram Page ID</label>
                <input
                  value={merged.instagramPageId ?? ""}
                  onChange={e => setLocalConfig(prev => ({ ...prev, instagramPageId: e.target.value }))}
                  placeholder="e.g. 123456789012345"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Instagram Config"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Saving a Page ID alone does not connect Instagram DMs. Keep the agent disabled until Meta has approved and connected the messaging webhook.</p>
          </div>
        )}

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ CONVERSATIONS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {activeTab === "conversations" && (
          <div className="mt-5">
            {selectedBuyerId !== null ? (
              <div>
                <button
                  onClick={() => setSelectedBuyerId(null)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to all conversations
                </button>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <p className="font-semibold">Buyer #{selectedBuyerId}</p>
                    <p className="text-xs text-muted-foreground">{chatHistory?.length ?? 0} messages</p>
                  </div>
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {chatHistory?.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          <p className="whitespace-pre-line">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {format(new Date(msg.createdAt), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {!conversations || conversations.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-serif text-lg">No conversations yet</p>
                    <p className="text-sm mt-1">Buyer chats will appear here once your shop gets traffic</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map(conv => {
                      const prefs = conv.preferences as Record<string, unknown> | null ?? {};
                      const prefTags = [
                        prefs.eggless ? "Eggless" : null,
                        prefs.preferredArea ? String(prefs.preferredArea) : null,
                        prefs.allergies ? `Allergy: ${(prefs.allergies as string[]).join(", ")}` : null,
                      ].filter(Boolean) as string[];

                      return (
                        <button
                          key={conv.buyerId}
                          onClick={() => setSelectedBuyerId(conv.buyerId)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {conv.buyerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold truncate">{conv.buyerName}</p>
                              {conv.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                              {conv.needsBakerReply && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">Needs you</span>}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                            {prefTags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {prefTags.map(tag => (
                                  <span key={tag} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <p className="text-xs text-muted-foreground">{format(new Date(conv.lastActiveAt), "MMM d")}</p>
                            <p className="text-xs text-muted-foreground">{conv.messageCount} msgs</p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="border-[#dfd1c4] px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            ok ? "bg-[#168a55]" : "bg-[#c9bdc6]"
          }`}
        />

        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#746876]">
          {label}
        </p>
      </div>

      <p
        className={`mt-2 font-mono text-lg font-semibold ${
          ok ? "text-[#168a55]" : "text-[#241629]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}