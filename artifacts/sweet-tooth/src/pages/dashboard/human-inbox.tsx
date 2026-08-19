import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Headphones, MessageSquare, RefreshCw, Send, UserCheck } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";

type Handoff = {
  id: number;
  sessionId: string;
  buyerId: number | null;
  status: "open" | "claimed" | "resolved";
  reason: string;
  lastMessage: string;
  updatedAt: string;
  customer: { id: number; name: string; whatsappNumber: string } | null;
};

type ChatMessage = { id: number; role: string; content: string; createdAt: string; sessionId: string };
type HandoffDetail = {
  handoff: Handoff;
  customer: { id: number; name: string; whatsappNumber: string; totalOrders?: number; totalSpentPkr?: number } | null;
  messages: ChatMessage[];
  pastMessages: ChatMessage[];
};

export default function HumanInbox() {
  const { bakerId } = useBuyerSession();
  const [items, setItems] = useState<Handoff[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<HandoffDetail | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInbox() {
    if (!bakerId) return;
    try {
      const data = await customFetch<Handoff[]>(`/api/bakers/${bakerId}/handoffs`, { responseType: "json" });
      setItems(data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the human inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: number) {
    if (!bakerId) return;
    const data = await customFetch<HandoffDetail>(`/api/bakers/${bakerId}/handoffs/${id}`, { responseType: "json" });
    setDetail(data);
  }

  useEffect(() => {
    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 8_000);
    return () => window.clearInterval(timer);
  }, [bakerId]);

  useEffect(() => {
    if (selectedId === null) { setDetail(null); return; }
    void loadDetail(selectedId).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load conversation."));
    const timer = window.setInterval(() => void loadDetail(selectedId), 5_000);
    return () => window.clearInterval(timer);
  }, [bakerId, selectedId]);

  async function action(kind: "claim" | "resolve") {
    if (!bakerId || selectedId === null) return;
    try {
      setError("");
      await customFetch(`/api/bakers/${bakerId}/handoffs/${selectedId}/${kind}`, { method: "POST", responseType: "json" });
      await Promise.all([loadInbox(), loadDetail(selectedId)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${kind} this conversation.`);
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!bakerId || selectedId === null || !reply.trim()) return;
    try {
      setError("");
      await customFetch(`/api/bakers/${bakerId}/handoffs/${selectedId}/reply`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      setReply("");
      await Promise.all([loadInbox(), loadDetail(selectedId)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the reply.");
    }
  }

  const active = items.filter((item) => item.status !== "resolved");

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="font-serif text-4xl font-bold text-primary">Inbox</h1><p className="mt-2 text-muted-foreground">When a buyer asks to talk to the baker, the conversation lands here so you can reply while you bake.</p></div>
          <button type="button" onClick={() => void loadInbox()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[22rem_1fr]">
          <aside className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="border-b border-border p-4"><p className="font-bold">Needs a person</p><p className="text-xs text-muted-foreground">{active.length} active conversation{active.length === 1 ? "" : "s"}</p></div>
            <div className="max-h-[620px] overflow-y-auto p-2">
              {loading ? <p className="p-4 text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? <div className="p-8 text-center text-muted-foreground"><Headphones className="mx-auto mb-3 h-8 w-8 opacity-40" /><p>No handoffs yet.</p></div> : items.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`mb-2 w-full rounded-xl border p-3 text-left ${selectedId === item.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{item.customer?.name ?? "Website visitor"}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.status === "resolved" ? "bg-green-100 text-green-800" : item.status === "claimed" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-900"}`}>{item.status}</span></div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.lastMessage}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">{format(new Date(item.updatedAt), "dd MMM, HH:mm")}</p>
                </button>
              ))}
            </div>
          </aside>
          <section className="flex min-w-0 flex-col">
            {!detail ? <div className="flex flex-1 items-center justify-center p-10 text-center text-muted-foreground"><div><MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>Select a conversation to review and reply.</p></div></div> : <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div><p className="font-bold">{detail.customer?.name ?? "Website visitor"}</p><p className="text-xs text-muted-foreground">{detail.customer?.whatsappNumber ?? `Session ${detail.handoff.sessionId.slice(-8)}`}{detail.customer ? ` · ${detail.customer.totalOrders ?? 0} past orders` : ""}</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => void action("claim")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><UserCheck className="h-4 w-4" /> Claim</button><button type="button" onClick={() => void action("resolve")} className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4" /> Resolve</button></div>
              </header>
              <div className="grid flex-1 lg:grid-cols-[1fr_18rem]">
                <div className="flex min-h-0 flex-col">
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">{detail.messages.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${message.role === "human" ? "bg-green-700 text-white" : message.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}><p className="whitespace-pre-wrap">{message.content}</p><p className="mt-1 text-[10px] opacity-65">{message.role === "human" ? "Human agent" : message.role} · {format(new Date(message.createdAt), "HH:mm")}</p></div></div>)}</div>
                  {detail.handoff.status !== "resolved" && <form onSubmit={(event) => void sendReply(event)} className="flex gap-2 border-t border-border p-4"><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply as a human agent…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm" /><button disabled={!reply.trim()} className="rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-50" aria-label="Send reply"><Send className="h-4 w-4" /></button></form>}
                </div>
                <aside className="border-t border-border bg-muted/20 p-4 lg:border-l lg:border-t-0"><p className="font-bold">Past enquiries</p><p className="mb-3 text-xs text-muted-foreground">Context for this customer</p><div className="max-h-[480px] space-y-2 overflow-y-auto">{detail.pastMessages.slice(-30).map((message) => <div key={`past-${message.id}`} className="rounded-lg border border-border bg-card p-2 text-xs"><p className="font-semibold capitalize">{message.role}</p><p className="mt-1 line-clamp-3 text-muted-foreground">{message.content}</p></div>)}</div></aside>
              </div>
            </>}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
