import { BuyerLayout } from "@/components/layout/buyer-layout";
import { Link } from "wouter";
import { useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { format } from "date-fns";

type LookupOrder = {
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
};

export default function BuyerOrders() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<LookupOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setOrders(null);
    try {
      const result = await customFetch<LookupOrder[]>(
        `/api/orders/lookup?phone=${encodeURIComponent(phone.trim())}`,
        { responseType: "json" },
      );
      setOrders(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const respondToQuote = async (orderId: number, decision: "accept" | "reject") => {
    setRespondingTo(orderId);
    setError(null);
    try {
      await customFetch(`/api/orders/${orderId}/quote-response`, {
        method: "PATCH",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerWhatsapp: phone.trim(), decision }),
      });
      setOrders((current) => current?.map((order) => order.id === orderId
        ? { ...order, status: decision === "accept" ? "confirmed" : "quote_rejected" }
        : order) ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the quote.");
    } finally {
      setRespondingTo(null);
    }
  };

  return (
    <BuyerLayout>
      <div className="container mx-auto max-w-xl px-4 py-12">
        <h1 className="font-serif text-4xl font-bold text-primary">Order status</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No account or sign-up is needed. Enter the WhatsApp number used when placing your order.
        </p>

        <form onSubmit={lookup} className="mt-8 flex flex-col sm:flex-row gap-2">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Look up"}
          </button>
        </form>

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        {orders && orders.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">No recent orders found for that number.</p>
        )}

        {orders && orders.length > 0 && (
          <ul className="mt-8 space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-muted-foreground">#{order.id}</p>
                  <p className="text-xs capitalize rounded-full bg-muted px-2 py-0.5">{order.status.replace(/_/g, " ")}</p>
                </div>
                <p className="mt-2 font-semibold">PKR {order.totalPkr.toLocaleString()}</p>
                {order.status === "quoted" && (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">Your custom quote is ready</p>
                    {Boolean(order.depositRequiredPkr) && <p className="mt-1 text-xs text-muted-foreground">Deposit required after acceptance: PKR {order.depositRequiredPkr!.toLocaleString()}</p>}
                    {order.quoteExpiresAt && <p className="mt-1 text-xs text-muted-foreground">Valid until {format(new Date(order.quoteExpiresAt), "MMM d, h:mm a")}</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={respondingTo === order.id} onClick={() => void respondToQuote(order.id, "accept")} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">Accept quote</button>
                      <button type="button" disabled={respondingTo === order.id} onClick={() => void respondToQuote(order.id, "reject")} className="rounded-md border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Decline</button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Payment: {order.paymentStatus}
                  {order.deliveryDate ? ` · Delivery ${format(new Date(order.deliveryDate), "MMM d")}` : ""}
                  {` · Placed ${format(new Date(order.createdAt), "MMM d")}`}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {(order.items ?? []).map((item) => item.productName).filter(Boolean).join(", ") || "Items on file"}
                </p>
                <Link href={`/bakers/${order.bakerId}`} className="mt-3 inline-flex text-xs font-semibold text-primary underline">
                  Open bakery menu
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BuyerLayout>
  );
}
