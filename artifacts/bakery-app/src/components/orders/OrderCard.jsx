import { Link } from 'react-router-dom';
import { MapPin, Cake, MessageCircle, Instagram, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatusBadge, PaymentBadge } from './StatusBadge';
import { formatDeliveryDate, formatPKR } from '@/lib/utils';

const SOURCE_ICON = {
  whatsapp: { icon: MessageCircle, color: 'text-[#25D366]', label: 'WhatsApp' },
  instagram: { icon: Instagram, color: 'text-[#E1306C]', label: 'Instagram' },
  auto_import: { icon: Sparkles, color: 'text-primary', label: 'AI Import' },
};

export default function OrderCard({ order, index = 0 }) {
  const src = SOURCE_ICON[order.source];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/orders/${order.id}`}>
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 hover:shadow-card transition-shadow cursor-pointer">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-lg text-foreground truncate">
                {order.customer_name}
              </h3>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5" />
                {order.cake_type}
                {order.weight && <span className="text-muted-foreground">· {order.weight}</span>}
              </p>
            </div>
            {order.price != null && (
              <span className="font-heading font-semibold text-foreground whitespace-nowrap">
                {formatPKR(order.price)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              {formatDeliveryDate(order.delivery_date)}
              {order.delivery_time && ` · ${order.delivery_time}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={order.status} />
              {order.payment_status !== 'paid' && <PaymentBadge status={order.payment_status} />}
            </div>
            <div className="flex items-center gap-2">
              {src && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${src.color}`}>
                  <src.icon className="w-3 h-3" />
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {order.delivery_type === 'delivery' ? (
                  <><MapPin className="w-3.5 h-3.5" /> Delivery</>
                ) : (
                  <><MapPin className="w-3.5 h-3.5" /> Pickup</>
                )}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}