import { useState } from "react";
import {
  useGetBakerBilling,
  useRequestBakerPlanUpgrade,
} from "@workspace/api-client-react";
import { Check, Copy, MessageCircle, Sparkles } from "lucide-react";
import {
  FOUNDER_OFFER_ACTIVE,
  PRICING_PLANS,
  displayPrice,
  getPlanById,
  type PricingPlan,
} from "@/lib/pricing-plans";

const PAID_PLANS = PRICING_PLANS.filter((p) => p.id !== "free");

export function PlatformBillingPanel({
  bakerId,
  currentPlanId,
}: {
  bakerId: number;
  currentPlanId?: string | null;
}) {
  const { data: billing, isLoading, error: loadError, refetch } = useGetBakerBilling(bakerId, {
    query: { enabled: bakerId > 0, queryKey: ["baker-billing", bakerId] },
  });
  const upgrade = useRequestBakerPlanUpgrade();
  const [requesting, setRequesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastWhatsApp, setLastWhatsApp] = useState<string | null>(null);

  async function requestUpgrade(plan: PricingPlan) {
    setError(null);
    setRequesting(plan.id);
    try {
      const result = await upgrade.mutateAsync({
        bakerId,
        data: { planId: plan.id as "starter" | "pro" | "bakery_plus" },
      });
      setLastWhatsApp(result.whatsappUrl ?? null);
      await refetch();
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upgrade request failed");
    } finally {
      setRequesting(null);
    }
  }

  async function copyPaymentDetails() {
    const text = billing?.platform.paymentDetails;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the text manually.");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading upgrade options…
      </div>
    );
  }

  const platform = billing?.platform;
  const pending = billing?.pending;
  const current = getPlanById(currentPlanId) ?? getPlanById("free");
  const loadMsg = loadError instanceof Error ? loadError.message : loadError ? "Could not load billing" : null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Pay Sweet Tooth (manual)
        </p>
        <h3 className="mt-1 font-serif text-xl font-bold text-foreground">Upgrade via WhatsApp</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No card gateway. Transfer JazzCash / Easypaisa / bank, then message us with your bakery name and
          receipt — we activate your plan.
        </p>
      </div>

      {platform && (
        <div className="rounded-lg border border-border bg-background/90 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Payment details</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{platform.paymentDetails}</p>
            </div>
            <button
              type="button"
              onClick={() => void copyPaymentDetails()}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{platform.instructions}</p>
          {!platform.enabled && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
              WhatsApp link not configured yet — pay using the details above, then message the founder
              manually with your bakery name and plan.
            </p>
          )}
        </div>
      )}

      {pending && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Pending: <strong>{pending.name}</strong> ({pending.amountLabel}). Send your receipt on WhatsApp —
          activation is usually same day after we confirm payment.
          {lastWhatsApp && (
            <a
              href={lastWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Open WhatsApp again
            </a>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {PAID_PLANS.map((plan) => {
          const price = displayPrice(plan, FOUNDER_OFFER_ACTIVE ? "quarterly" : "monthly");
          const isCurrent = current?.id === plan.id;
          const isPending = pending?.planId === plan.id;
          return (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <div>
                <p className="font-semibold text-foreground">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                <p className="mt-1 text-sm font-medium">
                  {price.primary}
                  <span className="font-normal text-muted-foreground"> {price.suffix}</span>
                </p>
              </div>
              <button
                type="button"
                disabled={isCurrent || requesting === plan.id}
                onClick={() => void requestUpgrade(plan)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isCurrent
                  ? "Current plan"
                  : isPending
                    ? requesting === plan.id
                      ? "Opening…"
                      : "Message again"
                    : requesting === plan.id
                      ? "Opening…"
                      : "Pay & WhatsApp"}
              </button>
            </div>
          );
        })}
      </div>

      {(error || loadMsg) && <p className="text-sm text-destructive">{error ?? loadMsg}</p>}
    </div>
  );
}
