import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO, isSameDay } from 'date-fns';

const periods = ['Day', 'Weekly', 'Monthly'];

export default function OrdersChart({ orders }) {
  const [period, setPeriod] = useState('Weekly');

  const chartData = (() => {
    if (!orders) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const count = orders.filter(o => o.delivery_date && isSameDay(parseISO(o.delivery_date), d)).length;
      days.push({ day: format(d, 'EEE'), orders: count });
    }
    return days;
  })();

  return (
    <div className="bg-card rounded-2xl p-4 lg:p-5 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Business Statistics</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--foreground))',
              border: 'none',
              borderRadius: '0.75rem',
              color: 'hsl(var(--background))',
              fontSize: '12px',
              padding: '8px 12px'
            }}
            labelStyle={{ color: 'hsl(var(--background))' }}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}