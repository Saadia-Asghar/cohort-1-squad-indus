import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PlanBadge } from "@/components/marketing/pricing-section";
import { useBuyerSession } from "@/hooks/use-session";
import { useGetBaker, useUpdateBaker, getGetBakerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Copy, ExternalLink, Facebook, Instagram, QrCode, Share2, Sparkles, ArrowRight, Store, CreditCard, Calendar, Users, Zap } from "lucide-react";
import { getPlanById, FOUNDER_OFFER_ACTIVE, formatExtraReplyPkr, getFounderOfferLines, displayPrice } from "@/lib/pricing-plans";
import { PlatformBillingPanel } from "@/components/dashboard/platform-billing-panel";
import { TeamAccessPanel } from "@/components/dashboard/team-access-panel";
import {
  OCCASION_PRESET_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  type OccasionPreset,
  type PaymentMode,
} from "@/lib/shop-settings";
import { MAX_ORDERS_PER_DAY } from "@/lib/catalog-product";
import { digitsOnlyPhone, normalizePakistanPhone } from "@/lib/pakistan-phone";
import { isPublicImageUrl, uploadBakerImage } from "@/lib/image-upload";
import { SafeImage } from "@/components/ui/safe-image";

export default function DashboardSettings() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: baker, isLoading } = useGetBaker(bakerId);
  const updateBaker = useUpdateBaker();

  const [activeTab, setActiveTab] = useState<"profile" | "payments" | "occasions" | "team" | "billing">("profile");
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
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState("10");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
      await navigator.share({
        title: baker?.businessName ?? "Bakery menu",
        text: "Open this link in your browser to see the menu and place an order.",
        url: shopUrl,
      });
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
      setMaxOrdersPerDay(String(baker.maxOrdersPerDay ?? 10));
      setPhotoUrl(baker.photoUrl ?? "");
      setCodPolicy(baker.codPolicy ?? "");
      setAdvanceThresholdPkr(baker.advanceThresholdPkr ?? 2000);
      setAdvancePercentage(baker.advancePercentage ?? 50);
      setPaymentDetails(baker.paymentDetails ?? "");
      setDeliveryAreasText((baker.deliveryAreas ?? []).join(", "));
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
    setFormError(null);
    const phone = normalizePakistanPhone(whatsappNumber);
    if (!phone) {
      setFormError("Enter a valid Pakistani WhatsApp number, for example +92 300 1234567.");
      return;
    }
    const maxOrders = Number.parseInt(maxOrdersPerDay, 10);
    if (!Number.isInteger(maxOrders) || maxOrders < 1 || maxOrders > MAX_ORDERS_PER_DAY) {
      setFormError(`Maximum orders per day must be a whole number from 1 to ${MAX_ORDERS_PER_DAY}.`);
      return;
    }
    if (photoUrl.trim() && !isPublicImageUrl(photoUrl) && !photoUrl.startsWith("data:image/")) {
      setFormError("Bakery photo must be a public image URL or an uploaded image.");
      return;
    }
    const socialLinks = {
      ...(instagramUrl.trim() ? { instagram: instagramUrl.trim() } : {}),
      ...(facebookUrl.trim() ? { facebook: facebookUrl.trim() } : {}),
    };

    updateBaker.mutate({
      bakerId,
      data: {
        businessName,
        tagline,
        whatsappNumber: phone,
        photoUrl: photoUrl.trim() || null,
        codPolicy,
        paymentMode,
        advanceThresholdPkr: paymentMode === "partial_advance" ? advanceThresholdPkr : paymentMode === "full_advance" ? 0 : advanceThresholdPkr,
        advancePercentage: paymentMode === "full_advance" ? 100 : paymentMode === "partial_advance" ? advancePercentage : 0,
        paymentDetails,
        deliveryAreas: deliveryAreasText.split(",").map((area) => area.trim()).filter(Boolean),
        socialLinks,
        maxOrdersPerDay: maxOrders,
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
        setFormError(((err as Error).message || "Failed to save settings").replace(/^HTTP \d+\s*[^:]*:\s*/, ""));
      }
    });
  };

  if (isLoading && !baker) {
    return (
      <DashboardLayout>
        <div className="mx-auto min-h-screen max-w-[1480px] animate-pulse space-y-4 bg-background px-4 py-5 sm:px-6 lg:px-7">
          <div className="h-10 w-64 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: "profile", label: "Bakery Profile", icon: Store, desc: "Manage name, description, WhatsApp, and shop links" },
    { id: "payments", label: "Payments & Policies", icon: CreditCard, desc: "Configure COD, advance payments, and cancellation rules" },
    { id: "occasions", label: "Occasions & Capacity", icon: Calendar, desc: "Eid orders, maximum daily orders, and vacation dates" },
    { id: "team", label: "Staff & Team", icon: Users, desc: "Manage logins for your kitchen assistants and helpers" },
    { id: "billing", label: "Subscription & Billing", icon: Zap, desc: "View plan limits, invoices, and upgrade packages" },
  ] as const;

  return (
    <DashboardLayout>
      <div className="mx-auto min-h-screen max-w-[1480px] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-7">
        {/* Header with quick save */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
          <div>
            <h1 className="text-4xl font-bold font-serif text-primary">Your kitchen, your rules.</h1>
            <p className="text-muted-foreground mt-1">Manage your profile, delivery areas, and policies.</p>
          </div>
          <div className="flex items-center gap-3">
            {formError ? (
              <p role="alert" className="max-w-sm text-xs font-semibold text-[#a7313b]">{formError}</p>
            ) : null}
            <button
              onClick={handleSave}
              disabled={updateBaker.isPending}
              className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-md transition hover:bg-[#542261] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {updateBaker.isPending ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </header>

        {/* Two-column layout grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          
          {/* COLUMN 1: Profile, Sharing & Occasions */}
          <div className="space-y-6">
            
            {/* Kitchen Details */}
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Kitchen Details</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Name</label>
                  <input 
                    type="text" 
                    className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10" 
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp Number</label>
                  <input 
                    type="tel"
                    inputMode="tel"
                    className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10" 
                    value={whatsappNumber}
                    placeholder="+92 300 1234567"
                    onChange={e => setWhatsappNumber(digitsOnlyPhone(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagline</label>
                <input 
                  type="text" 
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10" 
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bakery photo</label>
                <p className="text-xs text-muted-foreground">This image appears on your public menu. Upload a photo or paste a public URL.</p>
                <div className="h-28 overflow-hidden rounded-xl border border-border bg-accent">
                  <SafeImage src={photoUrl} alt={businessName || "Bakery"} className="h-full w-full object-cover" fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">No bakery photo yet</div>} />
                </div>
                <input
                  type="url"
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                  placeholder="https://…"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
                <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-border bg-white px-3 text-xs font-semibold">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      setUploadingPhoto(true);
                      setFormError(null);
                      try {
                        setPhotoUrl(await uploadBakerImage(file));
                      } catch (cause) {
                        setFormError((cause instanceof Error ? cause.message : "Could not upload image.").replace(/^HTTP \d+\s*[^:]*:\s*/, ""));
                      } finally {
                        setUploadingPhoto(false);
                      }
                    }}
                  />
                  {uploadingPhoto ? "Uploading…" : "Upload bakery image"}
                </label>
              </div>
            </div>

            {/* Share Menu */}
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Share your menu</h3>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery sectors / areas</label>
                <input
                  type="text"
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                  placeholder="e.g. Gulberg, DHA Phase 5, Model Town"
                  value={deliveryAreasText}
                  onChange={e => setDeliveryAreasText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Separate sectors with commas. Your menu assistant uses these areas when answering delivery questions.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  <span className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram profile link</span>
                  <input type="url" className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground normal-case outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10" placeholder="https://instagram.com/yourbakery" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
                </label>
                <label className="space-y-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  <span className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Facebook page link</span>
                  <input type="url" className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground normal-case outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10" placeholder="https://facebook.com/yourbakery" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this link or QR. Customers open your bakery menu directly in the browser — they do not visit the Sweet Tooth website first.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 items-start pt-2">
                {qrCodeUrl && <img src={qrCodeUrl} alt={`QR code for ${baker?.businessName ?? "your shop"}`} className="w-32 h-32 rounded-lg border border-border bg-white p-2" />}
                <div className="space-y-3 flex-1 min-w-0">
                  <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full truncate rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary underline-offset-2 hover:underline"
                    aria-label="Open your menu in a new tab"
                  >
                    {shopUrl}
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                    >
                      <ExternalLink className="w-4 h-4" /> Open in browser
                    </a>
                    <button onClick={copyShopLink} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted cursor-pointer"><Copy className="w-4 h-4" /> Copy link</button>
                    <button onClick={shareShop} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted cursor-pointer"><Share2 className="w-4 h-4" /> Share</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Occasion Orders */}
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Occasion orders (Eid & special dates)</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose how your menu behaves during Eid or a custom rush. Shown as a banner on your shared menu link.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occasion mode</label>
                <select
                  value={occasionPreset}
                  onChange={(e) => setOccasionPreset(e.target.value as OccasionPreset)}
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                >
                  {OCCASION_PRESET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {occasionPreset === "custom" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom occasion name</label>
                  <input
                    type="text"
                    className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
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
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last date to accept orders</label>
                      <input
                        type="date"
                        className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                        value={occasionOrderDeadline}
                        onChange={(e) => setOccasionOrderDeadline(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Baked fresh (days before delivery)</label>
                      <input
                        type="number"
                        min={0}
                        max={14}
                        className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                        value={occasionFreshDays}
                        onChange={(e) => setOccasionFreshDays(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note for customers (optional)</label>
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

            {/* Capacity & Date Blocking */}
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">📅 Calendar Capacity & Date Blocking</h3>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maximum orders per day</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10" 
                  value={maxOrdersPerDay}
                  onChange={e => setMaxOrdersPerDay(e.target.value.replace(/\D/g, "").slice(0, 3))}
                />
                <p className="text-xs text-muted-foreground">Whole number from 1 to {MAX_ORDERS_PER_DAY}. The calendar will display alerts when this limit is reached for a specific day.</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Block custom dates (e.g. Vacations or Holidays)</label>
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
                    className="px-4 py-2 bg-secondary text-primary hover:bg-secondary/90 font-bold rounded-md transition-colors cursor-pointer text-xs"
                  >
                    Block Date
                  </button>
                </div>

                {blockedDates.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {blockedDates.map((date) => (
                      <span 
                        key={date} 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20"
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
          </div>

          {/* COLUMN 2: Payments, Policies, Staff & Billing */}
          <div className="space-y-6">
            
            {/* Payment Options */}
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Payment options for customers</h3>
              </div>
              <p className="text-xs text-muted-foreground">Select how buyers pay. This appears on your menu and at checkout.</p>
              <div className="space-y-3">
                {PAYMENT_MODE_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`flex gap-3 rounded-lg border p-4 cursor-pointer transition ${paymentMode === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/10"}`}>
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minimum order (PKR) for advance</label>
                    <input
                      type="number"
                      className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                      value={advanceThresholdPkr}
                      onChange={(e) => setAdvanceThresholdPkr(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advance percentage (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                      value={advancePercentage}
                      onChange={(e) => setAdvancePercentage(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {paymentMode !== "cod" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment account details</label>
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cash on delivery policy (shown on menu)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
                    value={codPolicy}
                    onChange={(e) => setCodPolicy(e.target.value)}
                    placeholder="e.g. Full payment in cash when your order is delivered."
                  />
                </div>
              )}
            </div>

            {/* Kitchen Policies */}
            <div className="space-y-4 rounded-2xl border border-border bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Kitchen policies (agent uses these)</h3>
              </div>
              <p className="text-xs text-muted-foreground">Delivery, pickup, and cancellation rules are shared with buyers via your AI assistant.</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={allowDelivery} onChange={(e) => setAllowDelivery(e.target.checked)} className="rounded text-primary" />
                  Offer home delivery
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={allowPickup} onChange={(e) => setAllowPickup(e.target.checked)} className="rounded text-primary" />
                  Offer pickup from my kitchen
                </label>
              </div>

              {allowPickup && (
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pickup address (shown to buyers)
                  <input
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g. House 12, Street 5, Gulberg III, Lahore"
                    className="mt-1.5 w-full min-h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground normal-case outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                  />
                </label>
              )}

              <div className="pt-2 border-t border-border/50">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={cancellationAllowed} onChange={(e) => setCancellationAllowed(e.target.checked)} className="rounded text-primary" />
                  Allow order cancellations
                </label>
              </div>

              {cancellationAllowed && (
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider max-w-xs">
                  Cancel at least how many hours before delivery?
                  <input
                    type="number"
                    min={0}
                    value={cancellationHoursBefore}
                    onChange={(e) => setCancellationHoursBefore(e.target.value)}
                    className="mt-1.5 w-full min-h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground normal-case outline-none transition focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10"
                  />
                </label>
              )}

              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cancellation policy (plain language)
                <textarea
                  rows={3}
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  placeholder="e.g. Free cancellation up to 24 hours before delivery. Custom cakes are non-refundable after production starts."
                  className="mt-1.5 w-full px-3 py-2 border border-border rounded-md bg-background text-sm normal-case resize-none"
                />
              </label>
            </div>

            {/* Staff & Team */}
            {bakerId > 0 && (
              <div className="rounded-2xl border border-border bg-white/70 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Staff & Team Access</h3>
                </div>
                <TeamAccessPanel bakerId={bakerId} />
              </div>
            )}

            {/* Subscription & Billing */}
            {baker && (
              <div className="rounded-2xl border border-border bg-white/70 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">Subscription & Billing</h3>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your package</p>
                  <div className="mt-2 flex items-center gap-2">
                    <PlanBadge planId={baker.subscriptionPlan} />
                    <span className="text-sm text-foreground font-semibold">
                      {getPlanById(baker.subscriptionPlan)?.tagline}
                    </span>
                  </div>
                  {(baker as { trial?: { isFree?: boolean; expired?: boolean; daysLeft?: number | null } }).trial?.isFree && (
                    <p className={`mt-2 text-sm ${(baker as { trial?: { expired?: boolean } }).trial?.expired ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {(baker as { trial?: { expired?: boolean; daysLeft?: number | null } }).trial?.expired
                        ? "3-day trial ended — upgrade to restore the agent and broadcasts."
                        : `Trial: ${(baker as { trial?: { daysLeft?: number | null } }).trial?.daysLeft ?? 0} day(s) left.`}
                    </p>
                  )}
                  {(() => {
                    const plan = getPlanById(baker.subscriptionPlan) ?? getPlanById("free")!;
                    const price = displayPrice(plan, FOUNDER_OFFER_ACTIVE ? "quarterly" : "monthly");
                    return (
                      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                        {plan.monthlyPkr > 0 && (
                          <p className="text-sm font-semibold text-foreground">
                            {price.primary} <span className="font-normal text-muted-foreground">{price.suffix}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {plan.commissionPercent > 0
                            ? `${plan.commissionPercent}% commission on checkout orders (max ${plan.commissionCapPkr.toLocaleString()} PKR/mo) · `
                            : "0% commission · "}
                          Replies: {plan.limits.aiReplies} replies/mo included · {plan.limits.whatsappChats}
                        </p>
                      </div>
                    );
                  })()}
                </div>
                
                {bakerId > 0 && (
                  <div className="pt-2">
                    <PlatformBillingPanel bakerId={bakerId} currentPlanId={baker?.subscriptionPlan} />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Big save changes button at bottom */}
        <div className="mt-6 border-t border-border/60 pt-6">
          <button
            onClick={handleSave}
            disabled={updateBaker.isPending}
            className="w-full min-h-12 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-md transition hover:bg-[#542261] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {updateBaker.isPending ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
