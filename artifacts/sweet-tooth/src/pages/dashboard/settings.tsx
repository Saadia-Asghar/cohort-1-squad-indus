import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PlanBadge } from "@/components/marketing/pricing-section";
import { useBuyerSession } from "@/hooks/use-session";
import { useGetBaker, useUpdateBaker, getGetBakerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Copy, Facebook, Instagram, QrCode, Share2, Sparkles, ArrowRight } from "lucide-react";
import { getPlanById, FOUNDER_OFFER_ACTIVE, formatExtraReplyPkr, getFounderOfferLines, displayPrice } from "@/lib/pricing-plans";
import { PlatformBillingPanel } from "@/components/dashboard/platform-billing-panel";
import { TeamAccessPanel } from "@/components/dashboard/team-access-panel";
import {
  OCCASION_PRESET_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  type OccasionPreset,
  type PaymentMode,
} from "@/lib/shop-settings";

export default function DashboardSettings() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: baker, isLoading } = useGetBaker(bakerId);
  const updateBaker = useUpdateBaker();

  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [codPolicy, setCodPolicy] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cod");
  const [advanceThresholdPkr, setAdvanceThresholdPkr] = useState(2000);
  const [advancePercentage, setAdvancePercentage] = useState(50);
  const [paymentDetails, setPaymentDetails] = useState("");
  const [occasionPreset, setOccasionPreset] = useState<OccasionPreset>("normal");
  const [occasionCustomLabel, setOccasionCustomLabel] = useState("");
  const [occasionOrderDeadline, setOccasionOrderDeadline] = useState("");
  const [occasionFreshDays, setOccasionFreshDays] = useState("2");
  const [occasionNote, setOccasionNote] = useState("");
  const [deliveryAreasText, setDeliveryAreasText] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(10);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [allowPickup, setAllowPickup] = useState(true);
  const [allowDelivery, setAllowDelivery] = useState(true);
  const [cancellationAllowed, setCancellationAllowed] = useState(true);
  const [cancellationHoursBefore, setCancellationHoursBefore] = useState("24");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const shopUrl = typeof window === "undefined" ? "" : `${window.location.origin}/menu/${bakerId}`;
  const qrCodeUrl = shopUrl ? `https://quickchart.io/qr?size=260&text=${encodeURIComponent(shopUrl)}` : "";

  const copyShopLink = async () => {
    await navigator.clipboard.writeText(shopUrl);
    alert("Your menu link has been copied.");
  };

  const shareShop = async () => {
    if (navigator.share) {
      await navigator.share({ title: baker?.businessName ?? "Sweet Tooth", text: "Browse my menu and place an order.", url: shopUrl });
      return;
    }
    await copyShopLink();
  };

  const addBlockedDate = () => {
    if (!newBlockDate) return;
    if (blockedDates.includes(newBlockDate)) {
      alert("This date is already blocked!");
      return;
    }
    setBlockedDates([...blockedDates, newBlockDate].sort());
    setNewBlockDate("");
  };

  const removeBlockedDate = (dateToRemove: string) => {
    setBlockedDates(blockedDates.filter(d => d !== dateToRemove));
  };

  useEffect(() => {
    if (baker) {
      setBusinessName(baker.businessName ?? "");
      setTagline(baker.tagline ?? "");
      setWhatsappNumber(baker.whatsappNumber ?? "");
      setCodPolicy(baker.codPolicy ?? "");
      setAdvanceThresholdPkr(baker.advanceThresholdPkr ?? 2000);
      setAdvancePercentage(baker.advancePercentage ?? 50);
      setPaymentDetails(baker.paymentDetails ?? "");
      setDeliveryAreasText((baker.deliveryAreas ?? []).join(", "));
      setMaxOrdersPerDay(baker.maxOrdersPerDay ?? 10);
      const conf = (baker as any).agentConfig ?? {};
      const mode = conf.paymentMode as PaymentMode | undefined;
      if (mode === "cod" || mode === "partial_advance" || mode === "full_advance") {
        setPaymentMode(mode);
      } else if (baker.requireAdvance && (baker.advancePercentage ?? 0) >= 100) {
        setPaymentMode("full_advance");
      } else if (baker.requireAdvance) {
        setPaymentMode("partial_advance");
      } else {
        setPaymentMode("cod");
      }
      setOccasionPreset(conf.occasionPreset ?? "normal");
      setOccasionCustomLabel(conf.occasionCustomLabel ?? "");
      setOccasionOrderDeadline(conf.occasionOrderDeadline ?? "");
      setOccasionFreshDays(String(conf.occasionFreshDays ?? 2));
      setOccasionNote(conf.occasionNote ?? "");
      setBlockedDates(conf.blockedDates ?? []);
      setPickupAddress(conf.pickupAddress ?? "");
      setAllowPickup(conf.allowPickup !== false);
      setAllowDelivery(conf.allowDelivery !== false);
      setCancellationAllowed(conf.cancellationAllowed !== false);
      setCancellationHoursBefore(String(conf.cancellationHoursBefore ?? 24));
      setCancellationPolicy(conf.cancellationPolicy ?? "");
      const links = (baker as any).socialLinks ?? {};
      setInstagramUrl(links.instagram ?? "");
      setFacebookUrl(links.facebook ?? "");
    }
  }, [baker]);

  const handleSave = () => {
    const socialLinks = {
      ...(instagramUrl.trim() ? { instagram: instagramUrl.trim() } : {}),
      ...(facebookUrl.trim() ? { facebook: facebookUrl.trim() } : {}),
    };

    updateBaker.mutate({
      bakerId,
      data: {
        businessName,
        tagline,
        codPolicy,
        paymentMode,
        advanceThresholdPkr: paymentMode === "partial_advance" ? advanceThresholdPkr : paymentMode === "full_advance" ? 0 : advanceThresholdPkr,
        advancePercentage: paymentMode === "full_advance" ? 100 : paymentMode === "partial_advance" ? advancePercentage : 0,
        paymentDetails,
        deliveryAreas: deliveryAreasText.split(",").map((area) => area.trim()).filter(Boolean),
        socialLinks,
        maxOrdersPerDay,
        blockedDates,
        occasionPreset,
        occasionCustomLabel: occasionCustomLabel.trim(),
        occasionOrderDeadline: occasionOrderDeadline || undefined,
        occasionFreshDays: occasionPreset === "normal" ? undefined : parseInt(occasionFreshDays, 10) || 0,
        occasionNote: occasionNote.trim(),
        pickupAddress: pickupAddress.trim(),
        allowPickup,
        allowDelivery,
        cancellationAllowed,
        cancellationHoursBefore: parseInt(cancellationHoursBefore, 10) || 0,
        cancellationPolicy: cancellationPolicy.trim(),
      } as Record<string, unknown>,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBakerQueryKey(bakerId) });
        alert("Settings saved successfully!");
      },
      onError: (err) => {
        alert("Failed to save settings: " + (err as any).message);
      }
    });
  };

  if (isLoading && !baker) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl animate-pulse space-y-4">
          <div className="h-10 w-64 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-2 font-serif text-primary">Your kitchen, your rules.</h1>
        <p className="text-muted-foreground mb-8">Manage your profile, delivery areas, and policies.</p>

        {baker && (
          <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your package</p>
                <div className="mt-2 flex items-center gap-2">
                  <PlanBadge planId={baker.subscriptionPlan} />
                  <span className="text-sm text-muted-foreground">
                    {getPlanById(baker.subscriptionPlan)?.tagline}
                  </span>
                </div>
                {(baker as { trial?: { isFree?: boolean; expired?: boolean; daysLeft?: number | null } }).trial?.isFree && (
                  <p className={`mt-2 text-sm ${(baker as { trial?: { expired?: boolean } }).trial?.expired ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {(baker as { trial?: { expired?: boolean; daysLeft?: number | null } }).trial?.expired
                      ? "3-day trial ended — upgrade to restore the agent and broadcasts."
                      : `Trial: ${(baker as { trial?: { daysLeft?: number | null } }).trial?.daysLeft ?? 0} day(s) left.`}
                  </p>
                )}
                {(() => {
                  const plan = getPlanById(baker.subscriptionPlan) ?? getPlanById("free")!;
                  const price = displayPrice(plan, FOUNDER_OFFER_ACTIVE ? "quarterly" : "monthly");
                  return (
                    <>
                      {plan.monthlyPkr > 0 && (
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {price.primary} <span className="font-normal text-muted-foreground">{price.suffix}</span>
                          {price.sub && <span className="block text-xs text-muted-foreground mt-0.5">{price.sub}</span>}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground">
                        {plan.commissionPercent > 0
                          ? `${plan.commissionPercent}% commission on checkout orders (max ${plan.commissionCapPkr.toLocaleString()} PKR/mo) · `
                          : "0% commission · "}
                        Extra agent replies {formatExtraReplyPkr(plan.extraReplyPkr)} each
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.limits.aiReplies} included · {plan.limits.whatsappChats}</p>
                    </>
                  );
                })()}
              </div>
              <a
                href="#platform-billing"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                {baker.subscriptionPlan === "free" || baker.subscriptionPlan === "starter" ? "Upgrade" : "Change plan"}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            {FOUNDER_OFFER_ACTIVE && baker.subscriptionPlan === "free" && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-background/80 p-3">
                <p className="text-xs font-bold text-primary">Founder rate — lock in for 3 months</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getFounderOfferLines().join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">First month 0% commission on checkout orders.</p>
              </div>
            )}
          </div>
        )}

        {bakerId > 0 && (
          <div id="platform-billing" className="mb-8 scroll-mt-6">
            <PlatformBillingPanel bakerId={bakerId} currentPlanId={baker?.subscriptionPlan} />
          </div>
        )}

        {bakerId > 0 && (
          <div id="team-access" className="mb-8 scroll-mt-6">
            <TeamAccessPanel bakerId={bakerId} />
          </div>
        )}
        
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Kitchen Details</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Business Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tagline</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={tagline}
                onChange={e => setTagline(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp Number</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-xl font-bold">Share your menu</h3>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Delivery sectors / areas</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Gulberg, DHA Phase 5, Model Town"
                value={deliveryAreasText}
                onChange={e => setDeliveryAreasText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate sectors with commas. Your menu assistant uses these areas when answering delivery questions.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-foreground"><span className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram profile link</span><input type="url" className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="https://instagram.com/yourbakery" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} /></label>
              <label className="space-y-2 text-sm font-medium text-foreground"><span className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Facebook page link</span><input type="url" className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="https://facebook.com/yourbakery" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} /></label>
            </div>
            <p className="text-sm text-muted-foreground">Customers scan this QR code to open your live menu, talk to your assistant, and place an order.</p>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {qrCodeUrl && <img src={qrCodeUrl} alt={`QR code for ${baker?.businessName ?? "your shop"}`} className="w-40 h-40 rounded-lg border border-border bg-white p-2" />}
              <div className="space-y-3 flex-1 min-w-0">
                <input readOnly value={shopUrl} className="w-full px-3 py-2 border border-border rounded-md bg-muted text-sm" aria-label="Your menu link" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={copyShopLink} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted"><Copy className="w-4 h-4" /> Copy link</button>
                  <button onClick={shareShop} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Share2 className="w-4 h-4" /> Share shop</button>
                </div>
                <p className="text-xs text-muted-foreground">Print this QR code on packaging, business cards, or Instagram stories.</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Occasion orders (Eid & special dates)</h3>
            <p className="text-sm text-muted-foreground">
              Choose how your menu behaves during Eid or a custom rush. Shown as a banner on your shared menu link.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Occasion mode</label>
              <select
                value={occasionPreset}
                onChange={(e) => setOccasionPreset(e.target.value as OccasionPreset)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {OCCASION_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {occasionPreset === "custom" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Custom occasion name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="e.g. Ramadan pre-orders, Wedding season"
                  value={occasionCustomLabel}
                  onChange={(e) => setOccasionCustomLabel(e.target.value)}
                />
              </div>
            )}
            {occasionPreset !== "normal" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Last date to accept orders</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      value={occasionOrderDeadline}
                      onChange={(e) => setOccasionOrderDeadline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Baked fresh (days before delivery)</label>
                    <input
                      type="number"
                      min={0}
                      max={14}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      value={occasionFreshDays}
                      onChange={(e) => setOccasionFreshDays(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">How many days before the event you start baking fresh.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Note for customers (optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[72px]"
                    placeholder="e.g. Eid boxes available for pickup only. Order early — slots fill fast."
                    value={occasionNote}
                    onChange={(e) => setOccasionNote(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Payment options for customers</h3>
            <p className="text-sm text-muted-foreground">Select how buyers pay. This appears on your menu and at checkout.</p>
            <div className="space-y-3">
              {PAYMENT_MODE_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex gap-3 rounded-lg border p-4 cursor-pointer ${paymentMode === opt.value ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input
                    type="radio"
                    name="paymentMode"
                    value={opt.value}
                    checked={paymentMode === opt.value}
                    onChange={() => setPaymentMode(opt.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {paymentMode === "partial_advance" && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Minimum order (PKR) for advance</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    value={advanceThresholdPkr}
                    onChange={(e) => setAdvanceThresholdPkr(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Advance percentage (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    value={advancePercentage}
                    onChange={(e) => setAdvancePercentage(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {paymentMode !== "cod" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Payment account details</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
                  placeholder="e.g. Easypaisa: 0300-1234567 (Sana Asghar) · Bank: HBL ..."
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Shown to buyers when advance payment is required.</p>
              </div>
            )}

            {paymentMode === "cod" && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <label className="text-sm font-medium text-foreground">Cash on delivery policy (shown on menu)</label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
                  value={codPolicy}
                  onChange={(e) => setCodPolicy(e.target.value)}
                  placeholder="e.g. Full payment in cash when your order is delivered."
                />
              </div>
            )}
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">📅 Calendar Capacity & Date Blocking</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Maximum orders per day</label>
              <input 
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                value={maxOrdersPerDay}
                onChange={e => setMaxOrdersPerDay(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">The calendar will display alerts when this limit is reached for a specific day.</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/50">
              <label className="text-sm font-medium text-foreground block">Block custom dates (e.g. Vacations or Holidays)</label>
              <div className="flex gap-2">
                <input 
                  type="date"
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                  value={newBlockDate}
                  onChange={e => setNewBlockDate(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addBlockedDate}
                  className="px-4 py-2 bg-secondary text-primary hover:bg-secondary/90 font-medium rounded-md transition-colors cursor-pointer"
                >
                  Block Date
                </button>
              </div>

              {blockedDates.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {blockedDates.map((date) => (
                    <span 
                      key={date} 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 animate-in fade-in duration-100"
                    >
                      {date}
                      <button 
                        type="button" 
                        onClick={() => removeBlockedDate(date)}
                        className="hover:text-destructive/80 font-bold focus:outline-none cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No dates currently blocked.</p>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Kitchen policies (agent uses these)</h3>
            <p className="text-xs text-muted-foreground">Delivery, pickup, and cancellation rules are shared with buyers via your AI assistant.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allowDelivery} onChange={(e) => setAllowDelivery(e.target.checked)} />
              Offer home delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allowPickup} onChange={(e) => setAllowPickup(e.target.checked)} />
              Offer pickup from my kitchen
            </label>
            <label className="block text-sm font-medium">
              Pickup address (shown to buyers)
              <input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="e.g. House 12, Street 5, Gulberg III, Lahore"
                className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cancellationAllowed} onChange={(e) => setCancellationAllowed(e.target.checked)} />
              Allow order cancellations
            </label>
            {cancellationAllowed && (
              <label className="block text-sm font-medium">
                Cancel at least how many hours before delivery?
                <input
                  type="number"
                  min={0}
                  value={cancellationHoursBefore}
                  onChange={(e) => setCancellationHoursBefore(e.target.value)}
                  className="mt-1 w-32 px-3 py-2 border border-border rounded-md bg-background text-sm"
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              Cancellation policy (plain language)
              <textarea
                rows={3}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                placeholder="e.g. Free cancellation up to 24 hours before delivery. Custom cakes are non-refundable after production starts."
                className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-sm resize-none"
              />
            </label>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={updateBaker.isPending}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto disabled:opacity-50"
          >
            {updateBaker.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
