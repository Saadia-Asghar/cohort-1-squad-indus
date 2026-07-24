export type KhataPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type KhataDateRange = {
  period: KhataPeriod | "custom_month" | "custom_year";
  startDate: string;
  endDate: string;
  label: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function resolveKhataDateRange(query: {
  period?: string;
  month?: string;
  year?: string;
}): KhataDateRange {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    const [y, m] = query.month.split("-").map(Number);
    const startDate = `${y}-${pad(m)}-01`;
    const endDate = `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`;
    const label = new Date(y, m - 1, 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
    return { period: "custom_month", startDate, endDate, label };
  }

  if (query.year && /^\d{4}$/.test(query.year)) {
    const y = Number(query.year);
    return {
      period: "custom_year",
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      label: String(y),
    };
  }

  const period = (["daily", "weekly", "monthly", "yearly"].includes(query.period ?? "")
    ? query.period
    : "monthly") as KhataPeriod;

  if (period === "daily") {
    return { period, startDate: todayStr, endDate: todayStr, label: "Today" };
  }

  if (period === "weekly") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return {
      period,
      startDate: start.toISOString().slice(0, 10),
      endDate: todayStr,
      label: "Last 7 days",
    };
  }

  if (period === "yearly") {
    const y = today.getFullYear();
    return {
      period,
      startDate: `${y}-01-01`,
      endDate: todayStr,
      label: `${y} (year to date)`,
    };
  }

  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const startDate = `${y}-${pad(m)}-01`;
  const label = today.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  return { period: "monthly", startDate, endDate: todayStr, label };
}
