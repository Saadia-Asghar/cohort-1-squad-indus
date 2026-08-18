import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { apiUrl } from "@/lib/api-url";

const faces = [
  { initials: "S", name: "Sana", color: "bg-primary" },
  { initials: "A", name: "Ayesha", color: "bg-secondary" },
  { initials: "H", name: "Hira", color: "bg-gold" },
  { initials: "M", name: "Maham", color: "bg-plum-deep" },
];

export default function Waitlist() {
  const [bakerName, setBakerName] = useState("");
  const [bakerEmail, setBakerEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void fetch(apiUrl("/api/waitlist/count"))
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { count?: number } | null) => {
        if (typeof body?.count === "number") setCount(body.count);
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/waitlist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bakerName,
          bakerEmail,
          whatsappNumber,
          city: city || undefined,
          source: "launch",
          note: note.trim() || "Joined from public waitlist. Contact to onboard.",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; alreadyJoined?: boolean };
      if (!res.ok) {
        setError(body.error || "Could not join the waitlist. Check your details and try again.");
        return;
      }
      setAlreadyJoined(Boolean(body.alreadyJoined));
      setJoined(true);
      setCount((current) => (typeof current === "number" && !body.alreadyJoined ? current + 1 : current));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BuyerLayout>
      <section className="relative overflow-hidden bg-background px-4 py-16 sm:px-6 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Closed beta · Pakistan
            </p>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.04em] text-foreground sm:text-6xl">
              Join the Sweet Tooth waitlist
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Leave your details and we will WhatsApp you to onboard. You can also{" "}
              <Link href="/dashboard/register" className="font-semibold text-primary hover:underline">create a free account</Link>
              {" "}yourself — you get the dashboard and the menu agent from day one.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-3">
                {faces.map((face) => (
                  <span
                    key={face.name}
                    title={face.name}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white ${face.color}`}
                  >
                    {face.initials}
                  </span>
                ))}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {count && count > 0
                  ? `${count} baker${count === 1 ? "y" : "ies"} already on the list`
                  : "Be among the first bakeries we invite"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 shadow-[0_24px_60px_rgba(47,24,55,0.08)] sm:p-8">
            {joined ? (
              <div className="space-y-4 py-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check className="h-6 w-6" />
                </span>
                <h2 className="font-serif text-3xl font-bold text-foreground">
                  {alreadyJoined ? "You are already on the list" : "You are on the list"}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  We will contact you on WhatsApp to set up your bakery account. If you want to start now, you can also{" "}
                  <Link href="/dashboard/register" className="font-semibold text-primary hover:underline">create a free account</Link>
                  {" "}— the menu agent is included.
                </p>
                <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-primary">
                  Back to Sweet Tooth <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground">Request early access</h2>
                  <p className="mt-1 text-sm text-muted-foreground">We use this to WhatsApp you and walk you through onboarding.</p>
                </div>
                <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bakery name
                  <input
                    required
                    value={bakerName}
                    onChange={(e) => setBakerName(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-border bg-card px-3.5 text-sm font-semibold normal-case text-foreground outline-none focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                    placeholder="e.g. Sana's Kitchen"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email
                  <input
                    required
                    type="email"
                    value={bakerEmail}
                    onChange={(e) => setBakerEmail(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-border bg-card px-3.5 text-sm font-semibold normal-case text-foreground outline-none focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                    placeholder="you@bakery.com"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  WhatsApp number
                  <input
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-border bg-card px-3.5 text-sm font-semibold normal-case text-foreground outline-none focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                    placeholder="03XX XXXXXXX"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  City <span className="font-medium normal-case tracking-normal text-muted-foreground">(optional)</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-border bg-card px-3.5 text-sm font-semibold normal-case text-foreground outline-none focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                    placeholder="Lahore, Karachi, Islamabad…"
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Anything we should know? <span className="font-medium normal-case tracking-normal text-muted-foreground">(optional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-semibold normal-case text-foreground outline-none focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                    placeholder="e.g. I bake from DHA Lahore, about 40 orders a month, mainly WhatsApp."
                  />
                </label>
                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Joining…" : "Join the waitlist"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Already invited?{" "}
                  <Link href="/dashboard/login" className="font-semibold text-primary hover:underline">
                    Baker sign in
                  </Link>
                  {" · "}
                  Not a baker?{" "}
                  <Link href="/review" className="font-semibold text-primary hover:underline">
                    Review the app
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </BuyerLayout>
  );
}
