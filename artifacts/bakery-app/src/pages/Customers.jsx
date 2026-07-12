import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Phone, MessageCircle, Instagram, Cake, ChevronRight, Search, Star } from 'lucide-react';
import { Order } from '@/api/ordersApi';
import { formatPKR } from '@/lib/utils';

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function groupByCustomer(orders) {
  const map = {};
  for (const order of orders) {
    const key = order.customer_phone || order.customer_name;
    if (!map[key]) {
      map[key] = {
        name: order.customer_name,
        phone: order.customer_phone,
        orders: [],
        totalSpend: 0,
        lastSource: order.source,
        lastOrderDate: order.delivery_date,
      };
    }
    map[key].orders.push(order);
    map[key].totalSpend += order.price || 0;
    if (order.delivery_date > map[key].lastOrderDate) {
      map[key].lastOrderDate = order.delivery_date;
      map[key].lastSource = order.source;
    }
  }
  return Object.values(map).sort((a, b) => b.orders.length - a.orders.length);
}

export default function Customers() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Order.list().then(data => {
      setOrders(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const customers = groupByCustomer(orders);
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const regulars = filtered.filter(c => c.orders.length >= 2);
  const newCustomers = filtered.filter(c => c.orders.length === 1);

  return (
    <div className="px-5 pt-6 pb-24 lg:px-8 lg:pt-8 lg:pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-accent" />
        <span className="text-sm font-medium text-muted-foreground">CRM</span>
      </div>
      <h1 className="font-heading text-3xl font-bold text-foreground mb-5">Your Customers</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full bg-input rounded-2xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card rounded-2xl p-3 border border-border/50 text-center shadow-soft">
              <p className="font-heading font-bold text-xl text-foreground">{customers.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total</p>
            </div>
            <div className="bg-card rounded-2xl p-3 border border-border/50 text-center shadow-soft">
              <p className="font-heading font-bold text-xl text-foreground">{regulars.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Regulars</p>
            </div>
            <div className="bg-card rounded-2xl p-3 border border-border/50 text-center shadow-soft">
              <p className="font-heading font-bold text-xl text-primary">
                {customers.length > 0 ? formatPKR(Math.round(customers.reduce((s, c) => s + c.totalSpend, 0) / customers.length)) : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Avg Spend</p>
            </div>
          </div>

          {/* Regulars */}
          {regulars.length > 0 && (
            <section className="mb-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-warning fill-warning" /> Regulars
              </h2>
              <div className="space-y-3">
                {regulars.map((customer, i) => (
                  <CustomerCard key={customer.phone || customer.name} customer={customer} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* New / One-time */}
          {newCustomers.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">New Customers</h2>
              <div className="space-y-3">
                {newCustomers.map((customer, i) => (
                  <CustomerCard key={customer.phone || customer.name} customer={customer} index={i} />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CustomerCard({ customer, index }) {
  const latestOrder = customer.orders.sort((a, b) => new Date(b.created_at || b.delivery_date) - new Date(a.created_at || a.delivery_date))[0];
  const isInstagram = customer.lastSource === 'instagram';
  const isWhatsApp = customer.lastSource === 'whatsapp';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="bg-card rounded-2xl p-4 border border-border/50 shadow-soft"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="font-heading font-bold text-sm text-primary">{getInitials(customer.name)}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-heading font-semibold text-foreground truncate">{customer.name}</p>
            {customer.orders.length >= 3 && (
              <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">VIP</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {customer.phone ? (
              <span className="text-xs text-muted-foreground">{customer.phone}</span>
            ) : isInstagram ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Instagram className="w-3 h-3" /> Instagram
              </span>
            ) : null}
          </div>
        </div>

        {/* Stats */}
        <div className="text-right flex-shrink-0">
          <p className="font-heading font-semibold text-sm text-foreground">{formatPKR(customer.totalSpend)}</p>
          <p className="text-[11px] text-muted-foreground">{customer.orders.length} order{customer.orders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Last order preview */}
      {latestOrder && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cake className="w-3.5 h-3.5" />
            <span className="truncate max-w-[160px]">{latestOrder.cake_type}</span>
            {latestOrder.weight && <span>· {latestOrder.weight}</span>}
          </div>
          <div className="flex items-center gap-2">
            {customer.phone && (
              <a
                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-7 h-7 rounded-full bg-[#25D366]/10 flex items-center justify-center"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              </a>
            )}
            {isInstagram && (
              <div className="w-7 h-7 rounded-full bg-[#E1306C]/10 flex items-center justify-center">
                <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
              </div>
            )}
            <Link
              to={`/orders/${latestOrder.id}`}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
            >
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}

      {/* Order history chips */}
      {customer.orders.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {customer.orders.slice(0, 4).map(o => (
            <Link key={o.id} to={`/orders/${o.id}`}>
              <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors truncate max-w-[100px] inline-block">
                {o.cake_type}
              </span>
            </Link>
          ))}
          {customer.orders.length > 4 && (
            <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">+{customer.orders.length - 4} more</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
