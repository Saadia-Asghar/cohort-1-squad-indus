import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  PRICING_PLANS,
  displayOfferPrice,
  getOffersForFilters,
  serviceLabels,
  type OfferPlan,
  type PlanId,
} from "@/lib/pricing-plans";

const launchOffers = (["small", "medium", "large"] as const)
  .map((size) => getOffersForFilters(size, "whatsapp_only")[0])
  .filter((offer): offer is OfferPlan => Boolean(offer));

function OfferCard({ offer }: { offer: OfferPlan }) {
  const price = displayOfferPrice(offer, "monthly");
  const included = serviceLabels(offer.serviceIds).slice(0, 4);

  return (
    <article className={`flex h-full flex-col rounded-2xl border p-6 ${offer.featured ? "border-primary bg-primary text-primary-foreground shadow-lg" : "border-border bg-card"}`}>
      <p className={`text-sm font-semibold ${offer.featured ? "text-white/75" : "text-muted-foreground"}`}>{offer.sizeLabel} bakery</p>
      <h3 className="mt-2 font-serif text-2xl font-bold">{offer.name}</h3>
      <p className={`mt-2 text-sm ${offer.featured ? "text-white/85" : "text-muted-foreground"}`}>{offer.tagline}</p>
      <p className="mt-6 text-3xl font-bold">{price.primary}<span className={`ml-1 text-sm font-medium ${offer.featured ? "text-white/75" : "text-muted-foreground"}`}>{price.suffix}</span></p>
      <ul className="mt-6 space-y-3 text-sm">{included.map((feature) => <li key={feature} className="flex gap-2"><CheckCircle2 className={`h-4 w-4 shrink-0 ${offer.featured ? "text-secondary" : "text-primary"}`} />{feature}</li>)}</ul>
      <Link href="/waitlist" className={`mt-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold transition-colors ${offer.featured ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>Join waitlist <ArrowRight className="h-4 w-4" /></Link>
    </article>
  );
}

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="pricing" className="scroll-mt-20 bg-muted px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center"><h2 className="font-serif text-4xl font-bold">Simple pricing. No surprises.</h2><p className="mt-3 text-muted-foreground">Join the waitlist for the plan that fits. We contact you to onboard — you do not create an account yourself.</p></div>
        <div className={`mx-auto mt-10 grid gap-5 ${compact ? "max-w-4xl md:grid-cols-2" : "lg:grid-cols-3"}`}>{launchOffers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</div>
        <p className="mt-7 text-center text-sm text-muted-foreground">Leave your details on the waitlist. We WhatsApp you and set up the workspace together.</p>
      </div>
    </section>
  );
}

export function PlanBadge({ planId }: { planId?: PlanId | string | null }) {
  const plan = PRICING_PLANS.find((item) => item.id === planId) ?? PRICING_PLANS[0];
  return <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{plan.name}</span>;
}
