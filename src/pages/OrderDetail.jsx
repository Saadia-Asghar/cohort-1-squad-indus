const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Check, X, Cake, Calendar, MapPin, CreditCard,
  FileText, Sticker, Clock, Home as HomeIcon, Truck, Sparkles
} from 'lucide-react';

import { StatusBadge, PaymentBadge, ConfidenceBadge } from '@/components/orders/StatusBadge';
import { formatFullDate, formatPKR, statusConfig } from '@/lib/utils';

const timelineSteps = [
  { key: 'pending_info', label: 'Order Received', icon: Sparkles },
  { key: 'confirmed', label: 'Order Confirmed', icon: Check },
  { key: 'in_progress', label: 'In Progress', icon: Cake },
  { key: 'delivered', label: 'Out for Delivery', icon: Truck },
  { key: 'completed', label: 'Completed', icon: HomeIcon }
];

const statusOrder = ['pending_info', 'confirmed', 'in_progress', 'delivered', 'completed'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    db.entities.Order.get(id).then(o => {
      setOrder(o);
      setNotes(o.notes || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const updateStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      const updated = await db.entities.Order.update(order.id, { status: newStatus });
      setOrder(updated);
      if (newStatus === 'completed') navigate('/');
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  const saveNotes = async () => {
    await db.entities.Order.update(order.id, { notes });
  };

  if (loading) {
    return (
      <div className="px-5 pt-12 pb-4">
        <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mt-20" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-5 pt-12 pb-4 text-center">
        <p className="text-muted-foreground">Order not found</p>
        <Link to="/orders" className="text-primary text-sm mt-2 inline-block">Back to Orders</Link>
      </div>
    );
  }

  const currentStepIdx = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 lg:px-8 lg:pt-8 bg-card border-b border-border/50 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          {order.source === 'auto_import' && (
            <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> AI Imported
            </span>
          )}
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{order.customer_name}</h1>
        <p className="text-muted-foreground">{order.cake_type}</p>
      </div>

      <div className="px-5 py-5 lg:px-8 lg:py-6 space-y-5 max-w-4xl">
        {/* Timeline */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
          <h3 className="font-heading font-semibold text-foreground mb-4">Timeline</h3>
          {!isCancelled ? (
            <div className="space-y-0">
              {timelineSteps.map((step, i) => {
                const Icon = step.icon;
                const isDone = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {i < timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${i < currentStepIdx ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                    <div className="pt-1.5 pb-2">
                      <p className={`text-sm font-medium ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-primary mt-0.5">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-danger">
              <X className="w-5 h-5" />
              <span className="font-medium">Order Cancelled</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
          <h3 className="font-heading font-semibold text-foreground mb-4">Details</h3>
          <div className="space-y-3">
            <DetailRow icon={<Cake className="w-4 h-4" />} label="Cake" value={`${order.cake_type}${order.weight ? ` · ${order.weight}` : ''}`} />
            {order.flavor && <DetailRow icon={<Sticker className="w-4 h-4" />} label="Flavor" value={order.flavor} />}
            {order.design_notes && <DetailRow icon={<FileText className="w-4 h-4" />} label="Writing" value={order.design_notes} />}
            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Delivery" value={`${formatFullDate(order.delivery_date)}${order.delivery_time ? ` at ${order.delivery_time}` : ''}`} />
            <DetailRow icon={order.delivery_type === 'delivery' ? <Truck className="w-4 h-4" /> : <HomeIcon className="w-4 h-4" />} label="Type" value={order.delivery_type === 'delivery' ? 'Home Delivery' : 'Pickup'} />
            <DetailRow icon={<span className="text-sm">💰</span>} label="Price" value={formatPKR(order.price)} />
            {order.customer_phone && <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={order.customer_phone} />}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-border/50">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
            {order.confidence != null && <ConfidenceBadge confidence={order.confidence} />}
          </div>
        </div>

        {/* Special Requests */}
        {order.special_requests && (
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
            <p className="text-xs font-medium text-accent-foreground/70 mb-1">SPECIAL REQUESTS</p>
            <p className="text-sm text-foreground">{order.special_requests}</p>
          </div>
        )}

        {/* Notes */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
          <h3 className="font-heading font-semibold text-foreground mb-3">Internal Notes</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes for yourself..."
            rows={3}
            className="w-full bg-input rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Actions */}
        {!isCancelled && order.status !== 'completed' && (
          <div className="space-y-2.5">
            {order.customer_phone && (
              <a
                href={`tel:${order.customer_phone}`}
                className="w-full bg-card border border-border rounded-2xl py-3.5 font-medium text-sm text-foreground flex items-center justify-center gap-2 shadow-soft"
              >
                <Phone className="w-4 h-4" /> Call Customer
              </a>
            )}
            {order.status !== 'delivered' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={actionLoading}
                onClick={() => updateStatus(order.status === 'confirmed' ? 'in_progress' : order.status === 'in_progress' ? 'delivered' : 'completed')}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-medium text-sm flex items-center justify-center gap-2 shadow-lift disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {order.status === 'confirmed' ? 'Start Baking' : order.status === 'in_progress' ? 'Mark as Delivered' : 'Mark as Completed'}
              </motion.button>
            )}
            {order.status === 'delivered' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={actionLoading}
                onClick={() => updateStatus('completed')}
                className="w-full bg-success text-success-foreground rounded-2xl py-3.5 font-medium text-sm flex items-center justify-center gap-2 shadow-lift disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Mark as Completed
              </motion.button>
            )}
            <button
              onClick={() => updateStatus('cancelled')}
              className="w-full text-danger text-sm font-medium py-3"
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-4 flex-shrink-0">{icon}</span>
      <span className="text-muted-foreground text-sm w-20 flex-shrink-0">{label}</span>
      <span className="text-foreground text-sm font-medium flex-1">{value || '—'}</span>
    </div>
  );
}