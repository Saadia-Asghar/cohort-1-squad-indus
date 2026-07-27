import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { customFetch, useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FormEvent } from "react";

const emptyManualOrder = {
  buyerName: "", buyerWhatsapp: "", buyerAddress: "", buyerArea: "",
  productName: "", quantity: "1", totalPkr: "", deliveryDate: "", occasion: "", specialInstructions: "",
};

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
                {orders?.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-4 font-mono font-medium">#{order.id}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{order.buyerName}</div>
                      <div className="text-muted-foreground text-xs">{order.buyerWhatsapp}</div>
                    </td>
                    <td className="px-4 py-4">
                      {order.deliveryDate ? format(new Date(order.deliveryDate), "PPP") : "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'new' ? 'bg-blue-100 text-blue-800' :
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
                      <select 
                        className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        disabled={updateStatus.isPending}
                      >
                        <option value="new">New</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_production">In Production</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
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
      </div>
    </DashboardLayout>
  );
}
