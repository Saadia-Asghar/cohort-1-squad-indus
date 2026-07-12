import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { Order } from '@/api/ordersApi';

export default function NewOrder() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    cake_type: '',
    flavor: '',
    weight: '',
    design_notes: '',
    delivery_date: '',
    delivery_time: '',
    delivery_type: 'delivery',
    price: '',
    payment_status: 'pending',
    status: 'confirmed',
    special_requests: '',
    notes: '',
    source: 'manual'
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!form.customer_name || !form.cake_type || !form.delivery_date) return;
    setSaving(true);
    try {
      await Order.create({
        customerName: form.customer_name,
        customerPhone: form.customer_phone,
        cakeType: form.cake_type,
        flavor: form.flavor,
        weight: form.weight,
        designNotes: form.design_notes,
        deliveryDate: form.delivery_date,
        deliveryTime: form.delivery_time,
        deliveryType: form.delivery_type,
        price: form.price ? Number(form.price) : 0,
        paymentStatus: form.payment_status,
        status: form.status,
        specialRequests: form.special_requests,
        notes: form.notes,
        source: form.source,
        confidence: null
      });
      navigate('/orders');
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const isValid = form.customer_name && form.cake_type && form.delivery_date;

  return (
    <div className="min-h-screen">
      <div className="px-5 pt-6 pb-4 lg:px-8 lg:pt-8 bg-card border-b border-border/50 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading text-2xl font-bold text-foreground">New Order</h1>
        </div>
      </div>

      <div className="px-5 py-5 lg:px-8 lg:py-6 space-y-5 max-w-3xl">
        <Card title="Customer">
          <Field label="Customer Name *" value={form.customer_name} onChange={v => update('customer_name', v)} placeholder="Ayesha Khan" />
          <Field label="Phone Number" value={form.customer_phone} onChange={v => update('customer_phone', v)} placeholder="+92 300 1234567" type="tel" />
        </Card>

        <Card title="Cake Details">
          <Field label="Cake Type *" value={form.cake_type} onChange={v => update('cake_type', v)} placeholder="Chocolate Truffle" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Flavor" value={form.flavor} onChange={v => update('flavor', v)} placeholder="Chocolate" />
            <Field label="Weight" value={form.weight} onChange={v => update('weight', v)} placeholder="2kg" />
          </div>
          <Field label="Writing / Design Notes" value={form.design_notes} onChange={v => update('design_notes', v)} placeholder='Happy Birthday Sara' />
          <Field label="Special Requests" value={form.special_requests} onChange={v => update('special_requests', v)} placeholder="No nuts — allergy" />
        </Card>

        <Card title="Delivery">
          <Field label="Delivery Date *" value={form.delivery_date} onChange={v => update('delivery_date', v)} type="date" />
          <Field label="Delivery Time" value={form.delivery_time} onChange={v => update('delivery_time', v)} placeholder="3:00 PM" />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Delivery Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['delivery', 'pickup'].map(type => (
                <button
                  key={type}
                  onClick={() => update('delivery_type', type)}
                  className={`py-3 rounded-xl text-sm font-medium capitalize transition-colors ${
                    form.delivery_type === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-input text-muted-foreground'
                  }`}
                >
                  {type === 'delivery' ? 'Home Delivery' : 'Pickup'}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Payment">
          <Field label="Price (PKR)" value={form.price} onChange={v => update('price', v)} placeholder="4500" type="number" />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['pending', 'partial', 'paid'].map(status => (
                <button
                  key={status}
                  onClick={() => update('payment_status', status)}
                  className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                    form.payment_status === status
                      ? status === 'paid' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                      : 'bg-input text-muted-foreground'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!isValid || saving}
          onClick={save}
          className={`w-full rounded-2xl py-4 font-medium text-base flex items-center justify-center gap-2 transition-all ${
            isValid && !saving
              ? 'bg-primary text-primary-foreground shadow-lift'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Check className="w-5 h-5" />
          {saving ? 'Creating...' : 'Create Order'}
        </motion.button>
        {!isValid && (
          <p className="text-center text-xs text-muted-foreground">
            Name, cake type, and delivery date are required
          </p>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
      <h3 className="font-heading font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
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