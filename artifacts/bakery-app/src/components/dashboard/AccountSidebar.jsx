import { Sparkles, QrCode } from 'lucide-react';
import { useUser } from '@clerk/react';
import { formatPKR } from '@/lib/utils';

export default function AccountSidebar({ orders, revenue, completedOrders }) {
  const { user } = useUser();
  const todayOrders = (orders || []).filter(o => {
    if (!o.delivery_date) return false;
    return new Date(o.delivery_date).toDateString() === new Date().toDateString();
  });
  const todayDelivered = todayOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length;
  const todayPending = todayOrders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status)).length;
  const todayTotal = todayOrders.length || 1;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
        <div className="flex flex-col items-center text-center">
          {user?.imageUrl
            ? <img src={user.imageUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-primary/20" />
            : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="font-heading text-2xl font-bold text-primary">
                  {(user?.firstName || user?.fullName || 'B')[0]}
                </span>
              </div>
            )
          }
          <h3 className="font-heading text-lg font-semibold text-foreground">{user?.fullName || user?.firstName || 'Baker'}</h3>
          <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || 'Home Baker'}</p>
          <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mt-2">
            <Sparkles className="w-3 h-3" /> Verified Baker
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border">
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-foreground">{orders?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-foreground">{revenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-foreground">{completedOrders}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Today's Progress</h3>
          <span className="text-xs text-muted-foreground">{todayOrders.length} orders</span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-foreground">Delivered</span>
              <span className="text-xs font-medium text-success">{todayDelivered}/{todayOrders.length}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${(todayDelivered / todayTotal) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-foreground">In Progress</span>
              <span className="text-xs font-medium text-warning">{todayPending}/{todayOrders.length}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${(todayPending / todayTotal) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/50">
        <h3 className="font-heading font-semibold text-foreground mb-3">Scan to Connect</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
            <QrCode className="w-12 h-12 text-background" />
          </div>
          <p className="text-xs text-muted-foreground">Customers scan this QR to send you a WhatsApp order directly.</p>
        </div>
      </div>
    </div>
  );
}