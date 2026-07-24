import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import {
  APP_SERVICES,
  BAKER_SIZE_OPTIONS,
  BILLING_PERIOD_OPTIONS,
  CHANNEL_BUNDLE_OPTIONS,
  FOUNDER_OFFER_ACTIVE,
  FOUNDER_OFFER_LABEL,
  FOUNDER_OFFER_NOTE,
  MARKET_COMPARISON,
  PRICING_COST_BASIS,
  PRICING_PLANS,
  displayOfferPrice,
  formatPkr,
  getOffersForFilters,
  serviceLabels,
  type BakerSize,
  type BillingPeriod,
  type ChannelBundle,
  type OfferPlan,
  type PlanId,
} from "@/lib/pricing-plans";
import { PlanPicker } from "@/components/marketing/plan-picker";

function OfferCard({
  offer,
  period,
  registerHref = "/dashboard/register",
}: {
  offer: OfferPlan;
  period: Exclude<BillingPeriod, "quarterly">;
  registerHref?: string;
}) {
  const price = displayOfferPrice(offer, period);
  const featured = offer.featured;
  const services = serviceLabels(offer.serviceIds);

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
        featured
          ? "border-primary bg-primary text-primary-foreground shadow-lg"
          : "border-border bg-card"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
          Recommended
        </span>
      )}
      {offer.monthlyPkr === 0 && (
        <span className="absolute -top-3 left-6 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
          Start free
        </span>
      )}

      <div>
        <p className={`text-xs font-bold uppercase tracking-wide ${featured ? "text-white/70" : "text-muted-foreground"}`}>
          {offer.sizeLabel} bakery
        </p>
        <h3 className="mt-1 font-serif text-2xl font-bold">{offer.name}</h3>
        <p className={`mt-2 text-sm leading-relaxed ${featured ? "text-white/85" : "text-muted-foreground"}`}>
          {offer.tagline}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-bold tabular-nums md:text-4xl">
          {price.primary}
          <span className={`ml-1 text-sm font-medium ${featured ? "text-white/80" : "text-muted-foreground"}`}>
            {price.suffix}
          </span>
        </p>
        {price.sub && (
          <p className={`mt-1 text-sm ${featured ? "text-white/75" : "text-muted-foreground"}`}>{price.sub}</p>
        )}
        {price.savings && (
          <p className={`mt-1 text-xs font-semibold ${featured ? "text-secondary" : "text-green-700"}`}>
            {price.savings}
          </p>
        )}
      </div>

      <div className={`mt-4 rounded-lg px-3 py-2.5 text-xs space-y-1 ${featured ? "bg-white/10" : "bg-muted/60"}`}>
        <p className="font-semibold flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          {offer.chatNote}
        </p>
        <p className="opacity-90">{offer.aiRepliesPerMonth.toLocaleString()} AI / agent replies / month</p>
        <p className="opacity-90">Up to {offer.maxOrdersPerMonth} orders / month</p>
        <p className="opacity-90">
          {offer.maxProducts == null ? "Unlimited menu items" : `Up to ${offer.maxProducts} menu items`}
          {offer.staffLogins > 1 ? ` · ${offer.staffLogins} staff logins` : ""}
        </p>
      </div>

      <div className="mt-5">
        <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${featured ? "text-white/70" : "text-muted-foreground"}`}>
          Included services
        </p>
        <ul className="space-y-2 text-sm max-h-56 overflow-y-auto pr-1">
          {services.map((feature) => (
            <li key={feature} className="flex gap-2">
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-secondary" : "text-primary"}`}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {offer.extraReplyPkr > 0 && (
        <p className={`mt-4 text-xs ${featured ? "text-white/70" : "text-muted-foreground"}`}>
          Extra agent replies: {formatPkr(offer.extraReplyPkr)} each after bundle
          {offer.commissionPercent > 0
            ? ` · ${offer.commissionPercent}% checkout commission (max ${formatPkr(offer.commissionCapPkr)}/mo)`
            : " · 0% commission"}
        </p>
      )}

      <Link
        href={`${registerHref}?plan=${offer.planId}&offer=${offer.id}&billing=${period}`}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition-colors ${
          featured
            ? "bg-secondary text-primary hover:bg-secondary/90"
            : offer.monthlyPkr === 0
              ? "border border-primary text-primary hover:bg-primary/5"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {offer.monthlyPkr === 0 ? "Start free" : `Choose ${offer.name}`}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  const [size, setSize] = useState<BakerSize>("medium");
  const [channel, setChannel] = useState<ChannelBundle>("whatsapp_only");
  const [billing, setBilling] = useState<Exclude<BillingPeriod, "quarterly">>("monthly");

  const offers = useMemo(() => getOffersForFilters(size, channel), [size, channel]);

  return (
    <section id="pricing" className="scroll-mt-20 bg-muted px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className={`mx-auto text-center ${compact ? "max-w-3xl" : "max-w-2xl"}`}>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Offers for Pakistan bakeries</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Small, medium or large — pick agents and how you pay.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Offers change by bakery size, WhatsApp / Instagram activation, and monthly · 6-month · yearly billing.
          </p>
        </div>

        {FOUNDER_OFFER_ACTIVE && (
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-primary">{FOUNDER_OFFER_LABEL}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{FOUNDER_OFFER_NOTE}</p>
            </div>
          </div>
        )}

        {/* Offer filters */}
        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Build your offer</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose bakery size, which agents you want, and billing — cards below update instantly.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium">
              Bakery size
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as BakerSize)}
                className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                {BAKER_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground font-normal">
                {BAKER_SIZE_OPTIONS.find((o) => o.value === size)?.hint}
              </span>
            </label>

            <label className="text-sm font-medium">
              Agents to activate
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelBundle)}
                className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                {CHANNEL_BUNDLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground font-normal">
                {CHANNEL_BUNDLE_OPTIONS.find((o) => o.value === channel)?.hint}
              </span>
            </label>

            <label className="text-sm font-medium">
              Billing period
              <select
                value={billing}
                onChange={(e) => setBilling(e.target.value as Exclude<BillingPeriod, "quarterly">)}
                className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                {BILLING_PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground font-normal">
                {BILLING_PERIOD_OPTIONS.find((o) => o.value === billing)?.hint}
              </span>
            </label>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} period={billing} />
          ))}
        </div>

        {offers.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No offer for this combination — try another agent option.
          </p>
        )}

        {/* All services catalogue */}
        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border bg-card p-6">
          <h3 className="font-serif text-xl font-bold">Everything Sweet Tooth can do for your bakery</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each offer includes a subset of these services. Upgrade size or agents to unlock more.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 text-sm">
            {APP_SERVICES.map((service) => (
              <li key={service.id} className="flex gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{service.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <PlanPicker />

        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Why we charge this way</p>
          <ul className="mt-2 space-y-1.5 list-disc pl-5">
            {PRICING_COST_BASIS.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>
              <strong>0% on Launch Free</strong> — you keep your full cake price (unlike delivery apps).
            </li>
            <li>
              <strong>Commission only on checkout orders</strong>, capped monthly so low-revenue bakers are protected.
            </li>
            <li>{MARKET_COMPARISON.foodpanda}</li>
          </ul>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No customer payment gateway required. Take Easypaisa, JazzCash or bank transfer — review receipts in your
          dashboard.
        </p>
      </div>
    </section>
  );
}

export function PlanBadge({ planId }: { planId?: PlanId | string | null }) {
  const plan = PRICING_PLANS.find((p) => p.id === planId) ?? PRICING_PLANS[0];
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
      {plan.name}
    </span>
  );
}
