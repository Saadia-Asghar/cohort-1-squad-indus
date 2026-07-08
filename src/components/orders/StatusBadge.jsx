import { statusConfig, paymentConfig } from '@/lib/utils';

export function StatusBadge({ status }) {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      config.color === 'success' ? 'bg-success/10 text-success' :
      config.color === 'warning' ? 'bg-warning/10 text-warning' :
      config.color === 'danger' ? 'bg-danger/10 text-danger' :
      config.color === 'accent' ? 'bg-accent/15 text-accent-foreground' :
      'bg-primary/10 text-primary'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function PaymentBadge({ status }) {
  const config = paymentConfig[status];
  if (!config) return null;
  const isWarning = config.color === 'warning';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isWarning ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
    }`}>
      {isWarning ? '💰' : '✓'} {config.label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }) {
  if (confidence == null) return null;
  const isHigh = confidence >= 70;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isHigh ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-success' : 'bg-warning'}`} />
      {isHigh ? 'High confidence' : 'Needs review'}
    </span>
  );
}