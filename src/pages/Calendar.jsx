import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Clock, MapPin } from 'lucide-react';

import { StatusBadge } from '@/components/orders/StatusBadge';
import { formatPKR, statusConfig } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';

export default function Calendar() {
  const [orders, setOrders] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    db.entities.Order.list('-delivery_date', 50).then(setOrders).catch(() => setOrders([]));
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getOrdersForDay = (day) => {
    return (orders || []).filter(o => o.delivery_date && isSameDay(parseISO(o.delivery_date), day));
  };

  const selectedOrders = getOrdersForDay(selectedDate);
  const today = new Date();

  return (
    <div className="p-5 pb-24 lg:p-8 lg:pb-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-5">Calendar</h1>

      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-soft"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-soft"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
      {/* Calendar grid */}
      <div className="bg-card rounded-2xl p-3 shadow-soft border border-border/50 mb-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayOrders = getOrdersForDay(day);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const inMonth = isSameMonth(day, currentMonth);
            const hasConfirmed = dayOrders.some(o => ['confirmed', 'completed', 'in_progress', 'delivered'].includes(o.status));
            const hasPending = dayOrders.some(o => o.status === 'pending_info');

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-colors relative ${
                  isSelected ? 'bg-primary text-primary-foreground font-semibold' :
                  isToday ? 'bg-accent/20 text-foreground font-semibold' :
                  inMonth ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40'
                }`}
              >
                {format(day, 'd')}
                {dayOrders.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasPending && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-accent' : 'bg-warning'}`} />}
                    {hasConfirmed && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-success'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> Today</span>
      </div>
      </div>

      <div className="lg:col-span-2">
      {/* Selected day agenda */}
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">
          {isSameDay(selectedDate, today) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
        </h3>
        {!orders ? (
          <div className="space-y-3">
            <div className="h-20 bg-card rounded-2xl animate-pulse" />
            <div className="h-20 bg-card rounded-2xl animate-pulse" />
          </div>
        ) : selectedOrders.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 text-center border border-border/50">
            <p className="text-sm text-muted-foreground">No orders for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedOrders
              .sort((a, b) => (a.delivery_time || '').localeCompare(b.delivery_time || ''))
              .map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/orders/${order.id}`}>
                    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary/8 flex-shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{order.cake_type}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-muted-foreground">
                            {order.delivery_time || 'Time TBD'}
                          </span>
                        </div>
                      </div>
                      {order.price != null && (
                        <span className="font-heading font-semibold text-sm whitespace-nowrap">{formatPKR(order.price)}</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}