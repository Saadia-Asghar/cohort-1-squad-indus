import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PlanPicker } from "@/components/marketing/plan-picker";
import {
  COST_ESTIMATE_AS_OF,
  PRICING_COST_BASIS,
  PRICING_PLANS,
  UNIT_ECONOMICS_NOTE,
  bakerMonthCostLabel,
  displayPrice,
  estimatePlanCosts,
  formatPkr,
  type PlanId,
  type PricingPlan,
} from "@/lib/pricing-plans";

function PlanOfferCard({ plan }: { plan: PricingPlan }) {
  const price = displayPrice(plan, "monthly");
  const estimate = estimatePlanCosts(plan);
  const featured = Boolean(plan.featured);
  const ctaHref = plan.id === "free" ? "/dashboard/register" : "/waitlist";
  const ctaLabel = plan.id === "free" ? "Create a free account" : "Join waitlist";

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border p-6 ${
        featured ? "border-primary bg-primary text-primary-foreground shadow-lg" : "border-border bg-card"
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.16em] ${featured ? "text-white/75" : "text-primary"}`}>
        This month you get
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {estimate.included.map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-secondary" : "text-primary"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-5 border-t pt-4 ${featured ? "border-white/20" : "border-border"}`}>
        <p className={`text-xs font-semibold ${featured ? "text-white/75" : "text-muted-foreground"}`}>
          That’s this plan
        </p>
        <h3 className="mt-1 font-serif text-2xl font-bold">{plan.name}</h3>
        <p className={`mt-1 text-sm ${featured ? "text-white/85" : "text-muted-foreground"}`}>{plan.tagline}</p>
        <p className="mt-4 text-3xl font-bold">
          {price.primary}
          <span className={`ml-1 text-sm font-medium ${featured ? "text-white/75" : "text-muted-foreground"}`}>
            {price.suffix}
          </span>
        </p>
        <p className={`mt-2 text-sm ${featured ? "text-white/85" : "text-foreground"}`}>
          Your month: {bakerMonthCostLabel(plan)}
        </p>
      </div>

      <div className={`mt-4 space-y-1 rounded-xl px-3 py-3 text-xs ${featured ? "bg-white/10" : "bg-muted/60"}`}>
        <p className="flex items-start justify-between gap-3">
          <span className={featured ? "text-white/75" : "text-muted-foreground"}>Our cost on localhost</span>
          <span className="font-semibold">{formatPkr(estimate.localhostPkr)}</span>
        </p>
        <p className="flex items-start justify-between gap-3">
          <span className={featured ? "text-white/75" : "text-muted-foreground"}>Our cost on production</span>
          <span className="text-right font-semibold">~{formatPkr(estimate.productionPkr)}</span>
        </p>
        <p className={featured ? "text-white/65" : "text-muted-foreground"}>
          At this plan’s monthly cap · {COST_ESTIMATE_AS_OF}
        </p>
      </div>

      <Link
        href={ctaHref}
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold transition-colors ${
          featured
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {ctaLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  const plans = compact ? PRICING_PLANS.filter((plan) => plan.id !== "bakery_plus") : PRICING_PLANS;

  return (
    <section id="pricing" className="scroll-mt-24 bg-muted px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl font-bold">This much, this month — then this is the plan</h2>
          <p className="mt-3 text-muted-foreground">{UNIT_ECONOMICS_NOTE}</p>
        </div>
        <div className={`mx-auto mt-10 grid gap-5 ${compact ? "max-w-4xl md:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-4"}`}>
          {plans.map((plan) => (
            <PlanOfferCard key={plan.id} plan={plan} />
          ))}
        </div>
        <PlanPicker />
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card/80 p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">What these production numbers include</p>
          <ul className="mt-3 space-y-2">
            {PRICING_COST_BASIS.map((line) => (
              <li key={line} className="leading-6">
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-7 text-center text-sm text-muted-foreground">
          Want to start now?{" "}
          <Link href="/dashboard/register" className="font-semibold text-primary hover:underline">
            Create a free account
          </Link>{" "}
          with the menu agent. Paid channels can be added when you are ready.
        </p>
      </div>
    </section>
  );
}

export function PlanBadge({ planId }: { planId?: PlanId | string | null }) {
  const plan = PRICING_PLANS.find((item) => item.id === planId) ?? PRICING_PLANS[0];
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
      {plan.name}
    </span>
  );
}
