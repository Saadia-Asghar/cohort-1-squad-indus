import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

import OrderCard from '@/components/orders/OrderCard';
import OrderSkeleton from '@/components/orders/OrderSkeleton';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' }
];

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    db.entities.Order.list('-delivery_date', 50).then(setOrders).catch(() => setOrders([]));
  }, []);

  const filtered = (orders || []).filter(o => {
    if (search && !o.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;

    if (activeFilter === 'today') {
      const today = new Date().toDateString();
      return o.delivery_date && new Date(o.delivery_date).toDateString() === today;
    }
    if (activeFilter === 'pending') {
      return ['pending_info', 'confirmed', 'in_progress'].includes(o.status);
    }
    if (activeFilter === 'completed') {
      return ['completed', 'cancelled', 'delivered'].includes(o.status);
    }
    return true;
  });

  return (
    <div className="p-5 pb-24 lg:p-8 lg:pb-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Orders</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer name..."
          className="w-full bg-input rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!orders ? (
        <div className="space-y-3">
          <OrderSkeleton /><OrderSkeleton /><OrderSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border/50">
          <p className="text-sm text-muted-foreground">
            {search ? `No orders found for "${search}"` : 'No orders in this category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}