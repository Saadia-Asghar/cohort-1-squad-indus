import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Plus, AlertCircle, ClipboardList, Calendar, TrendingUp, Wallet } from 'lucide-react';

import MetricCard from '@/components/dashboard/MetricCard';
import OrdersChart from '@/components/dashboard/OrdersChart';
import RecentOrders from '@/components/dashboard/RecentOrders';
import AccountSidebar from '@/components/dashboard/AccountSidebar';
import { getGreeting, isUpcoming } from '@/lib/utils';

export default function Home() {
  const [orders, setOrders] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    db.entities.Order.list('-delivery_date', 50).then(setOrders).catch(() => setOrders([]));
    db.auth.me().then(setUser).catch(() => setUser({ full_name: 'Zara Ahmed' }));
  }, []);

  const greeting = getGreeting();
  const bakerName = user?.full_name || 'Zara';

  const totalOrders = orders?.length || 0;
  const thisWeekOrders = (orders || []).filter(o => o.delivery_date && isUpcoming(o.delivery_date, 7)).length;
  const completedOrders = (orders || []).filter(o => ['completed', 'delivered'].includes(o.status)).length;
  const deliveryRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const pendingPayments = (orders || []).filter(o => o.payment_status !== 'paid' && !['completed', 'cancelled'].includes(o.status)).length;
  const revenue = (orders || []).filter(o => ['completed', 'delivered'].includes(o.status)).reduce((sum, o) => sum + (o.price || 0), 0);

  const needsAttention = (orders || []).filter(o =>
    o.status === 'pending_info' || (o.payment_status === 'pending' && o.status !== 'completed' && o.status !== 'cancelled')
  );

  return (
    <div className="p-5 pb-24 lg:p-8 lg:pb-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{greeting}, {bakerName} 👋</p>
        </div>
        <div className="flex gap-2.5">
          <Link to="/auto-import">
            <motion.div whileTap={{ scale: 0.95 }} className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lift">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Auto-Import</span>
            </motion.div>
          </Link>
          <Link to="/orders/new">
            <motion.div whileTap={{ scale: 0.95 }} className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-soft">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">New Order</span>
            </motion.div>
          </Link>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <Link to="/orders">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/5 border border-warning/20 rounded-2xl p-4 mb-6 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{needsAttention.length} order{needsAttention.length > 1 ? 's' : ''} need attention</p>
              <p className="text-xs text-muted-foreground">Missing info or pending payments</p>
            </div>
            <span className="text-xs font-medium text-warning">Review →</span>
          </motion.div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        <div className="lg:col-span-8 space-y-5 lg:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard title="Total Orders" value={totalOrders} trend="+4 this week" trendUp icon={ClipboardList} index={0} />
            <MetricCard title="This Week" value={thisWeekOrders} trend="+2 vs last" trendUp icon={Calendar} index={1} />
            <MetricCard title="Delivery Rate" value={`${deliveryRate}%`} trend="+5% this month" trendUp icon={TrendingUp} index={2} />
            <MetricCard title="Pending Pay" value={pendingPayments} trend="-1 from yesterday" trendUp={false} icon={Wallet} index={3} />
          </div>

          <OrdersChart orders={orders} />
          <RecentOrders orders={orders?.slice(0, 6)} />
        </div>

        <div className="lg:col-span-4">
          <AccountSidebar user={user} orders={orders} revenue={revenue} completedOrders={completedOrders} />
        </div>
      </div>
    </div>
  );
}