import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, AlertCircle, Edit3, Cake, Calendar, MapPin, Phone, X } from 'lucide-react';

import { ConfidenceBadge } from '@/components/orders/StatusBadge';
import { formatPKR, formatDeliveryDate } from '@/lib/utils';
import { mockExtractionResults, processingSteps } from '@/lib/mockData';

export default function AutoImport() {
  const [phase, setPhase] = useState('ready'); // ready | processing | results | done
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [lastSync, setLastSync] = useState('2 hours ago');
  const [editingIdx, setEditingIdx] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());
  const navigate = useNavigate();

  const startImport = () => {
    setPhase('processing');
    setStepIndex(0);
  };

  useEffect(() => {
    if (phase !== 'processing') return;
    if (stepIndex < processingSteps.length - 1) {
      const timer = setTimeout(() => setStepIndex(stepIndex + 1), 700);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setResults(mockExtractionResults);
        setPhase('results');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, stepIndex]);

  const confirmAndCreate = async () => {
    const ordersToCreate = results.map(r => ({
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      cake_type: r.cake_type,
      flavor: r.flavor,
      weight: r.weight || '',
      design_notes: r.design_notes || '',
      delivery_date: r.delivery_date,
      delivery_time: r.delivery_time || '',
      delivery_type: r.delivery_type,
      price: r.price || 0,
      payment_status: r.payment_status,
      status: r.needsReview && !reviewed.has(results.indexOf(r)) ? 'pending_info' : 'confirmed',
      special_requests: r.special_requests || '',
      source: 'auto_import',
      confidence: r.confidence
    }));

    try {
      await db.entities.Order.bulkCreate(ordersToCreate);
      setPhase('done');
      setLastSync('just now');
      setTimeout(() => navigate('/'), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const allReviewed = results.filter(r => r.needsReview).every(r => reviewed.has(results.indexOf(r)));

  return (
    <div className="p-5 pb-24 lg:p-8 lg:pb-8">
      <AnimatePresence mode="wait">
        {/* STATE 1: READY */}
        {phase === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">AI-Powered</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-6">Auto-Import Orders</h1>

            <div className="bg-card rounded-3xl p-6 shadow-card border border-border/50 text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <p className="text-foreground font-medium mb-1">Let AI handle the paperwork</p>
              <p className="text-sm text-muted-foreground mb-6">
                Syncs your last 24 hours of WhatsApp messages and extracts order details automatically.
              </p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startImport}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-medium text-base shadow-lift flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Import Now
              </motion.button>

              <p className="text-xs text-muted-foreground mt-4">
                Last synced: {lastSync}
              </p>
            </div>

            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
              <p className="text-xs text-accent-foreground/70 font-medium mb-2">HOW IT WORKS</p>
              <div className="space-y-2">
                {[
                  'Reads your WhatsApp conversations',
                  'AI extracts cake, date, price & more',
                  'Flags anything that needs your review',
                  'Creates orders with one tap'
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center text-xs font-semibold">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* STATE 2: PROCESSING */}
        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[70vh]"
          >
            <div className="relative mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>

            <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Finding orders...</h2>
            <p className="text-sm text-muted-foreground mb-8">Do not close this screen</p>

            <div className="w-full max-w-sm space-y-3">
              {processingSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: i <= stepIndex ? 1 : 0.3,
                    x: 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i < stepIndex ? 'bg-success text-success-foreground' :
                    i === stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {i < stepIndex ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : i === stepIndex ? (
                      <motion.div
                        animate={{ scale: [1, 0.8, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-current"
                      />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <span className={`text-sm ${i <= stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STATE 3: RESULTS */}
        {phase === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center">
                <Check className="w-4 h-4 text-success-foreground" />
              </div>
              <span className="text-sm font-medium text-success">Import complete</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-1">
              Found {results.length} orders
            </h1>
            <p className="text-sm text-muted-foreground mb-6">Review and confirm to add them to your dashboard</p>

            {/* Ready to Book */}
            <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Ready to Book
            </h2>
            <div className="space-y-3 mb-6">
              {results.filter(r => !r.needsReview).map((order, i) => {
                const idx = results.indexOf(order);
                return (
                  <ExtractedCard
                    key={idx}
                    order={order}
                    onEdit={() => setEditingIdx(idx)}
                  />
                );
              })}
            </div>

            {/* Needs Review */}
            {results.filter(r => r.needsReview).length > 0 && (
              <>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Needs Review ({results.filter(r => r.needsReview).length})
                </h2>
                <div className="space-y-3 mb-6">
                  {results.filter(r => r.needsReview).map((order) => {
                    const idx = results.indexOf(order);
                    return (
                      <ExtractedCard
                        key={idx}
                        order={order}
                        needsReview
                        isReviewed={reviewed.has(idx)}
                        onEdit={() => setEditingIdx(idx)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={!allReviewed}
              onClick={confirmAndCreate}
              className={`w-full rounded-2xl py-4 font-medium text-base flex items-center justify-center gap-2 transition-all ${
                allReviewed
                  ? 'bg-primary text-primary-foreground shadow-lift'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Check className="w-5 h-5" />
              {allReviewed ? 'Confirm & Create Orders' : 'Review flagged orders first'}
            </motion.button>
            {!allReviewed && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Edit the flagged orders to confirm their details
              </p>
            )}
          </motion.div>
        )}

        {/* STATE 4: DONE */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-success flex items-center justify-center mb-6"
            >
              <Check className="w-12 h-12 text-success-foreground" strokeWidth={3} />
            </motion.div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Orders created!</h2>
            <p className="text-sm text-muted-foreground">
              {results.length} orders added to your dashboard
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingIdx !== null && (
          <EditModal
            order={results[editingIdx]}
            onClose={() => setEditingIdx(null)}
            onSave={(updated) => {
              const newResults = [...results];
              newResults[editingIdx] = { ...updated, needsReview: false };
              setResults(newResults);
              setReviewed(prev => new Set([...prev, editingIdx]));
              setEditingIdx(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExtractedCard({ order, needsReview, isReviewed, onEdit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl p-4 shadow-soft border ${
        needsReview ? 'border-warning/30' : 'border-border/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-lg text-foreground truncate">
            {order.customer_name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{order.cake_type}</p>
        </div>
        {needsReview ? (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-3 py-1.5 rounded-full">
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        ) : isReviewed ? (
          <span className="text-xs font-medium text-success bg-success/10 px-3 py-1.5 rounded-full">Reviewed</span>
        ) : (
          <button onClick={onEdit} className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">Review</button>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <DetailRow icon={<Cake className="w-3.5 h-3.5" />} label="Cake" value={order.weight ? `${order.cake_type} · ${order.weight}` : order.cake_type} missing={needsReview && !order.weight} />
        <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Delivery" value={order.delivery_date ? `${formatDeliveryDate(order.delivery_date)} · ${order.delivery_time || ''}` : null} missing={needsReview && !order.delivery_date} />
        <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Type" value={order.delivery_type === 'delivery' ? 'Home Delivery' : 'Pickup'} />
        <DetailRow icon={<span className="text-xs">💰</span>} label="Price" value={order.price ? formatPKR(order.price) : null} missing={needsReview && !order.price} />
        {order.customer_phone && <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={order.customer_phone} />}
      </div>

      {order.design_notes && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{order.design_notes}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <ConfidenceBadge confidence={order.confidence} />
      </div>
    </motion.div>
  );
}

function DetailRow({ icon, label, value, missing }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground text-xs w-14">{label}</span>
      {missing ? (
        <span className="text-warning text-xs font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Missing
        </span>
      ) : (
        <span className="text-foreground text-sm">{value}</span>
      )}
    </div>
  );
}

function EditModal({ order, onClose, onSave }) {
  const [form, setForm] = useState({ ...order });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-foreground/40 flex items-end justify-center"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-card w-full max-w-md rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-semibold">Edit Order Details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Customer Name" value={form.customer_name} onChange={v => update('customer_name', v)} />
          <Field label="Phone" value={form.customer_phone || ''} onChange={v => update('customer_phone', v)} />
          <Field label="Cake Type" value={form.cake_type} onChange={v => update('cake_type', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight" value={form.weight || ''} onChange={v => update('weight', v)} placeholder="e.g. 2kg" />
            <Field label="Price (PKR)" value={form.price || ''} onChange={v => update('price', Number(v))} placeholder="4500" type="number" />
          </div>
          <Field label="Delivery Date" value={form.delivery_date || ''} onChange={v => update('delivery_date', v)} type="date" />
          <Field label="Delivery Time" value={form.delivery_time || ''} onChange={v => update('delivery_time', v)} placeholder="3:00 PM" />
          <Field label="Design Notes" value={form.design_notes || ''} onChange={v => update('design_notes', v)} />
        </div>

        <button
          onClick={() => onSave(form)}
          className="w-full mt-6 bg-primary text-primary-foreground rounded-2xl py-3.5 font-medium"
        >
          Save & Confirm
        </button>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}