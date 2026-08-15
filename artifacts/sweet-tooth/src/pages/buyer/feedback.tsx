import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { customFetch } from "@workspace/api-client-react";
import { Heart, Meh, Frown, CheckCircle2 } from "lucide-react";

type FeedbackOption = "loved_it" | "okay" | "had_issue";

const OPTIONS: Array<{ id: FeedbackOption; label: string; icon: typeof Heart }> = [
  { id: "loved_it", label: "Loved it", icon: Heart },
  { id: "okay", label: "Okay", icon: Meh },
  { id: "had_issue", label: "Had an issue", icon: Frown },
];

export default function OrderFeedbackPage() {
  const [, params] = useRoute("/feedback/:orderId");
  const orderId = params?.orderId ? parseInt(params.orderId, 10) : NaN;
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "";
  const [selected, setSelected] = useState<FeedbackOption | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{
    bakerName: string;
    buyerName: string;
    alreadySubmitted: boolean;
  } | null>(null);

  useEffect(() => {
    if (!orderId || isNaN(orderId) || !token) {
      setLoading(false);
      setError("Invalid order link.");
      return;
    }
    customFetch<{
      bakerName: string;
      buyerName: string;
      alreadySubmitted: boolean;
    }>(`/api/orders/${orderId}/feedback`, { headers: { "X-Guest-Token": token } })
      .then((data) => {
        setMeta(data);
        if (data.alreadySubmitted) setDone(true);
      })
      .catch(() => setError("This order is not ready for feedback yet."))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  const submit = async () => {
    if (!selected || !token) return;
    setSubmitting(true);
    setError("");
    try {
      await customFetch(`/api/orders/${orderId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: selected,
          note: note.trim() || undefined,
          token,
        }),
      });
      setDone(true);
    } catch {
      setError("Could not submit feedback. This secure link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BuyerLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : error && !meta ? (
          <p className="text-center text-destructive">{error}</p>
        ) : done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="font-serif text-2xl font-bold">Shukriya!</h1>
            <p className="text-muted-foreground">
              Your feedback helps {meta?.bakerName ?? "the bakery"} improve every order.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-bold text-center">How was your order?</h1>
            <p className="text-center text-muted-foreground mt-2">
              Order from <strong>{meta?.bakerName}</strong>
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {OPTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                    selected === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-7 w-7" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Optional note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm resize-none"
                  placeholder="Tell us more…"
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                disabled={!selected || submitting}
                onClick={submit}
                className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Submit feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </BuyerLayout>
  );
}
