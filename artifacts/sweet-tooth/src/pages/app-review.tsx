import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { APP_REVIEW_ROLES, APP_REVIEW_USED_HOW, type AppReviewRoleId, type AppReviewUsedHowId } from "@/lib/app-review";
import { apiUrl } from "@/lib/api-url";

export default function AppReviewPage() {
  const [reviewerName, setReviewerName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppReviewRoleId | "">("");
  const [roleNote, setRoleNote] = useState("");
  const [usedHow, setUsedHow] = useState<AppReviewUsedHowId | "">("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/app-reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName,
          email: email || undefined,
          role,
          roleNote: roleNote.trim() || undefined,
          usedHow: usedHow || undefined,
          rating,
          reviewText,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not send your review. Check the fields and try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BuyerLayout>
      <section className="relative overflow-hidden bg-background px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative mx-auto grid max-w-5xl items-start gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Open to everyone
            </p>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-[0.95] tracking-[-0.04em] text-foreground sm:text-6xl">
              Review Sweet Tooth
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Tell us who you are — home baker, student, developer, designer, or something else — then write freely about what you thought.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              You do not need a bakery account. We read baker notes separately from student, developer, and jury feedback.
            </p>
            <Link href="/waitlist" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              Want a bakery workspace instead? Join the waitlist
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[28px] border border-border bg-white p-6 shadow-sm sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-5 w-5" />
                </span>
                <h2 className="font-serif text-2xl font-bold">Thank you</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Your review is saved with who you are. The team reads these in Admin next to the baker waitlist.
                </p>
              </div>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                <label className="block text-sm font-bold">
                  Your name
                  <input required minLength={2} value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                <label className="block text-sm font-bold">
                  Email <span className="font-medium text-muted-foreground">(optional)</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                <fieldset>
                  <legend className="text-sm font-bold">Who are you?</legend>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Baker, developer, student, designer — tap one.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {APP_REVIEW_ROLES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id)}
                        className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                          role === item.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/40"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-bold">
                  More about you {role === "other" ? "" : <span className="font-medium text-muted-foreground">(optional)</span>}
                  <input
                    required={role === "other"}
                    minLength={role === "other" ? 2 : undefined}
                    maxLength={160}
                    value={roleNote}
                    onChange={(event) => setRoleNote(event.target.value)}
                    placeholder="e.g. CS student at FAST, baker from Karachi, product designer…"
                    className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <fieldset>
                  <legend className="text-sm font-bold">How did you try it? <span className="font-medium text-muted-foreground">(optional)</span></legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {APP_REVIEW_USED_HOW.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setUsedHow(item.id)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          usedHow === item.id
                            ? "border-secondary bg-secondary text-secondary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-secondary/50"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-bold">Rating</legend>
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`h-11 w-11 rounded-xl border text-sm font-bold ${
                          rating >= value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                        }`}
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-bold">
                  Write freely
                  <textarea
                    required
                    minLength={20}
                    rows={7}
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder="What worked, what confused you, and what you would change. Write as much as you like."
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || !role || rating < 1 || (role === "other" && roleNote.trim().length < 2)}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send review"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </BuyerLayout>
  );
}
