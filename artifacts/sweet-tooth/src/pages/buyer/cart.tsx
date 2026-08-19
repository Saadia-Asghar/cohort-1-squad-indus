import { GuestMenuShell } from "@/components/layout/guest-menu-shell";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { useGetBaker, getGetBakerQueryKey } from "@workspace/api-client-react";
import { Phone, Trash2, ArrowLeft } from "lucide-react";
import { formatLeadTime } from "@/lib/shop-settings";

type GuestCartItem = {
  bakerId: number;
  bakerName?: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPricePkr: number;
  sizeLabel: string;
  leadTimeDays?: number;
  leadTimeHours?: number | null;
};
type LastBaker = { bakerId: number; bakerName?: string };
type LastGuestOrder = { orderId: number; token: string; bakerId: number };
type DeliveryQuote = {
  available: boolean;
  zone: { name: string; feePkr: number; minimumOrderPkr?: number } | null;
  message: string;
};

const CART_KEY = "sweet_tooth_guest_cart";
const LAST_BAKER_KEY = "sweet_tooth_guest_baker";
const LAST_ORDER_KEY = "sweet_tooth_guest_order";

function rememberBaker(bakerId: number, bakerName?: string) {
  try {
    localStorage.setItem(LAST_BAKER_KEY, JSON.stringify({ bakerId, bakerName } satisfies LastBaker));
  } catch {
    /* ignore quota */
  }
}

function readLastBaker(): LastBaker | null {
  try {
    const raw = localStorage.getItem(LAST_BAKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastBaker;
    return Number.isInteger(parsed.bakerId) && parsed.bakerId > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function rememberGuestOrder(order: LastGuestOrder) {
  try {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore quota */
  }
}

function readLastGuestOrder(): LastGuestOrder | null {
  try {
    const raw = localStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastGuestOrder;
    if (!parsed.orderId || !parsed.token || !parsed.bakerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function guestStatusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Sent to bakery — waiting for confirmation";
    case "quoted":
      return "Quote ready — open your order link to accept";
    case "confirmed":
      return "Baker confirmed — they are preparing";
    case "preparing":
    case "in_kitchen":
      return "Baking now";
    case "out_for_delivery":
    case "dispatched":
      return "On the way";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

function readCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: GuestCartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addGuestCartItem(item: GuestCartItem) {
  rememberBaker(item.bakerId, item.bakerName);
  const cart = readCart().filter((row) => row.bakerId === item.bakerId);
  const existing = cart.find(
    (row) => row.productId === item.productId && row.sizeLabel === item.sizeLabel,
  );
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  writeCart(cart);
}

export default function Cart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerArea, setBuyerArea] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [guestToken, setGuestToken] = useState("");
  const [placedBakerId, setPlacedBakerId] = useState<number | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [lastBaker] = useState<LastBaker | null>(() => (typeof window === "undefined" ? null : readLastBaker()));
  const [liveOrder, setLiveOrder] = useState<{ status: string; totalPkr?: number } | null>(null);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPricePkr * item.quantity, 0),
    [items],
  );
  const bakerId = items[0]?.bakerId ?? placedBakerId ?? lastBaker?.bakerId ?? undefined;

  const { data: baker } = useGetBaker(bakerId ?? 0, {
    query: { enabled: !!bakerId, queryKey: getGetBakerQueryKey(bakerId ?? 0) },
  });
  const paymentSummary = (baker as { publicPaymentPolicy?: { summary: string; mode: string; paymentInstructions?: string } } | undefined)?.publicPaymentPolicy;
  const whatsappChatUrl = (baker as { whatsappChatUrl?: string | null } | undefined)?.whatsappChatUrl;

  useEffect(() => {
    if (!bakerId || fulfillmentType !== "delivery" || buyerArea.trim().length < 2) {
      setDeliveryQuote(null);
      setDeliveryQuoteLoading(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setDeliveryQuoteLoading(true);
      void customFetch<DeliveryQuote>(`/api/bakers/${bakerId}/delivery-quote?area=${encodeURIComponent(buyerArea.trim())}`, { responseType: "json" })
        .then((quote) => { if (active) setDeliveryQuote(quote); })
        .catch(() => { if (active) setDeliveryQuote(null); })
        .finally(() => { if (active) setDeliveryQuoteLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [bakerId, buyerArea, fulfillmentType]);

  const deliveryFeePkr = fulfillmentType === "delivery" && deliveryQuote?.available ? deliveryQuote.zone?.feePkr ?? 0 : 0;
  const payableTotalPkr = total + deliveryFeePkr;
  const maxLeadDays = items.reduce((max, item) => Math.max(max, item.leadTimeDays ?? 0), 0);
  const readyLabel = formatLeadTime(maxLeadDays || undefined);

  useEffect(() => {
    const saved = readLastGuestOrder();
    if (!saved) return;
    let active = true;
    const load = () => {
      void customFetch<{ status: string; totalPkr?: number }>(`/api/orders/${saved.orderId}/guest`, {
        responseType: "json",
        headers: { "X-Guest-Token": saved.token },
      })
        .then((order) => {
          if (!active) return;
          setLiveOrder({ status: order.status, totalPkr: order.totalPkr });
          setOrderId((current) => current ?? saved.orderId);
          setGuestToken((current) => current || saved.token);
          setPlacedBakerId((current) => current ?? saved.bakerId);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 8_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const updateQuantity = (productId: number, sizeLabel: string, quantity: number) => {
    const next = readCart()
      .map((item) =>
        item.productId === productId && item.sizeLabel === sizeLabel
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      );
    writeCart(next);
    setItems(next);
  };

  const removeItem = (productId: number, sizeLabel: string) => {
    const next = readCart().filter(
      (item) => !(item.productId === productId && item.sizeLabel === sizeLabel),
    );
    writeCart(next);
    setItems(next);
  };

  const uploadGuestReceipt = async (file: File | null) => {
    if (!file || !orderId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setReceiptError("Use a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setReceiptError("Receipt must be under 4 MB.");
      return;
    }
    setReceiptUploading(true);
    setReceiptError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      await customFetch(`/api/orders/${orderId}/guest-receipt`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: guestToken,
          imageBase64: base64,
          contentType: file.type,
        }),
      });
      setReceiptUploaded(true);
    } catch (cause) {
      setReceiptError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setReceiptUploading(false);
    }
  };

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bakerId || items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const order = await customFetch<{ id: number; guestToken: string }>("/api/orders", {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({
          bakerId,
          buyerName,
          buyerWhatsapp,
          buyerAddress: fulfillmentType === "pickup" ? "Pickup from bakery" : buyerAddress,
          buyerArea: buyerArea || undefined,
          fulfillmentType,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            sizeLabel: item.sizeLabel,
          })),
          source: "web_guest",
          ...(maxLeadDays > 0
            ? { deliveryDate: new Date(Date.now() + maxLeadDays * 86_400_000).toISOString().slice(0, 10) }
            : {}),
        }),
      });
      rememberBaker(bakerId, items[0]?.bakerName ?? baker?.businessName);
      rememberGuestOrder({ orderId: order.id, token: order.guestToken, bakerId });
      setLiveOrder({ status: "new", totalPkr: payableTotalPkr });
      setPlacedBakerId(bakerId);
      writeCart([]);
      setItems([]);
      setOrderId(order.id);
      setGuestToken(order.guestToken);
      setReceiptUploaded(false);
      setReceiptError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestMenuShell bakerName={items[0]?.bakerName ?? baker?.businessName ?? lastBaker?.bakerName} bakerId={bakerId ?? null}>
      <div className="container mx-auto max-w-xl px-4 py-12">
        {bakerId ? (
          <Link href={`/menu/${bakerId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to menu
          </Link>
        ) : null}
        <h1 className="font-serif text-4xl font-bold text-primary">Your bag</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Confirm the bag to send the bill to the bakery dashboard. They will confirm time and delivery.
        </p>

        {items.length === 0 && orderId ? (
          <div className={`mt-8 rounded-xl border p-6 space-y-4 ${liveOrder?.status === "delivered" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            <div>
              <p className="font-serif text-2xl font-bold">
                {liveOrder?.status === "delivered" ? `Order #${orderId} delivered` : `Order #${orderId} sent`}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {guestStatusLabel(liveOrder?.status ?? "new")}
              </p>
              <p className="mt-2 text-sm">
                The bakery dashboard has this bill. {readyLabel ? `${readyLabel} from the menu lead time — the baker will confirm the exact slot.` : "The baker will confirm when it will be ready."}
              </p>
            </div>
            {paymentSummary && (
              <p className="text-sm rounded-lg bg-white/70 border border-emerald-200 px-3 py-2">
                <strong>Payment:</strong> {paymentSummary.summary}
              </p>
            )}
            <div className="rounded-lg border border-emerald-200 bg-white/80 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Upload payment receipt</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={receiptUploading || receiptUploaded}
                onChange={(e) => void uploadGuestReceipt(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              {receiptUploading && <p className="text-xs">Uploading…</p>}
              {receiptUploaded && (
                <p className="text-xs font-medium text-emerald-800">Receipt sent — bakery will confirm payment.</p>
              )}
              {receiptError && <p className="text-xs text-destructive">{receiptError}</p>}
            </div>
            {whatsappChatUrl && (
              <a
                href={`${whatsappChatUrl.split("?")[0]}?text=${encodeURIComponent(`Assalam-o-Alaikum! I placed order #${orderId} on Sweet Tooth. Please confirm and share payment/delivery details.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"
              >
                <Phone className="h-4 w-4" />
                Continue on WhatsApp
              </a>
            )}
            <Link href={`/orders/${orderId}#token=${encodeURIComponent(guestToken)}`} className="inline-flex text-sm font-semibold underline">
              Check order status
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-muted-foreground">This page is no longer used. Open the bakery menu and chat with the assistant to place an order.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the menu, add cakes, then come back here to send the order to the bakery.
            </p>
            <Link href={bakerId ? `/menu/${bakerId}` : "/"} className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
              <ArrowLeft className="h-4 w-4" />
              {bakerId ? "Back to menu" : "Find a bakery menu"}
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={`${item.productId}-${item.sizeLabel}`} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sizeLabel}
                        {formatLeadTime(item.leadTimeDays, item.leadTimeHours) ? ` · ${formatLeadTime(item.leadTimeDays, item.leadTimeHours)}` : ""}
                      </p>
                    </div>
                    <p className="font-mono font-bold">
                      PKR {(item.unitPricePkr * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, item.sizeLabel, Number(e.target.value) || 1)}
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.sizeLabel)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-1 text-right font-mono text-sm">
              <p>Products PKR {total.toLocaleString()}</p>
              {fulfillmentType === "delivery" && deliveryQuote?.available && <p>Delivery PKR {deliveryFeePkr.toLocaleString()}</p>}
              <p className="text-lg font-bold">Total PKR {payableTotalPkr.toLocaleString()}</p>
              {readyLabel ? <p className="font-sans text-xs text-muted-foreground">{readyLabel} — baker will confirm the slot</p> : null}
            </div>

            {paymentSummary && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <p className="font-semibold">Payment policy</p>
                <p className="mt-1 text-muted-foreground">{paymentSummary.summary}</p>
                {paymentSummary.paymentInstructions && paymentSummary.mode !== "cod" && (
                  <p className="mt-2 text-xs whitespace-pre-wrap rounded-md bg-background border border-border px-3 py-2">{paymentSummary.paymentInstructions}</p>
                )}
              </div>
            )}

            <form onSubmit={placeOrder} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setFulfillmentType("delivery")} className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${fulfillmentType === "delivery" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Home delivery</button>
                <button type="button" onClick={() => setFulfillmentType("pickup")} className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${fulfillmentType === "pickup" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>Pickup</button>
              </div>
              <input required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Your name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input required value={buyerWhatsapp} onChange={(e) => setBuyerWhatsapp(e.target.value)} placeholder="WhatsApp +92 300 1234567" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              {fulfillmentType === "delivery" ? (
                <>
                  <input required value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Delivery address" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  <input required value={buyerArea} onChange={(e) => setBuyerArea(e.target.value)} placeholder="Area / sector" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  {deliveryQuoteLoading && <p className="text-xs text-muted-foreground">Checking delivery availability…</p>}
                  {deliveryQuote && <p className={`rounded-md px-3 py-2 text-xs ${deliveryQuote.available ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{deliveryQuote.message}</p>}
                </>
              ) : (
                <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">You will collect from the baker&apos;s kitchen. They will confirm pickup time on WhatsApp.</p>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={loading || fulfillmentType === "delivery" && Boolean(buyerArea.trim()) && deliveryQuote?.available === false} className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {loading ? "Sending to bakery…" : "Confirm bag & send bill"}
              </button>
            </form>
          </div>
        )}
      </div>
    </GuestMenuShell>
  );
}
