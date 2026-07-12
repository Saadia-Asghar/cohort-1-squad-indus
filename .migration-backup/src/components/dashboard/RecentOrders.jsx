import { Link } from 'react-router-dom';
import { StatusBadge, PaymentBadge } from '@/components/orders/StatusBadge';
import { formatDeliveryDate } from '@/lib/utils';

export default function RecentOrders({ orders }) {
  return (
    <div className="bg-card rounded-2xl p-4 lg:p-5 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">Recent Orders</h3>
        <Link to="/orders" className="text-xs font-medium text-primary hover:underline">View All</Link>
      </div>
      {!orders || orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4 hidden sm:table-cell">Cake</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <Link to={`/orders/${order.id}`} className="block">
                      <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <p className="text-sm text-muted-foreground">{order.cake_type}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-muted-foreground">{formatDeliveryDate(order.delivery_date)}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3">
                    <PaymentBadge status={order.payment_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}