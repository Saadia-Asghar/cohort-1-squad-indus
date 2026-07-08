import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isTomorrow, isPast, differenceInDays, parseISO } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatPKR(amount) {
  if (amount == null) return "—";
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function formatDeliveryDate(dateStr) {
  if (!dateStr) return "Date not set";
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date)) return format(date, "MMM d");
    return format(date, "MMM d");
  } catch {
    return dateStr;
  }
}

export function formatFullDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}

export function isUpcoming(dateStr, days = 7) {
  const d = getDaysUntil(dateStr);
  if (d === null) return false;
  return d >= 0 && d <= days;
}

export const statusConfig = {
  pending_info: { label: "Needs Info", color: "warning", dot: "bg-warning" },
  confirmed: { label: "Confirmed", color: "success", dot: "bg-success" },
  in_progress: { label: "In Progress", color: "accent", dot: "bg-accent" },
  delivered: { label: "Delivered", color: "primary", dot: "bg-primary" },
  completed: { label: "Completed", color: "success", dot: "bg-success" },
  cancelled: { label: "Cancelled", color: "danger", dot: "bg-danger" }
};

export const paymentConfig = {
  pending: { label: "Payment Due", color: "warning" },
  partial: { label: "Partial", color: "warning" },
  paid: { label: "Paid", color: "success" }
};

export function getConfidenceLabel(confidence) {
  if (confidence == null) return null;
  if (confidence >= 70) return { label: "High confidence", color: "success" };
  if (confidence >= 50) return { label: "Medium confidence", color: "warning" };
  return { label: "Needs review", color: "danger" };
}