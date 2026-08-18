import { GuestMenuShell } from "@/components/layout/guest-menu-shell";
import { Link, useRoute } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { format } from "date-fns";
import { CheckCircle2, LockKeyhole } from "lucide-react";

type GuestOrder = {
  id: number;
  bakerId: number;
  status: string;
  paymentStatus: string;
  totalPkr: number;
  deliveryDate: string | null;
  createdAt: string;
  items: Array<{ productName?: string; quantity?: number }>;
  depositRequiredPkr?: number | null;
  quoteExpiresAt?: string | null;
  requireAdvance?: boolean;
  advancePaid?: boolean;
};

export default function BuyerOrders() {
  const [, params] = useRoute("/orders/:orderId");
  const orderId = Number.parseInt(params?.orderId ?? "", 10);
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "", []);
  const action = query.get("action") ?? "";
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(token && Number.isInteger(orderId)));
  const [responding, setResponding] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  useEffect(() => {
    if (!token || !Number.isInteger(orderId)) return;
    customFetch<GuestOrder>(`/api/orders/${orderId}/guest`, { responseType: "json", headers: { "X-Guest-Token": token } })
      .then(setOrder)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "This secure order link is invalid or expired."))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  const respondToQuote = async (decision: "accept" | "reject") => {
    if (!order) return;
    setResponding(true);
    setError(null);
    try {
      const result = await customFetch<{ status: string }>(`/api/orders/${order.id}/quote-response`, {
        method: "PATCH",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision }),
      });
      setOrder((current) => current ? { ...current, status: result.status } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the quote.");
    } finally {
      setResponding(false);
    }
  };

  const uploadReceipt = async (file: File | null) => {
    if (!file || !order) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setError("Use a JPEG, PNG or WebP receipt under 4 MB.");
      return;
    }
    setReceiptUploading(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read the receipt."));
        reader.readAsDataURL(file);
      });
      await customFetch(`/api/orders/${order.id}/guest-receipt`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, imageBase64: dataUrl.replace(/^data:image\/\w+;base64,/, ""), contentType: file.type }),
      });
      setReceiptUploaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload the receipt.");
    } finally {
      setReceiptUploading(false);
    }
  };

  return (
    <GuestMenuShell bakerName="Your order" bakerId={order?.bakerId ?? null}>
      <div className="container mx-auto max-w-xl px-4 py-12">
        <div className="flex items-center gap-3"><LockKeyhole className="h-8 w-8 text-primary" /><div><h1 className="font-serif text-4xl font-bold text-primary">Secure order</h1><p className="mt-1 text-sm text-muted-foreground">No account or password is needed.</p></div></div>

        {!token || !Number.isInteger(orderId) ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">Open the private link sent by your bakery</h2><p className="mt-2 text-sm text-muted-foreground">For privacy, orders can no longer be searched using only a phone number. Ask the bakery to resend your secure order link on WhatsApp or Instagram.</p></div>
        ) : loading ? <p className="mt-8 text-muted-foreground">Opening your order…</p> : error && !order ? <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">{error}</p> : order ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><p className="font-mono text-sm text-muted-foreground">Order #{order.id}</p><span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{order.status.replaceAll("_", " ")}</span></div>
            <p className="mt-4 text-2xl font-bold">PKR {order.totalPkr.toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted-foreground">{order.items.map((item) => item.productName).filter(Boolean).join(", ") || "Order details saved with bakery"}</p>
            {order.deliveryDate && <p className="mt-1 text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), "PPP")}</p>}

            {order.status === "quoted" && (
              <section className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <h2 className="font-semibold">Your quote is ready</h2>
                {Boolean(order.depositRequiredPkr) && <p className="mt-1 text-sm text-muted-foreground">Deposit after acceptance: PKR {order.depositRequiredPkr!.toLocaleString()}</p>}
                {order.quoteExpiresAt && <p className="mt-1 text-xs text-muted-foreground">Valid until {format(new Date(order.quoteExpiresAt), "MMM d, h:mm a")}</p>}
                <div className="mt-4 flex gap-2"><button disabled={responding} onClick={() => void respondToQuote("accept")} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Accept quote</button><button disabled={responding} onClick={() => void respondToQuote("reject")} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">Decline</button></div>
              </section>
            )}

            {order.status === "confirmed" && order.paymentStatus !== "paid" && (
              <section className={`mt-5 rounded-xl border p-4 ${action === "receipt" ? "border-primary bg-primary/5" : "border-border"}`}>
                <h2 className="font-semibold">Upload payment proof</h2><p className="mt-1 text-sm text-muted-foreground">The bakery still verifies every receipt before production.</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={receiptUploading || receiptUploaded} onChange={(event) => void uploadReceipt(event.target.files?.[0] ?? null)} className="mt-3 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground" />
                {receiptUploaded && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> Receipt sent for baker verification.</p>}
              </section>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            <Link href={`/menu/${order.bakerId}`} className="mt-5 inline-flex text-sm font-semibold text-primary underline">Return to bakery menu</Link>
          </div>
        ) : null}
      </div>
    </GuestMenuShell>
  );
}
