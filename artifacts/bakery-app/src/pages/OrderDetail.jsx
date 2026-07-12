import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Check, X, Cake, Calendar, MapPin, CreditCard,
  FileText, Sticker, Clock, Home as HomeIcon, Truck, Sparkles,
  Edit3, Save, MessageCircle, Instagram, ChevronDown
} from 'lucide-react';

import { StatusBadge, PaymentBadge, ConfidenceBadge } from '@/components/orders/StatusBadge';
import { formatFullDate, formatPKR, statusConfig } from '@/lib/utils';
import { Order } from '@/api/ordersApi';
import { AgentApi } from '@/api/agentApi';

const timelineSteps = [
  { key: 'pending_info', label: 'Order Received', icon: Sparkles },
  { key: 'confirmed', label: 'Order Confirmed', icon: Check },
  { key: 'in_progress', label: 'In Progress', icon: Cake },
  { key: 'delivered', label: 'Out for Delivery', icon: Truck },
  { key: 'completed', label: 'Completed', icon: HomeIcon },
];

const statusOrder = ['pending_info', 'confirmed', 'in_progress', 'delivered', 'completed'];

const SOURCE_LABELS = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10' },
  instagram: { icon: Instagram, label: 'Instagram DM', color: 'text-[#E1306C]', bg: 'bg-[#E1306C]/10' },
  auto_import: { icon: Sparkles, label: 'AI Imported', color: 'text-primary', bg: 'bg-primary/10' },
  manual: null,
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deliveryMsg, setDeliveryMsg] = useState('');
  const [deliveryMsgLoading, setDeliveryMsgLoading] = useState(false);
  const [deliveryMsgCopied, setDeliveryMsgCopied] = useState(false);

  useEffect(() => {
    Order.get(id).then(o => {
      setOrder(o);
      setNotes(o.notes || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const updateStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      const updated = await Order.update(order.id, { status: newStatus });
      setOrder(updated);
      if (newStatus === 'completed') navigate('/');
      if (newStatus === 'delivered') {
        setDeliveryMsgLoading(true);
        try {
          const { message } = await AgentApi.getDeliveryMessage(order.id);
          setDeliveryMsg(message);
        } catch { /* non-critical */ }
        setDeliveryMsgLoading(false);
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  const updatePayment = async (newPaymentStatus) => {
    setPaymentOpen(false);
    try {
      const updated = await Order.update(order.id, { paymentStatus: newPaymentStatus });
      setOrder(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const saveNotes = async () => {
    await Order.update(order.id, { notes });
  };

  const startEdit = () => {
    setEditForm({
      customerName: order.customer_name,
      customerPhone: order.customer_phone || '',
      cakeType: order.cake_type,
      flavor: order.flavor || '',
      weight: order.weight || '',
      designNotes: order.design_notes || '',
      deliveryDate: order.delivery_date || '',
      deliveryTime: order.delivery_time || '',
      deliveryType: order.delivery_type,
      price: order.price || '',
      paymentStatus: order.payment_status,
      specialRequests: order.special_requests || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaveLoading(true);
    try {
      const updated = await Order.update(order.id, editForm);
      setOrder(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    }
    setSaveLoading(false);
  };

  const updateField = (k, v) => setEditForm(prev => ({ ...prev, [k]: v }));

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
  const sourceInfo = SOURCE_LABELS[order.source] || null;

  // WhatsApp/Instagram contact URL
  const phone = order.customer_phone?.replace(/\D/g, '');
  const waMessage = encodeURIComponent(`Hi ${order.customer_name}! Your order for ${order.cake_type} is confirmed 🎂`);
  const waUrl = phone ? `https://wa.me/${phone}?text=${waMessage}` : null;
  const isInstagramSource = order.source === 'instagram';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 lg:px-8 lg:pt-8 bg-card border-b border-border/50 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          {sourceInfo && (
            <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sourceInfo.bg} ${sourceInfo.color}`}>
              <sourceInfo.icon className="w-3 h-3" /> {sourceInfo.label}
            </span>
          )}
          {!editing ? (
            <button onClick={startEdit} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-muted-foreground" />
            </button>
          ) : (
            <button onClick={() => setEditing(false)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{order.customer_name}</h1>
        <p className="text-muted-foreground">{order.cake_type}</p>
      </div>

      <div className="px-5 py-5 lg:px-8 lg:py-6 space-y-5 max-w-4xl pb-24">

        {/* Edit Form */}
        <AnimatePresence>
          {editing && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
              <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" /> Edit Order
              </h3>
              <div className="space-y-3">
                <EditField label="Customer Name" value={editForm.customerName} onChange={v => updateField('customerName', v)} />
                <EditField label="Phone" value={editForm.customerPhone} onChange={v => updateField('customerPhone', v)} placeholder="+92 300 1234567" />
                <EditField label="Cake Type" value={editForm.cakeType} onChange={v => updateField('cakeType', v)} />
                <EditField label="Flavor" value={editForm.flavor} onChange={v => updateField('flavor', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Weight" value={editForm.weight} onChange={v => updateField('weight', v)} placeholder="e.g. 2kg" />
                  <EditField label="Price (PKR)" value={editForm.price} onChange={v => updateField('price', Number(v))} type="number" placeholder="4500" />
                </div>
                <EditField label="Delivery Date" value={editForm.deliveryDate} onChange={v => updateField('deliveryDate', v)} type="date" />
                <EditField label="Delivery Time" value={editForm.deliveryTime} onChange={v => updateField('deliveryTime', v)} placeholder="3:00 PM" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Delivery Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['delivery', 'pickup'].map(t => (
                      <button key={t} onClick={() => updateField('deliveryType', t)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${editForm.deliveryType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-input border-border text-foreground'}`}>
                        {t === 'delivery' ? 'Home Delivery' : 'Pickup'}
                      </button>
                    ))}
                  </div>
                </div>
                <EditField label="Design Notes" value={editForm.designNotes} onChange={v => updateField('designNotes', v)} />
                <EditField label="Special Requests" value={editForm.specialRequests} onChange={v => updateField('specialRequests', v)} />
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit} disabled={saveLoading}
                className="w-full mt-4 bg-primary text-primary-foreground rounded-2xl py-3.5 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saveLoading ? 'Saving…' : 'Save Changes'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {i < timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${i < currentStepIdx ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                    <div className="pt-1.5 pb-2">
                      <p className={`text-sm font-medium ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                      {isCurrent && <p className="text-xs text-primary mt-0.5">Current status</p>}
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

            {/* Payment status toggle */}
            {order.payment_status !== 'paid' && (
              <div className="relative ml-auto">
                <button onClick={() => setPaymentOpen(o => !o)}
                  className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  <CreditCard className="w-3 h-3" /> Update Payment <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {paymentOpen && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-10 min-w-[140px] overflow-hidden">
                      {['partial', 'paid'].filter(s => s !== order.payment_status).map(s => (
                        <button key={s} onClick={() => updatePayment(s)}
                          className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors capitalize">
                          Mark as {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
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
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
            placeholder="Add notes for yourself..." rows={3}
            className="w-full bg-input rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        {/* Delivery Message */}
        <AnimatePresence>
          {(deliveryMsg || deliveryMsgLoading) && (
            <motion.div key="delivery-msg" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-[#25D366]/5 border border-[#25D366]/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <p className="text-xs font-semibold text-[#25D366]">AI Delivery Message</p>
              </div>
              {deliveryMsgLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 border-2 border-[#25D366]/30 border-t-[#25D366] rounded-full animate-spin" />
                  Generating message…
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground leading-relaxed mb-3">{deliveryMsg}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(deliveryMsg);
                      setDeliveryMsgCopied(true);
                      setTimeout(() => setDeliveryMsgCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium bg-[#25D366] text-white px-3 py-1.5 rounded-full">
                    {deliveryMsgCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><MessageCircle className="w-3 h-3" /> Copy for WhatsApp</>}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {!isCancelled && order.status !== 'completed' && (
          <div className="space-y-2.5">
            {/* Contact buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl py-3.5 font-medium text-sm text-[#25D366] flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {order.customer_phone && (
                <a href={`tel:${order.customer_phone}`}
                  className={`bg-card border border-border rounded-2xl py-3.5 font-medium text-sm text-foreground flex items-center justify-center gap-2 shadow-soft ${!waUrl ? 'col-span-2' : ''}`}>
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
              {isInstagramSource && !order.customer_phone && (
                <div className="col-span-2 bg-[#E1306C]/5 border border-[#E1306C]/20 rounded-2xl py-3.5 font-medium text-sm text-[#E1306C] flex items-center justify-center gap-2">
                  <Instagram className="w-4 h-4" /> Reply via Instagram DM
                </div>
              )}
            </div>

            {order.status !== 'delivered' && (
              <motion.button whileTap={{ scale: 0.97 }} disabled={actionLoading} onClick={() =>
                updateStatus(order.status === 'confirmed' ? 'in_progress' : order.status === 'in_progress' ? 'delivered' : 'completed')}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-medium text-sm flex items-center justify-center gap-2 shadow-lift disabled:opacity-50">
                <Check className="w-4 h-4" />
                {order.status === 'pending_info' ? 'Confirm Order'
                  : order.status === 'confirmed' ? 'Start Baking'
                  : order.status === 'in_progress' ? 'Mark as Delivered'
                  : 'Mark as Completed'}
              </motion.button>
            )}
            {order.status === 'delivered' && (
              <motion.button whileTap={{ scale: 0.97 }} disabled={actionLoading} onClick={() => updateStatus('completed')}
                className="w-full bg-success text-success-foreground rounded-2xl py-3.5 font-medium text-sm flex items-center justify-center gap-2 shadow-lift disabled:opacity-50">
                <Check className="w-4 h-4" /> Mark as Completed
              </motion.button>
            )}
            <button onClick={() => updateStatus('cancelled')} className="w-full text-danger text-sm font-medium py-3">
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

function EditField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}
