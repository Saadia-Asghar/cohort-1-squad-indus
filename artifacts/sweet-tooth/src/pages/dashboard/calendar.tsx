import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListOrders, getListOrdersQueryKey, useGetBaker, getGetBakerQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { liveDashboardQuery, ORDERS_POLL_MS } from "@/lib/dashboard-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Phone, DollarSign, Tag, Gift, Ban, MessageCircle, X, ShoppingBag } from "lucide-react";

function whatsappHref(phone: string | undefined | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits.startsWith("0") ? `92${digits.slice(1)}` : digits}`;
}

export default function DashboardCalendar() {
  const { bakerId } = useBuyerSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Fetch all orders for this baker
  const { data: orders, isLoading } = useListOrders(
    { bakerId },
    { query: { enabled: !!bakerId, queryKey: getListOrdersQueryKey({ bakerId }), ...liveDashboardQuery(ORDERS_POLL_MS) } }
  );

  // Fetch baker config for capacity caps and date blocking
  const { data: baker } = useGetBaker(bakerId, {
    query: { enabled: !!bakerId, queryKey: getGetBakerQueryKey(bakerId) },
  });
  const maxOrders = baker?.maxOrdersPerDay ?? 10;
  const blockedDates = (baker as any)?.agentConfig?.blockedDates ?? [];

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Filter orders by delivery date (YYYY-MM-DD)
  const getOrdersForDay = (day: Date) => {
    return orders?.filter((order) => {
      if (!order.deliveryDate) return false;
      const orderDate = new Date(order.deliveryDate);
      return isSameDay(day, orderDate);
    }) ?? [];
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold font-serif text-primary">Order Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">Track cake deliveries and custom baking deadlines</p>
          </div>
          <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-xl shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="font-serif font-bold text-lg min-w-36 text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-muted rounded-2xl w-full"></div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center py-3">
              {weekDays.map((wd) => (
                <div key={wd} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 grid-rows-6 min-h-[500px]">
              {days.map((day, idx) => {
                const dayOrders = getOrdersForDay(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const dayStr = format(day, "yyyy-MM-dd");
                const isBlocked = blockedDates.includes(dayStr);
                const isOverCap = dayOrders.length >= maxOrders;

                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    aria-label={`${format(day, "MMMM d, yyyy")}: ${dayOrders.length} ${dayOrders.length === 1 ? "order" : "orders"}${isBlocked ? ", blocked" : ""}`}
                    className={`group relative flex min-h-24 flex-col border-b border-r border-border p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                      isBlocked
                        ? "bg-red-50/30 dark:bg-red-950/5 text-red-900/60"
                        : isCurrentMonth
                        ? "bg-card hover:bg-accent/35"
                        : "bg-muted/10 text-muted-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-semibold ${
                        isBlocked 
                          ? "text-red-600 dark:text-red-400 font-bold" 
                          : isCurrentMonth 
                          ? "text-foreground" 
                          : "text-muted-foreground/50"
                      }`}>
                        {format(day, "d")}
                      </span>
                      
                      {isBlocked && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 font-bold inline-flex items-center gap-0.5" title="Date blocked by baker">
                          <Ban className="w-2.5 h-2.5" /> Blocked
                        </span>
                      )}

                      {!isBlocked && dayOrders.length > 0 && (
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          isOverCap 
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" 
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
                        }`} title={`Orders booked: ${dayOrders.length}/${maxOrders}`}>
                          {isOverCap ? "Full" : `${dayOrders.length} ${dayOrders.length === 1 ? "order" : "orders"}`}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-end gap-2 py-1">
                      {dayOrders.length > 0 ? (
                        <>
                          <div className="flex flex-wrap items-center gap-1" aria-hidden="true">
                            {dayOrders.slice(0, 5).map((order) => (
                              <span
                                key={order.id}
                                className={`h-2.5 w-2.5 rounded-full ring-2 ring-card ${
                                  order.status === "delivered"
                                    ? "bg-green-500"
                                    : order.status === "cancelled"
                                    ? "bg-red-500"
                                    : order.status === "in_production"
                                    ? "bg-secondary"
                                    : "bg-primary"
                                }`}
                              />
                            ))}
                            {dayOrders.length > 5 && <span className="text-[10px] font-bold text-muted-foreground">+{dayOrders.length - 5}</span>}
                          </div>
                          <span className="text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">View orders</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60">No orders</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day order list */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="day-orders-title">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Delivery schedule</p>
                <h2 id="day-orders-title" className="mt-1 font-serif text-2xl font-bold">{format(selectedDay, "EEEE, MMMM d")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getOrdersForDay(selectedDay).length} {getOrdersForDay(selectedDay).length === 1 ? "order" : "orders"} scheduled
                </p>
              </div>
              <button type="button" aria-label="Close order list" onClick={() => setSelectedDay(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6">
              {getOrdersForDay(selectedDay).length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 font-semibold">No deliveries scheduled</p>
                  <p className="mt-1 text-sm text-muted-foreground">This date is currently free for new orders.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {getOrdersForDay(selectedDay).map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedOrder(order); setSelectedDay(null); }}
                        className="flex w-full items-center gap-4 rounded-xl border border-border bg-background/60 p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><ShoppingBag className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">#{order.id} · {order.buyerName}</span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">{order.buyerArea || "Area not set"} · {order.paymentStatus}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-sm font-bold">PKR {order.totalPkr.toLocaleString()}</span>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            order.status === "delivered" ? "bg-green-100 text-green-800" : order.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-primary/10 text-primary"
                          }`}>{order.status.replace(/_/g, " ")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Details Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-xl font-bold text-primary">Delivery Details (Order #{selectedOrder.id})</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span><strong>Delivery Date:</strong> {selectedOrder.deliveryDate ? format(new Date(selectedOrder.deliveryDate), "PPP") : "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span><strong>Contact:</strong> {selectedOrder.buyerName} ({selectedOrder.buyerWhatsapp})</span>
                {whatsappHref(selectedOrder.buyerWhatsapp) && (
                  <a
                    href={whatsappHref(selectedOrder.buyerWhatsapp)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Open WhatsApp chat with ${selectedOrder.buyerName}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Message
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span><strong>Address:</strong> {selectedOrder.buyerAddress} ({selectedOrder.buyerArea || "No Area"})</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>
                  <strong>Total Value:</strong> PKR {selectedOrder.totalPkr.toLocaleString()}{" "}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedOrder.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {selectedOrder.paymentStatus.toUpperCase()}
                  </span>
                </span>
              </div>
              
              {/* Customization Details */}
              {(selectedOrder.flavour || selectedOrder.textOnCake || selectedOrder.specialInstructions) && (
                <div className="border-t border-border pt-3 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customization Specs</h4>
                  {selectedOrder.flavour && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary/70" />
                      <span><strong>Flavour:</strong> {selectedOrder.flavour}</span>
                    </div>
                  )}
                  {selectedOrder.textOnCake && (
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary/70" />
                      <span><strong>Text on Cake:</strong> "{selectedOrder.textOnCake}"</span>
                    </div>
                  )}
                  {selectedOrder.specialInstructions && (
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded border border-border">
                      <strong>Instructions:</strong> {selectedOrder.specialInstructions}
                    </p>
                  )}
                </div>
              )}

              {/* Advance Payment Details */}
              {selectedOrder.requireAdvance && (
                <div className="border-t border-border pt-3 space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advance Payment Status</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span>Deposit status:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      selectedOrder.advancePaid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {selectedOrder.advancePaid ? "PAID (Verified)" : "PENDING DEPOSIT"}
                    </span>
                  </div>
                  {selectedOrder.paymentScreenshotUrl && (
                    <div className="mt-2 space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground block">Receipt / Design Reference Image:</span>
                      <div className="border border-border rounded-lg overflow-hidden bg-muted p-1">
                        {selectedOrder.paymentScreenshotUrl.startsWith("http") ? (
                          <a href={selectedOrder.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="block relative group cursor-zoom-in">
                            <img 
                              src={selectedOrder.paymentScreenshotUrl} 
                              alt="Payment Proof or reference design" 
                              className="w-full max-h-48 object-contain rounded-md"
                              onError={(e) => {
                                (e.target as any).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                              Open Full Size
                            </div>
                          </a>
                        ) : (
                          <div className="p-2 text-xs font-mono select-all truncate bg-background rounded border border-border">
                            {selectedOrder.paymentScreenshotUrl}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full bg-primary text-primary-foreground py-2 rounded-xl font-bold hover:bg-primary/90 transition-all cursor-pointer mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

