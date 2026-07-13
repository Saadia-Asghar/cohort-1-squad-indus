import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function DashboardOrders() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListOrders({ bakerId }, { query: { enabled: !!bakerId, queryKey: getListOrdersQueryKey({ bakerId }), refetchInterval: 10000 } });
  const updateStatus = useUpdateOrderStatus();

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

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Order Pipeline</h1>
        
        {isLoading ? (
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
      </div>
    </DashboardLayout>
  );
}
