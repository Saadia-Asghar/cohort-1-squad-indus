import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useManagedBaker } from "@/lib/managed-auth";
import { captureProductEvent } from "@/lib/product-analytics";
import { WORKSPACE_CAPABILITIES, type WorkspaceCapabilityId } from "@/lib/workspace-capabilities";

const GUIDE = "/dashboard/guide?welcome=1";

export default function WelcomeFeatureFeedback() {
  const { bakerId } = useManagedBaker();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<WorkspaceCapabilityId[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: WorkspaceCapabilityId) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const save = async (skipped: boolean) => {
    setSaving(true);
    setError("");
    try {
      await customFetch(`/api/bakers/${bakerId}/signup-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureIds: skipped ? [] : selected,
          note: skipped ? "" : note.trim(),
          skipped,
        }),
      });
      captureProductEvent("signup_feature_feedback_submitted", {
        skipped,
        feature_count: skipped ? 0 : selected.length,
      });
      setLocation(GUIDE);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message.replace(/^HTTP \d+\s*[^:]*:\s*/, "") : "Could not save your choices";
      setError(message || "Could not save your choices");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/45 text-foreground">
      <section className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-secondary">One connected workspace</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-5xl">
          Which tools should we set up first?
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          These are the same four parts of Sweet Tooth shown on the homepage. Tap the ones that matter for your bakery. You can change this later.
        </p>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-primary/15 bg-primary text-primary-foreground shadow-lg">
          <div className="border-b border-primary-foreground/15 px-5 py-5 sm:px-7">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-secondary">Workspace navigator</p>
            <p className="mt-2 font-serif text-2xl font-semibold">Sweet Tooth OS</p>
          </div>
          <div className="space-y-2 p-4 sm:p-6">
            {WORKSPACE_CAPABILITIES.map((capability, index) => {
              const Icon = capability.icon;
              const on = selected.includes(capability.id);
              return (
                <button
                  key={capability.id}
                  type="button"
                  onClick={() => toggle(capability.id)}
                  className={`group relative w-full overflow-hidden rounded-[18px] border px-4 py-4 text-left transition duration-300 sm:px-5 sm:py-5 ${
                    on
                      ? "border-secondary/55 bg-background text-foreground shadow-md"
                      : "border-primary-foreground/12 bg-primary-foreground/[0.035] text-primary-foreground hover:border-primary-foreground/25 hover:bg-primary-foreground/[0.07]"
                  }`}
                >
                  {on && <span className="absolute bottom-0 left-0 top-0 w-1 bg-secondary" />}
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                        on ? "bg-primary text-primary-foreground" : "bg-primary-foreground/10 text-secondary"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-serif text-xl font-semibold sm:text-2xl">{capability.title}</p>
                        <span className={`font-serif text-lg ${on ? "text-secondary" : "text-primary-foreground/30"}`}>
                          0{index + 1}
                        </span>
                      </div>
                      <p className={`mt-2 text-xs leading-5 ${on ? "text-muted-foreground" : "text-primary-foreground/48"}`}>
                        {capability.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-6 block text-sm font-bold text-foreground">
          Anything else we should know?
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={400}
            rows={3}
            placeholder="Example: I need WhatsApp first, calendar later."
            className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={saving || selected.length === 0}
            onClick={() => void save(false)}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue to setup"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(true)}
            className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-muted-foreground transition hover:text-primary disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </section>
    </main>
  );
}
