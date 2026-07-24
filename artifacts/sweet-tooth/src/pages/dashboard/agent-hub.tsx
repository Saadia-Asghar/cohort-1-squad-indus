import { useState } from "react";
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
  ExternalLink, Sparkles,
} from "lucide-react";

type Tab = "built-in" | "whatsapp" | "instagram" | "conversations";

export default function AgentHub() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("built-in");
  const [selectedBuyerId, setSelectedBuyerId] = useState<number | null>(null);
  const [newBlockedTopic, setNewBlockedTopic] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCustomTrigger, setNewCustomTrigger] = useState("");
  const [newCustomResponse, setNewCustomResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reindexResult, setReindexResult] = useState<KnowledgeReindexResult | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);

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

  const { data: config } = useGetAgentConfig(bakerId, {
    query: { enabled: !!bakerId, queryKey: getGetAgentConfigQueryKey(bakerId) },
  });

  const { data: conversations } = useListConversations(bakerId, {
    query: {
      enabled: !!bakerId && activeTab === "conversations",
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

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "built-in", label: "Built-in Agent", icon: Bot },
    { id: "whatsapp", label: "WhatsApp Agent", icon: Phone },
    { id: "instagram", label: "Instagram Agent", icon: Instagram },
    { id: "conversations", label: "All Conversations", icon: Users },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold font-serif text-primary">Agent Hub</h1>
          <p className="text-muted-foreground mt-1">Control your AI agents, test replies live, and teach the bot your menu + policies.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatusPill
            label="Built-in agent"
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
            label="Custom rules"
            value={String((merged.customResponses?.length ?? 0) + (merged.blockedTopics?.length ?? 0))}
            ok={(merged.customResponses?.length ?? 0) > 0}
          />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-8 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? "bg-white shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── BUILT-IN AGENT ── */}
        {activeTab === "built-in" && (
          <div className="space-y-6">
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
                  <p className="text-sm text-muted-foreground">Instantly reply to every message — no delay</p>
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
            </div>

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
                <li>Turn on WhatsApp / Instagram agents in their tabs — both can run at once.</li>
                <li>If your primary channel is not ready, the menu falls back to the next ready channel.</li>
                <li>Launch Free = web only · Kitchen Standard = web + WhatsApp · Kitchen Pro / Bakery Team = web + WhatsApp + Instagram.</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <h3 className="font-semibold">Shop appearance, hours & dietary policy</h3>
              <p className="text-sm text-muted-foreground">This personalizes your shared menu and gives the agent safe facts to use in every reply.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm font-medium">Menu accent colour<input type="color" value={merged.menuAccent ?? "#7c3aed"} onChange={e => setLocalConfig(prev => ({ ...prev, menuAccent: e.target.value }))} className="block mt-1 h-10 w-full rounded border border-border bg-background" /></label>
                <label className="text-sm font-medium">Order availability<input value={merged.availabilityHours ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, availabilityHours: e.target.value }))} placeholder="e.g. Mon–Sat, 10am–8pm" className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" /></label>
              </div>
              <label className="block text-sm font-medium">Dietary & allergen policy<textarea rows={3} value={merged.dietaryPolicy ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, dietaryPolicy: e.target.value }))} placeholder="e.g. Eggless on selected items. We cannot guarantee an allergen-free kitchen; confirm severe allergies before ordering." className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" /></label>
              <label className="block text-sm font-medium">Current discount offers<textarea rows={2} value={merged.activeOffers ?? ""} onChange={e => setLocalConfig(prev => ({ ...prev, activeOffers: e.target.value }))} placeholder="e.g. 10% off cupcakes with code SWEET10 until 31 July. One offer per line." className="block mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" /></label>
              <p className="text-xs text-muted-foreground">The web and WhatsApp agents read these same live offers when a customer asks about discounts.</p>
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

            {/* Custom trigger → response */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Custom Responses</h3>
              </div>
              <p className="text-sm text-muted-foreground">Teach the agent exact replies when buyers mention specific words.</p>
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

        {/* ── WHATSAPP AGENT ── */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
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
                      ? ` · ${(config as unknown as { channelEntitlements: { whatsappConversationsPerMonth: number } }).channelEntitlements.whatsappConversationsPerMonth} chats / month included`
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
              <WhatsAppEmbeddedSignup />
              <p className="text-xs text-muted-foreground">The shared app webhook is configured once by the platform owner; bakers never paste access tokens into this page.</p>
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
                        <p className="font-medium truncate">{conv.buyerName}</p>
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

        {/* ── INSTAGRAM AGENT ── */}
        {activeTab === "instagram" && (
          <div className="space-y-6">
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
                      ? ` · ${(config as unknown as { channelEntitlements: { instagramConversationsPerMonth: number } }).channelEntitlements.instagramConversationsPerMonth} chats / month included`
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
                  <li>Sweet Tooth verifies the Page ↔ Instagram link, encrypts the token, and stores the connection.</li>
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

        {/* ── CONVERSATIONS ── */}
        {activeTab === "conversations" && (
          <div>
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

function StatusPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${ok ? "border-green-200 bg-green-50/60" : "border-border bg-card"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${ok ? "text-green-700" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
