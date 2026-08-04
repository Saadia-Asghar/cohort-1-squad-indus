import { useEffect, useRef, useState } from "react";
import { useSendChatMessage } from "@workspace/api-client-react";
import { Bot, Send, Sparkles } from "lucide-react";

const DEMO_PROMPTS = [
  "Do you have eggless options?",
  "What are your delivery areas?",
  "I need a birthday cake for Saturday â€” what do you recommend?",
  "Any active discounts right now?",
];

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

export function AgentPlayground({ bakerId, bakeryName }: { bakerId: number; bakeryName?: string }) {
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => `pitch-${bakerId}-${Date.now()}`);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      id: "welcome",
      role: "assistant",
      content: bakeryName
        ? `Assalam-o-Alaikum! I'm the ${bakeryName} assistant. Ask me about the menu, delivery, or dietary options â€” exactly like a buyer would.`
        : "Ask a test question to preview how your shop assistant replies to buyers.",
    },
  ]);
  const sendMessage = useSendChatMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;

    setLines((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: trimmed }]);
    sendMessage.mutate(
      { data: { bakerId, message: trimmed, sessionId } },
      {
        onSuccess: (res) => {
          setLines((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", content: res.reply },
          ]);
        },
        onError: () => {
          setLines((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}`,
              role: "assistant",
              content: "Agent unavailable right now. Check that the agent is enabled and try Reindex Knowledge.",
            },
          ]);
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden">
      <div className="flex flex-col items-start gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Live agent preview</p>
            <p className="text-xs text-muted-foreground">Test replies before buyers see them on your shop</p>
          </div>
        </div>
        <span className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-green-800">
          <Bot className="h-3 w-3" />
          Same brain as web + WhatsApp
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pt-4">
        {DEMO_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => send(prompt)}
            disabled={sendMessage.isPending}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="mx-5 mt-4 max-h-64 space-y-3 overflow-y-auto rounded-lg bg-muted/30 p-4">
        {lines.map((line) => (
          <div key={line.id} className={`flex ${line.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                line.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-card border border-border text-foreground"
              }`}
            >
              {line.content}
            </div>
          </div>
        ))}
        {sendMessage.isPending && (
          <p className="text-xs text-muted-foreground animate-pulse">Agent is typingâ€¦</p>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-border/60 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
          setInput("");
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a buyer questionâ€¦"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || sendMessage.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
