import { BuyerLayout } from "@/components/layout/buyer-layout";
import { useListOrders, useCreateReview, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { format } from "date-fns";
import { useState } from "react";

export default function BuyerOrders() {
  const { buyerId } = useBuyerSession();
  const { data: orders, isLoading } = useListOrders({ buyerId }, { query: { enabled: !!buyerId, queryKey: getListOrdersQueryKey({ buyerId }) } });
  const createReview = useCreateReview();
  const [feedbackFor, setFeedbackFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const submitFeedback = (order: NonNullable<typeof orders>[number]) => {
    createReview.mutate({
      data: {
        bakerId: order.bakerId,
        buyerId: order.buyerId ?? buyerId,
        orderId: order.id,
        buyerName: order.buyerName,
        rating,
        reviewText: reviewText.trim() || undefined,
        productName: order.items?.map((item) => item.productName).join(", "),
      },
    }, {
      onSuccess: () => {
        setFeedbackFor(null);
        setReviewText("");
        setRating(5);
      },
    });
  };

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
                  <div className="mt-6 pt-6 border-t border-border flex flex-wrap justify-end gap-3">
                    <button className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-6 py-2 rounded-md font-medium transition-colors">
                      Reorder
                    </button>
                    {order.status === "delivered" && (
                      <button
                        onClick={() => setFeedbackFor(feedbackFor === order.id ? null : order.id)}
                        className="border border-primary/30 px-4 py-2 rounded-md text-sm font-semibold text-primary hover:bg-primary/5"
                      >
                        {feedbackFor === order.id ? "Close feedback" : "Leave feedback"}
                      </button>
                    )}
                  </div>
                  {feedbackFor === order.id && (
                    <form onSubmit={(event) => { event.preventDefault(); submitFeedback(order); }} className="mt-4 rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`rating-${order.id}`} className="text-sm font-medium">Your rating</label>
                        <select id={`rating-${order.id}`} value={rating} onChange={(event) => setRating(Number(event.target.value))} className="rounded border border-border bg-background px-2 py-1 text-sm">
                          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                        </select>
                      </div>
                      <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="How was the product and delivery?" className="min-h-20 w-full rounded border border-border bg-background p-2 text-sm" />
                      <button disabled={createReview.isPending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                        {createReview.isPending ? "Sending..." : "Send feedback"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
