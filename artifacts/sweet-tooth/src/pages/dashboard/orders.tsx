import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { customFetch, useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, MessageCircle } from "lucide-react";

const emptyManualOrder = {
  buyerName: "", buyerWhatsapp: "", buyerAddress: "", buyerArea: "",
  productName: "", quantity: "1", totalPkr: "", deliveryDate: "", deliveryTimeSlot: "", occasion: "", specialInstructions: "",
};

function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;

  // Pakistani local mobile numbers are commonly stored as 03XXXXXXXXX.
  const international = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

export default function DashboardOrders() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListOrders(
    { bakerId },
    { query: { enabled: !!bakerId, queryKey: getListOrdersQueryKey({ bakerId }), ...liveDashboardQuery(ORDERS_POLL_MS) } },
  );
  const updateStatus = useUpdateOrderStatus();
  const [manualOrder, setManualOrder] = useState(emptyManualOrder);
  const [manualError, setManualError] = useState<string | null>(null);
  const [savingManualOrder, setSavingManualOrder] = useState(false);
  const [approvingQuoteId, setApprovingQuoteId] = useState<number | null>(null);
  const [checklistOrder, setChecklistOrder] = useState<any>(null);

  const handleStatusUpdate = (orderId: number, status: string) => {
    const cancellationReason = status === "cancelled"
      ? window.prompt("Why was this order cancelled? This appears in analytics.")?.trim()
      : undefined;
    if (status === "cancelled" && cancellationReason === undefined) return;
    updateStatus.mutate(
      { orderId, data: { status, ...(status === "cancelled" ? { cancellationReason, cancelledBy: "baker" } : {}) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
        }
      }
    );
  };

  const openManualOrder = () => {
    setManualOrder(emptyManualOrder);
    setManualError(null);
    (document.getElementById("manual-order-dialog") as HTMLDialogElement | null)?.showModal();
  };
  const closeManualOrder = () => (document.getElementById("manual-order-dialog") as HTMLDialogElement | null)?.close();
  const updateManualField = (key: keyof typeof emptyManualOrder, value: string) =>
    setManualOrder((current) => ({ ...current, [key]: value }));
  const submitManualOrder = async (event: FormEvent) => {
    event.preventDefault();
    setManualError(null);
    const quantity = Number(manualOrder.quantity);
    const totalPkr = Number(manualOrder.totalPkr);
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(totalPkr) || totalPkr < 0) {
      setManualError("Enter a whole-number quantity and amount in PKR.");
      return;
    }
    setSavingManualOrder(true);
    try {
      await customFetch("/api/orders/manual", {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...manualOrder,
          quantity,
          totalPkr,
          buyerArea: manualOrder.buyerArea || undefined,
          deliveryDate: manualOrder.deliveryDate || undefined,
          occasion: manualOrder.occasion || undefined,
          specialInstructions: manualOrder.specialInstructions || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
      closeManualOrder();
    } catch (cause) {
      setManualError(cause instanceof Error ? cause.message : "Could not save the order.");
    } finally {
      setSavingManualOrder(false);
    }
  };

  const approveCustomQuote = async (orderId: number) => {
    const enteredAmount = window.prompt("Enter the quote total in PKR. The customer must accept it before the order is confirmed.");
    if (enteredAmount === null) return;
    const totalPkr = Number(enteredAmount);
    if (!Number.isInteger(totalPkr) || totalPkr < 100) {
      window.alert("Enter a whole-number quote of at least PKR 100.");
      return;
    }
    setApprovingQuoteId(orderId);
    try {
      await customFetch(`/api/orders/${orderId}/quote`, {
        method: "PATCH", responseType: "json", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPkr }),
      });
      await queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "Could not approve this quote.");
    } finally {
      setApprovingQuoteId(null);
    }
  };

  const saveDispatch = async (order: { id: number; deliveryTimeSlot?: string | null; riderName?: string | null; riderPhone?: string | null }) => {
    const deliveryTimeSlot = window.prompt("Delivery / pickup time window (e.g. 3–5 pm)", order.deliveryTimeSlot ?? "");
    if (deliveryTimeSlot === null) return;
    const riderName = window.prompt("Rider name (leave blank if not assigned)", order.riderName ?? "");
    if (riderName === null) return;
    const riderPhone = window.prompt("Rider phone (leave blank if not assigned)", order.riderPhone ?? "");
    if (riderPhone === null) return;
    try {
      await customFetch(`/api/orders/${order.id}/dispatch`, {
        method: "PATCH", responseType: "json", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryTimeSlot, riderName, riderPhone }),
      });
      await queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "Could not save dispatch details.");
    }
  };

  const recordRefund = async (orderId: number) => {
    const amount = window.prompt("Refund amount in PKR (enter 0 if no money was returned)");
    if (amount === null) return;
    const amountPkr = Number(amount);
    if (!Number.isInteger(amountPkr) || amountPkr < 0) {
      window.alert("Enter a whole refund amount in PKR.");
      return;
    }
    const reason = window.prompt("Refund reason for the financial record");
    if (!reason?.trim()) return;
    try {
      await customFetch(`/api/orders/${orderId}/refund`, {
        method: "PATCH", responseType: "json", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPkr, reason: reason.trim() }),
      });
      await queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ bakerId }) });
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "Could not record the refund.");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-4xl font-bold font-serif text-primary">Order Pipeline</h1><p className="mt-2 text-sm text-muted-foreground">Record phone, walk-in, and social orders until channel automation is connected.</p></div>
          <button onClick={openManualOrder} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Add manual order</button>
        </div>
        
        {isLoading && !orders ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded-md w-full"></div>
            <div className="h-12 bg-muted rounded-md w-full"></div>
            <div className="h-12 bg-muted rounded-md w-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map((order) => {
                  const operations = order as typeof order & { deliveryTimeSlot?: string | null; riderName?: string | null; riderPhone?: string | null; refundStatus?: string | null; refundAmountPkr?: number | null; refundReason?: string | null };
                  return (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-4 font-mono font-medium">#{order.id}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{order.buyerName}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{order.buyerWhatsapp}</span>
                        {whatsappHref(order.buyerWhatsapp) && (
                          <a
                            href={whatsappHref(order.buyerWhatsapp)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open WhatsApp chat with ${order.buyerName}`}
                            title={`Message ${order.buyerName} on WhatsApp`}
                            className="inline-flex min-h-6 min-w-6 items-center justify-center rounded text-green-700 hover:bg-green-50 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                      {order.source === "custom_quote" && <div className="mt-1 text-xs font-semibold text-primary">Custom-cake request</div>}
                    </td>
                    <td className="px-4 py-4">
                      {order.deliveryDate ? format(new Date(order.deliveryDate), "PPP") : "N/A"}
                      {(operations.deliveryTimeSlot || operations.riderName) && <p className="mt-1 text-xs text-muted-foreground">{operations.deliveryTimeSlot || "Time TBC"}{operations.riderName ? ` · Rider: ${operations.riderName}` : ""}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'quoted' ? 'bg-cyan-100 text-cyan-800' :
                        order.status === 'quote_rejected' ? 'bg-gray-100 text-gray-700' :
                        order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'in_production' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'out_for_delivery' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono">PKR {order.totalPkr.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                      {order.source === "custom_quote" && order.totalPkr === 0 && (
                        <button type="button" onClick={() => approveCustomQuote(order.id)} disabled={approvingQuoteId === order.id} className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                          {approvingQuoteId === order.id ? "Saving…" : "Set quote"}
                        </button>
                      )}
                      <button type="button" onClick={() => setChecklistOrder(order)} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                        Prep checklist
                      </button>
                      <button type="button" onClick={() => void saveDispatch(operations)} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                        Dispatch
                      </button>
                      {order.status === "cancelled" && operations.refundStatus !== "refunded" && (
                        <button type="button" onClick={() => void recordRefund(order.id)} className="rounded-md border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50">
                          Record refund
                        </button>
                      )}
                      {operations.refundStatus === "refunded" && <span className="text-xs font-semibold text-green-700">Refund PKR {operations.refundAmountPkr?.toLocaleString() ?? 0}</span>}
                      {order.status === "quoted" ? <span className="text-xs font-semibold text-cyan-800">Waiting for customer</span> : order.status === "quote_rejected" ? <span className="text-xs text-muted-foreground">Quote closed</span> : <select
                        className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        disabled={updateStatus.isPending}
                      >
                        <option value="new">New</option>
                        <option value="quoted">Quoted</option>
                        <option value="quote_rejected">Quote Rejected</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_production">In Production</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {(!orders || orders.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <dialog id="manual-order-dialog" className="w-[min(92vw,44rem)] rounded-2xl border border-border bg-card p-0 shadow-2xl backdrop:bg-black/45">
          <form onSubmit={submitManualOrder} className="p-6">
            <div className="flex items-start justify-between gap-5"><div><h2 className="font-serif text-2xl font-bold text-primary">Add manual order</h2><p className="mt-1 text-sm text-muted-foreground">Payment stays pending until you confirm it.</p></div><button type="button" onClick={closeManualOrder} className="rounded-md px-3 py-1 text-sm hover:bg-muted">Close</button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">Customer name<input required value={manualOrder.buyerName} onChange={(event) => updateManualField("buyerName", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">WhatsApp / phone<input required type="tel" value={manualOrder.buyerWhatsapp} onChange={(event) => updateManualField("buyerWhatsapp", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Delivery address<input required value={manualOrder.buyerAddress} onChange={(event) => updateManualField("buyerAddress", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">Area / sector<input value={manualOrder.buyerArea} onChange={(event) => updateManualField("buyerArea", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">Delivery date<input type="date" value={manualOrder.deliveryDate} onChange={(event) => updateManualField("deliveryDate", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">Time window<input placeholder="e.g. 3–5 pm" value={manualOrder.deliveryTimeSlot} onChange={(event) => updateManualField("deliveryTimeSlot", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Product / order summary<input required value={manualOrder.productName} onChange={(event) => updateManualField("productName", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">Quantity<input required min="1" step="1" inputMode="numeric" value={manualOrder.quantity} onChange={(event) => updateManualField("quantity", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">Total (PKR)<input required min="0" step="1" inputMode="numeric" value={manualOrder.totalPkr} onChange={(event) => updateManualField("totalPkr", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium">Occasion<input value={manualOrder.occasion} onChange={(event) => updateManualField("occasion", event.target.value)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Special instructions<textarea value={manualOrder.specialInstructions} onChange={(event) => updateManualField("specialInstructions", event.target.value)} rows={3} className="rounded-md border border-border bg-background px-3 py-2" /></label>
            </div>
            {manualError && <p role="alert" className="mt-4 text-sm text-destructive">{manualError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeManualOrder} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={savingManualOrder} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{savingManualOrder ? "Saving…" : "Save pending order"}</button></div>
          </form>
        </dialog>
        {checklistOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="production-checklist-title">
            <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-5 border-b border-border pb-4">
                <div><h2 id="production-checklist-title" className="font-serif text-2xl font-bold text-primary">Production checklist</h2><p className="mt-1 text-sm text-muted-foreground">Order #{checklistOrder.id} · {checklistOrder.buyerName}</p></div>
                <button type="button" onClick={() => setChecklistOrder(null)} className="rounded-md px-3 py-1 text-sm font-semibold hover:bg-muted">Close</button>
              </div>
              <div className="mt-5 space-y-3">
                <ChecklistItem ready={Boolean(checklistOrder.items?.length)} label="Design / order details" value={checklistOrder.items?.map((item: any) => `${item.productName} × ${item.quantity}`).join(", ") || "Add the order details before baking."} />
                <ChecklistItem ready={Boolean(checklistOrder.flavour || checklistOrder.specialInstructions)} label="Flavour, design text & dietary notes" value={[checklistOrder.flavour, checklistOrder.textOnCake, checklistOrder.specialInstructions].filter(Boolean).join(" · ") || "No extra instructions recorded — confirm with the customer if needed."} />
                <ChecklistItem ready={!checklistOrder.requireAdvance || checklistOrder.advancePaid} label="Deposit / payment" value={checklistOrder.requireAdvance ? (checklistOrder.advancePaid ? "Deposit verified" : "Waiting for baker verification") : "No advance required"} />
                <ChecklistItem ready={Boolean(checklistOrder.deliveryDate)} label="Bake date" value={checklistOrder.deliveryDate ? format(new Date(checklistOrder.deliveryDate), "PPP") : "Set the required date before confirming."} />
                <ChecklistItem ready={["in_production", "out_for_delivery", "delivered"].includes(checklistOrder.status)} label="Packing" value={checklistOrder.status === "confirmed" ? "Move the order to In Production when baking starts." : checklistOrder.status === "new" ? "Confirm the order and payment first." : "Production stage has started."} />
                <ChecklistItem ready={checklistOrder.fulfillmentType === "pickup" || ["out_for_delivery", "delivered"].includes(checklistOrder.status)} label={checklistOrder.fulfillmentType === "pickup" ? "Pickup handover" : "Rider / delivery"} value={checklistOrder.fulfillmentType === "pickup" ? "Confirm pickup time with the customer." : checklistOrder.status === "out_for_delivery" ? "Rider is on the way — keep the customer updated." : checklistOrder.status === "delivered" ? "Delivered — feedback request can be sent." : `${checklistOrder.buyerArea || "Delivery area"}: arrange rider before dispatch.`} />
              </div>
              <p className="mt-5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">This view uses the live order, payment, production and delivery records—no separate checklist data can get out of sync.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ChecklistItem({ ready, label, value }: { ready: boolean; label: string; value: string }) {
  const Icon = ready ? CheckCircle2 : CircleAlert;
  return <div className="flex gap-3 rounded-xl border border-border p-3"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ready ? "text-green-600" : "text-amber-600"}`} /><div><p className="text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{value}</p></div></div>;
}
