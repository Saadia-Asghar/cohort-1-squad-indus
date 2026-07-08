import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MetricCard({ title, value, trend, trendUp = true, icon: Icon, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card rounded-2xl p-4 lg:p-5 shadow-soft border border-border/50"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <p className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-1">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trendUp ? (
            <TrendingUp className="w-3 h-3 text-success" />
          ) : (
            <TrendingDown className="w-3 h-3 text-danger" />
          )}
          <span className={trendUp ? 'text-success' : 'text-danger'}>{trend}</span>
        </div>
      )}
    </motion.div>
  );
}