import { useMemo, useState } from "react";
import { ArrowRight, Calculator, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import {
  BAKER_SIZE_OPTIONS,
  CHANNEL_BUNDLE_OPTIONS,
  formatPkr,
  getOffersForFilters,
  getPlanById,
  suggestPlan,
  type BakerSize,
  type ChannelBundle,
} from "@/lib/pricing-plans";

export function PlanPicker({ registerHref = "/dashboard/register" }: { registerHref?: string }) {
  const [ordersPerMonth, setOrdersPerMonth] = useState("80");
  const [needsWhatsApp, setNeedsWhatsApp] = useState(true);
  const [needsInstagram, setNeedsInstagram] = useState(false);
  const [teamSize, setTeamSize] = useState("1");

  const orders = Math.max(0, parseInt(ordersPerMonth, 10) || 0);
  const suggestion = useMemo(
    () =>
      suggestPlan({
        ordersPerMonth: orders,
        needsWhatsApp,
        needsInstagram,
        teamSize: parseInt(teamSize, 10) || 1,
      }),
    [orders, needsWhatsApp, needsInstagram, teamSize],
  );

  const offer = getOffersForFilters(suggestion.size, suggestion.channelBundle)[0];
  const plan = getPlanById(suggestion.planId)!;
  const sizeLabel = BAKER_SIZE_OPTIONS.find((o) => o.value === suggestion.size)?.label;
  const channelLabel = CHANNEL_BUNDLE_OPTIONS.find((o) => o.value === suggestion.channelBundle)?.label;

  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-primary/25 bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-xl font-bold">Find your offer</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter orders and which agents you need — we suggest size, channel bundle, and chat volume.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Orders per month
          <input
            type="number"
            min={0}
            value={ordersPerMonth}
            onChange={(e) => setOrdersPerMonth(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium">
          Team size (dashboard logins)
          <select
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="1">Just me</option>
            <option value="2">2 people</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={needsWhatsApp}
            onChange={(e) => setNeedsWhatsApp(e.target.checked)}
            className="rounded border-border"
          />
          Need WhatsApp agent
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={needsInstagram}
            onChange={(e) => setNeedsInstagram(e.target.checked)}
            className="rounded border-border"
          />
          Need Instagram agent
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Suggested:</span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {offer?.name ?? plan.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {sizeLabel} · {channelLabel}
          </span>
        </div>
        <p className="mt-2 text-sm">{suggestion.reason}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span>
              Est. chats: <strong>{suggestion.estimatedChats}</strong> / month
            </span>
          </div>
          {offer && (
            <>
              <div>
                Included: <strong>{offer.chatNote}</strong>
              </div>
              <div>
                From: <strong>{formatPkr(offer.monthlyPkr)}</strong>/mo
              </div>
            </>
          )}
        </div>
        <Link
          href={`${registerHref}?plan=${suggestion.planId}&size=${suggestion.size}&channel=${suggestion.channelBundle}`}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          Start with {offer?.name ?? plan.name}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
