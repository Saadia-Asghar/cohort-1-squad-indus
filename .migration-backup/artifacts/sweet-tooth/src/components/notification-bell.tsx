import { useState, useRef, useEffect } from "react";
import { Bell, X, ShoppingBag, MessageSquare, AlertTriangle, DollarSign, CheckCircle } from "lucide-react";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  new_order: { icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
  chat_escalation: { icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  payment_pending: { icon: DollarSign, color: "text-orange-600 bg-orange-50" },
  order_delivered: { icon: CheckCircle, color: "text-green-600 bg-green-50" },
  new_message: { icon: MessageSquare, color: "text-purple-600 bg-purple-50" },
};

export function NotificationBell({ bakerId }: { bakerId: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications } = useListNotifications(bakerId, {
    query: {
      enabled: !!bakerId,
      queryKey: getListNotificationsQueryKey(bakerId),
      refetchInterval: 15000,
    },
  });

  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const unread = (notifications ?? []).filter(n => !n.isRead).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkAll = () => {
    markAll.mutate({ bakerId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey(bakerId) }),
    });
  };

  const handleMarkOne = (notifId: number) => {
    markOne.mutate({ bakerId, notifId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey(bakerId) }),
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {!notifications || notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.new_message;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && handleMarkOne(n.id)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(n.createdAt), "MMM d, h:mm a")}</p>
                    </div>
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
