import {
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  getGetBakerQueryKey,
  getListOrdersQueryKey,
  useGetBaker,
  useListOrders,
} from "@workspace/api-client-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gift,
  Gauge,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBuyerSession } from "@/hooks/use-session";
import {
  liveDashboardQuery,
  ORDERS_POLL_MS,
} from "@/lib/dashboard-query";

function whatsappHref(
  phone: string | undefined | null,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");

  if (digits.length < 8) {
    return null;
  }

  return `https://wa.me/${
    digits.startsWith("0")
      ? `92${digits.slice(1)}`
      : digits
  }`;
}

function parseDeliveryDate(
  value?: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function dayKey(day: Date): string {
  return format(day, "yyyy-MM-dd");
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function statusStyle(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-[#e4f3e8] text-[#168a55]";

    case "cancelled":
      return "bg-[#f8dddd] text-[#a7313b]";

    case "in_production":
      return "bg-[#fff0dd] text-[#b86a24]";

    case "ready":
      return "bg-[#f1dde5] text-[#8e345c]";

    case "out_for_delivery":
      return "bg-[#e7edf8] text-[#3f5f92]";

    default:
      return "bg-[#eee5f1] text-[#632a73]";
  }
}

function statusDot(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-[#168a55]";

    case "cancelled":
      return "bg-[#a7313b]";

    case "in_production":
      return "bg-[#b86a24]";

    case "ready":
      return "bg-[#c24f7a]";

    case "out_for_delivery":
      return "bg-[#3f5f92]";

    default:
      return "bg-[#632a73]";
  }
}

export default function DashboardCalendar() {
  const { bakerId } = useBuyerSession();

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedDay, setSelectedDay] =
    useState<Date | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<any>(null);

  const { data: orders, isLoading } =
    useListOrders(
      { bakerId },
      {
        query: {
          enabled: Boolean(bakerId),
          queryKey: getListOrdersQueryKey({
            bakerId,
          }),
          ...liveDashboardQuery(ORDERS_POLL_MS),
        },
      },
    );

  const { data: baker } = useGetBaker(
    bakerId,
    {
      query: {
        enabled: Boolean(bakerId),
        queryKey: getGetBakerQueryKey(bakerId),
      },
    },
  );

  const allOrders = orders ?? [];

  const maxOrders = Math.max(
    baker?.maxOrdersPerDay ?? 10,
    1,
  );

  const blockedDates: string[] =
    (baker as any)?.agentConfig
      ?.blockedDates ?? [];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const currentMonthDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  const weekDays = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const getOrdersForDay = (day: Date) =>
    allOrders.filter((order) => {
      const orderDate = parseDeliveryDate(
        order.deliveryDate,
      );

      return (
        orderDate !== null &&
        isSameDay(day, orderDate)
      );
    });

  const monthOrders = useMemo(
    () =>
      allOrders.filter((order) => {
        const orderDate = parseDeliveryDate(
          order.deliveryDate,
        );

        return (
          orderDate !== null &&
          isSameMonth(orderDate, currentDate)
        );
      }),
    [allOrders, currentDate],
  );

  const activeMonthOrders = monthOrders.filter(
    (order) =>
      order.status !== "delivered" &&
      order.status !== "cancelled",
  );

  const deliveredMonthOrders =
    monthOrders.filter(
      (order) => order.status === "delivered",
    );

  const fullDays = currentMonthDays.filter(
    (day) =>
      getOrdersForDay(day).length >= maxOrders,
  ).length;

  const blockedDaysThisMonth =
    currentMonthDays.filter((day) =>
      blockedDates.includes(dayKey(day)),
    ).length;

  const selectedDayOrders = selectedDay
    ? getOrdersForDay(selectedDay)
    : [];

  const selectedDayBlocked = selectedDay
    ? blockedDates.includes(dayKey(selectedDay))
    : false;

  const selectedCapacityPercentage = Math.min(
    100,
    (selectedDayOrders.length / maxOrders) * 100,
  );

  const goToPreviousMonth = () => {
    setCurrentDate((current) =>
      subMonths(current, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate((current) =>
      addMonths(current, 1),
    );
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c24f7a]">
                Orders / Schedule
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Order schedule
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746876]">
                Plan production, monitor daily capacity
                and review every delivery from one
                calendar.
              </p>
            </div>

            <div className="flex items-center rounded-xl border border-[#dfd1c4] bg-[#fffaf6] p-1">
              <button
                type="button"
                onClick={goToPreviousMonth}
                aria-label="Previous month"
                className="grid h-10 w-10 place-items-center rounded-lg text-[#746876] transition hover:bg-[#f1e9e2] hover:text-[#241629]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={goToCurrentMonth}
                className="min-w-[145px] rounded-lg px-3 py-2 text-center font-serif text-base font-semibold transition hover:bg-[#f1e9e2]"
              >
                {format(currentDate, "MMMM yyyy")}
              </button>

              <button
                type="button"
                onClick={goToNextMonth}
                aria-label="Next month"
                className="grid h-10 w-10 place-items-center rounded-lg text-[#746876] transition hover:bg-[#f1e9e2] hover:text-[#241629]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </header>

          <section className="grid border-b border-[#dfd1c4] sm:grid-cols-2 xl:grid-cols-4">
            <ScheduleMetric
              icon={CalendarDays}
              label="Monthly deliveries"
              value={monthOrders.length
                .toString()
                .padStart(2, "0")}
            />

            <ScheduleMetric
              icon={Clock3}
              label="Active orders"
              value={activeMonthOrders.length
                .toString()
                .padStart(2, "0")}
              valueClass="text-[#b86a24]"
            />

            <ScheduleMetric
              icon={PackageCheck}
              label="Delivered"
              value={deliveredMonthOrders.length
                .toString()
                .padStart(2, "0")}
              valueClass="text-[#168a55]"
            />

            <ScheduleMetric
              icon={Gauge}
              label="Daily capacity"
              value={`${maxOrders} orders`}
              valueClass="text-[#632a73]"
            />
          </section>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <main className="min-w-0">
              <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                <div className="flex flex-col gap-3 border-b border-[#dfd1c4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-semibold">
                      {format(
                        currentDate,
                        "MMMM 'schedule'",
                      )}
                    </h2>

                    <p className="mt-1 text-xs text-[#746876]">
                      Select any date to review its
                      orders and available capacity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={goToCurrentMonth}
                    className="min-h-10 rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-4 text-xs font-semibold text-[#632a73] transition hover:bg-[#f1e9e2]"
                  >
                    Today
                  </button>
                </div>

                {isLoading && !orders ? (
                  <div className="space-y-3 p-4">
                    <div className="h-[560px] animate-pulse rounded-2xl bg-[#f1e9e2]" />
                  </div>
                ) : (
                  <>
                    <div className="md:hidden">
                      <div className="grid grid-cols-7 border-b border-[#dfd1c4] bg-[#fffaf6]">
                        {weekDays.map((weekday) => (
                          <div
                            key={weekday}
                            className="px-1 py-2 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#9b8d9c]"
                          >
                            {weekday.charAt(0)}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7">
                        {calendarDays.map((day) => {
                          const dayOrders =
                            getOrdersForDay(day);

                          const currentMonth =
                            isSameMonth(
                              day,
                              currentDate,
                            );

                          const blocked =
                            blockedDates.includes(
                              dayKey(day),
                            );

                          const full =
                            dayOrders.length >=
                            maxOrders;

                          const today = isToday(day);

                          return (
                            <button
                              type="button"
                              key={dayKey(day)}
                              onClick={() =>
                                setSelectedDay(day)
                              }
                              aria-label={`${format(
                                day,
                                "MMMM d, yyyy",
                              )}: ${
                                dayOrders.length
                              } ${
                                dayOrders.length === 1
                                  ? "order"
                                  : "orders"
                              }${
                                blocked
                                  ? ", blocked"
                                  : ""
                              }`}
                              className={`relative flex min-h-14 flex-col items-center justify-center border-b border-r border-[#eadfd5] px-1 py-2 transition ${
                                currentMonth
                                  ? "bg-white/30"
                                  : "bg-[#f3ece6] text-[#b3a8b3]"
                              } ${
                                blocked
                                  ? "bg-[#fff0ee]"
                                  : ""
                              }`}
                            >
                              <span
                                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${
                                  today
                                    ? "bg-[#632a73] text-white"
                                    : blocked
                                      ? "text-[#a7313b]"
                                      : ""
                                }`}
                              >
                                {format(day, "d")}
                              </span>

                              <div className="mt-1 flex min-h-2 items-center gap-0.5">
                                {blocked ? (
                                  <Ban className="h-2.5 w-2.5 text-[#a7313b]" />
                                ) : dayOrders.length >
                                  0 ? (
                                  <>
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        full
                                          ? "bg-[#b86a24]"
                                          : "bg-[#c24f7a]"
                                      }`}
                                    />

                                    <span className="text-[8px] font-semibold">
                                      {
                                        dayOrders.length
                                      }
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <div className="grid grid-cols-7 border-b border-[#dfd1c4] bg-[#fffaf6]">
                        {weekDays.map((weekday) => (
                          <div
                            key={weekday}
                            className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]"
                          >
                            {weekday}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7">
                        {calendarDays.map((day) => {
                          const dayOrders =
                            getOrdersForDay(day);

                          const currentMonth =
                            isSameMonth(
                              day,
                              currentDate,
                            );

                          const blocked =
                            blockedDates.includes(
                              dayKey(day),
                            );

                          const full =
                            dayOrders.length >=
                            maxOrders;

                          const today = isToday(day);

                          return (
                            <button
                              type="button"
                              key={dayKey(day)}
                              onClick={() =>
                                setSelectedDay(day)
                              }
                              aria-label={`${format(
                                day,
                                "MMMM d, yyyy",
                              )}: ${
                                dayOrders.length
                              } ${
                                dayOrders.length === 1
                                  ? "order"
                                  : "orders"
                              }${
                                blocked
                                  ? ", blocked"
                                  : ""
                              }`}
                              className={`group relative flex min-h-[132px] flex-col border-b border-r border-[#eadfd5] p-2.5 text-left transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c24f7a] ${
                                currentMonth
                                  ? "bg-white/25 hover:bg-[#fff8f3]"
                                  : "bg-[#f3ece6]/70 text-[#afa3af]"
                              } ${
                                blocked
                                  ? "bg-[#fff0ee]"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold ${
                                    today
                                      ? "bg-[#632a73] text-white"
                                      : blocked
                                        ? "text-[#a7313b]"
                                        : currentMonth
                                          ? "text-[#241629]"
                                          : ""
                                  }`}
                                >
                                  {format(day, "d")}
                                </span>

                                {blocked ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#f8dddd] px-2 py-1 text-[8px] font-semibold text-[#a7313b]">
                                    <Ban className="h-2.5 w-2.5" />
                                    Blocked
                                  </span>
                                ) : dayOrders.length >
                                  0 ? (
                                  <span
                                    className={`rounded-lg px-2 py-1 text-[8px] font-semibold ${
                                      full
                                        ? "bg-[#fff0dd] text-[#b86a24]"
                                        : "bg-[#f1dde5] text-[#8e345c]"
                                    }`}
                                  >
                                    {full
                                      ? "At capacity"
                                      : `${
                                          dayOrders.length
                                        } ${
                                          dayOrders.length ===
                                          1
                                            ? "order"
                                            : "orders"
                                        }`}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-hidden">
                                {dayOrders
                                  .slice(0, 2)
                                  .map((order) => (
                                    <span
                                      key={order.id}
                                      className="flex min-w-0 items-center gap-2 rounded-lg bg-[#fffaf6] px-2 py-1.5"
                                    >
                                      <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${statusDot(
                                          order.status,
                                        )}`}
                                      />

                                      <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-[#4d404e]">
                                        #{order.id} Â·{" "}
                                        {
                                          order.buyerName
                                        }
                                      </span>
                                    </span>
                                  ))}

                                {dayOrders.length > 2 ? (
                                  <span className="block px-1 text-[9px] font-semibold text-[#c24f7a]">
                                    +
                                    {dayOrders.length - 2}{" "}
                                    more
                                  </span>
                                ) : null}
                              </div>

                              <span className="mt-2 text-[9px] font-semibold text-[#c24f7a] opacity-0 transition group-hover:opacity-100">
                                Review day
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </section>
            </main>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
                <h2 className="font-serif text-xl font-semibold">
                  Month summary
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#746876]">
                  Capacity and availability for{" "}
                  {format(currentDate, "MMMM")}.
                </p>

                <div className="mt-5 space-y-4">
                  <SummaryRow
                    label="Scheduled orders"
                    value={monthOrders.length}
                  />

                  <SummaryRow
                    label="Active orders"
                    value={activeMonthOrders.length}
                  />

                  <SummaryRow
                    label="Full-capacity days"
                    value={fullDays}
                    warning={fullDays > 0}
                  />

                  <SummaryRow
                    label="Blocked dates"
                    value={blockedDaysThisMonth}
                    warning={
                      blockedDaysThisMonth > 0
                    }
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-[#e5cfd9] bg-[#fff0f5] p-4">
                <Sparkles className="h-5 w-5 text-[#c24f7a]" />

                <h2 className="mt-3 font-serif text-xl font-semibold">
                  Capacity guide
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#746876]">
                  A day is marked at capacity once it
                  reaches {maxOrders} scheduled orders.
                  Blocked dates come from your bakery
                  availability settings.
                </p>
              </section>

              <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
                <h2 className="font-serif text-xl font-semibold">
                  Order status
                </h2>

                <div className="mt-4 space-y-3">
                  <StatusLegend
                    label="New / confirmed"
                    dotClass="bg-[#632a73]"
                  />

                  <StatusLegend
                    label="In production"
                    dotClass="bg-[#b86a24]"
                  />

                  <StatusLegend
                    label="Ready"
                    dotClass="bg-[#c24f7a]"
                  />

                  <StatusLegend
                    label="Out for delivery"
                    dotClass="bg-[#3f5f92]"
                  />

                  <StatusLegend
                    label="Delivered"
                    dotClass="bg-[#168a55]"
                  />

                  <StatusLegend
                    label="Cancelled"
                    dotClass="bg-[#a7313b]"
                  />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {selectedDay ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241629]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-orders-title"
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#dfd1c4] bg-[#fbf6ee] text-[#241629] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#dfd1c4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c24f7a]">
                  Delivery schedule
                </p>

                <h2
                  id="day-orders-title"
                  className="mt-2 font-serif text-3xl font-semibold"
                >
                  {format(
                    selectedDay,
                    "EEEE, d MMMM",
                  )}
                </h2>

                <p className="mt-2 text-sm text-[#746876]">
                  {selectedDayOrders.length}{" "}
                  {selectedDayOrders.length === 1
                    ? "order"
                    : "orders"}{" "}
                  scheduled
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDay(null)
                }
                aria-label="Close daily schedule"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-[#dfd1c4] px-5 py-4 sm:px-6">
              {selectedDayBlocked ? (
                <div className="flex gap-3 rounded-2xl border border-[#efc3c0] bg-[#fff0ee] px-4 py-3">
                  <Ban className="mt-0.5 h-5 w-5 shrink-0 text-[#a7313b]" />

                  <div>
                    <p className="text-sm font-semibold text-[#a7313b]">
                      This date is blocked
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#746876]">
                      Your bakery availability settings
                      currently prevent new bookings on
                      this date.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      Daily capacity
                    </span>

                    <span className="font-mono text-[#746876]">
                      {selectedDayOrders.length}/
                      {maxOrders} orders
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadfd5]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedDayOrders.length >=
                        maxOrders
                          ? "bg-[#b86a24]"
                          : "bg-[#c24f7a]"
                      }`}
                      style={{
                        width: `${selectedCapacityPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-4 sm:p-6">
              {selectedDayOrders.length === 0 ? (
                <div className="grid min-h-[260px] place-items-center text-center">
                  <div>
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                      <CalendarDays className="h-6 w-6" />
                    </span>

                    <h3 className="mt-4 font-serif text-2xl font-semibold">
                      No deliveries scheduled
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#746876]">
                      This date is currently free for
                      new orders.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayOrders.map(
                    (order) => (
                      <button
                        type="button"
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedDay(null);
                        }}
                        className="grid w-full gap-4 rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4 text-left transition hover:border-[#d5a8bb] hover:bg-white sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1dde5] text-[#632a73]">
                          <ShoppingBag className="h-5 w-5" />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate font-serif text-lg font-semibold">
                            #{order.id} Â·{" "}
                            {order.buyerName}
                          </span>

                          <span className="mt-1 block truncate text-xs text-[#746876]">
                            {order.buyerArea ||
                              "Area not recorded"}{" "}
                            Â·{" "}
                            {order.paymentStatus ===
                            "paid"
                              ? "Payment collected"
                              : "Payment pending"}
                          </span>
                        </span>

                        <span className="flex items-end justify-between gap-3 sm:block sm:text-right">
                          <span className="block font-mono text-sm font-semibold">
                            PKR{" "}
                            {order.totalPkr.toLocaleString()}
                          </span>

                          <span
                            className={`mt-2 inline-block rounded-lg px-2.5 py-1 text-[9px] font-semibold ${statusStyle(
                              order.status,
                            )}`}
                          >
                            {formatStatus(
                              order.status,
                            )}
                          </span>
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241629]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-details-title"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl border border-[#dfd1c4] bg-[#fbf6ee] text-[#241629] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#dfd1c4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c24f7a]">
                  Delivery details
                </p>

                <h2
                  id="order-details-title"
                  className="mt-2 font-serif text-3xl font-semibold"
                >
                  Order #{selectedOrder.id}
                </h2>

                <span
                  className={`mt-3 inline-block rounded-lg px-2.5 py-1 text-[9px] font-semibold ${statusStyle(
                    selectedOrder.status,
                  )}`}
                >
                  {formatStatus(
                    selectedOrder.status,
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                aria-label="Close order details"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  icon={CalendarDays}
                  label="Delivery date"
                  value={
                    parseDeliveryDate(
                      selectedOrder.deliveryDate,
                    )
                      ? format(
                          parseDeliveryDate(
                            selectedOrder.deliveryDate,
                          )!,
                          "EEEE, d MMMM yyyy",
                        )
                      : "Date not recorded"
                  }
                />

                <DetailCard
                  icon={CircleDollarSign}
                  label="Order value"
                  value={`PKR ${selectedOrder.totalPkr.toLocaleString()}`}
                  detail={
                    selectedOrder.paymentStatus ===
                    "paid"
                      ? "Payment collected"
                      : "Payment pending"
                  }
                />

                <DetailCard
                  icon={Phone}
                  label="Customer"
                  value={selectedOrder.buyerName}
                  detail={
                    selectedOrder.buyerWhatsapp ||
                    "Phone not recorded"
                  }
                />

                <DetailCard
                  icon={MapPin}
                  label="Delivery address"
                  value={
                    selectedOrder.buyerArea ||
                    "Area not recorded"
                  }
                  detail={
                    selectedOrder.buyerAddress ||
                    "Address not recorded"
                  }
                />
              </div>

              {whatsappHref(
                selectedOrder.buyerWhatsapp,
              ) ? (
                <a
                  href={
                    whatsappHref(
                      selectedOrder.buyerWhatsapp,
                    )!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#168a55] px-4 text-sm font-semibold text-white transition hover:bg-[#117347]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message customer on WhatsApp
                </a>
              ) : null}

              {selectedOrder.flavour ||
              selectedOrder.textOnCake ||
              selectedOrder.specialInstructions ? (
                <section className="mt-5 rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4">
                  <h3 className="font-serif text-xl font-semibold">
                    Customization
                  </h3>

                  <div className="mt-4 space-y-3">
                    {selectedOrder.flavour ? (
                      <DetailLine
                        icon={Tag}
                        label="Flavour"
                        value={
                          selectedOrder.flavour
                        }
                      />
                    ) : null}

                    {selectedOrder.textOnCake ? (
                      <DetailLine
                        icon={Gift}
                        label="Cake message"
                        value={`"${selectedOrder.textOnCake}"`}
                      />
                    ) : null}

                    {selectedOrder.specialInstructions ? (
                      <div className="rounded-xl bg-[#f1e9e2] px-4 py-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
                          Special instructions
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#4d404e]">
                          {
                            selectedOrder.specialInstructions
                          }
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {selectedOrder.requireAdvance ? (
                <section className="mt-5 rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-xl font-semibold">
                        Advance payment
                      </h3>

                      <p className="mt-1 text-xs text-[#746876]">
                        Deposit requirement for this
                        order.
                      </p>
                    </div>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-[9px] font-semibold ${
                        selectedOrder.advancePaid
                          ? "bg-[#e4f3e8] text-[#168a55]"
                          : "bg-[#f8dddd] text-[#a7313b]"
                      }`}
                    >
                      {selectedOrder.advancePaid
                        ? "Verified"
                        : "Pending deposit"}
                    </span>
                  </div>

                  {selectedOrder.paymentScreenshotUrl ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-[#dfd1c4] bg-white">
                      {selectedOrder.paymentScreenshotUrl.startsWith(
                        "http",
                      ) ? (
                        <a
                          href={
                            selectedOrder.paymentScreenshotUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block"
                        >
                          <img
                            src={
                              selectedOrder.paymentScreenshotUrl
                            }
                            alt="Payment receipt or design reference"
                            className="max-h-64 w-full object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />

                          <span className="absolute inset-x-0 bottom-0 bg-[#241629]/70 px-3 py-2 text-center text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                            Open full image
                          </span>
                        </a>
                      ) : (
                        <p className="select-all break-all p-3 font-mono text-xs text-[#746876]">
                          {
                            selectedOrder.paymentScreenshotUrl
                          }
                        </p>
                      )}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <div className="border-t border-[#dfd1c4] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="min-h-11 w-full rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function ScheduleMetric({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border-[#dfd1c4] px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-[#746876]">
        <Icon className="h-5 w-5 text-[#c24f7a]" />

        <span className="text-[11px] font-medium">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 whitespace-nowrap font-mono text-2xl font-semibold tracking-[-0.03em] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[#746876]">
        {label}
      </span>

      <span
        className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold ${
          warning
            ? "bg-[#fff0dd] text-[#b86a24]"
            : "bg-[#f1e9e2] text-[#632a73]"
        }`}
      >
        {value.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

function StatusLegend({
  label,
  dotClass,
}: {
  label: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
      />

      <span className="text-xs text-[#746876]">
        {label}
      </span>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] p-4">
      <Icon className="h-4 w-4 text-[#c24f7a]" />

      <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>

      {detail ? (
        <p className="mt-1 text-xs leading-5 text-[#746876]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1dde5] text-[#c24f7a]">
        <Icon className="h-4 w-4" />
      </span>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#9b8d9c]">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  );
}