import { BuyerLayout } from "@/components/layout/buyer-layout";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { format } from "date-fns";

export default function BuyerOrders() {
  const { buyerId } = useBuyerSession();
  const { data: orders, isLoading } = useListOrders({ buyerId }, { query: { enabled: !!buyerId, queryKey: getListOrdersQueryKey({ buyerId }) } });

  return (
    <BuyerLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Your Orders</h1>
        
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl w-full"></div>
            <div className="h-32 bg-muted rounded-xl w-full"></div>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
            <p className="text-xl font-serif text-muted-foreground mb-4">No orders yet.</p>
            <a href="/bakers" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
              Find a Baker
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
                <div className="bg-muted/30 p-4 border-b border-border flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Placed</p>
                    <p className="font-medium">{format(new Date(order.createdAt), "PPP")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-mono font-bold">PKR {order.totalPkr.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order #</p>
                    <p className="font-mono">{order.id}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{item.quantity}x</span>
                          <div>
                            <p className="font-bold">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">{item.sizeLabel}</p>
                          </div>
                        </div>
                        <p className="font-mono">PKR {(item.unitPricePkr * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-border flex justify-end">
                    <button className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-6 py-2 rounded-md font-medium transition-colors">
                      Reorder
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
