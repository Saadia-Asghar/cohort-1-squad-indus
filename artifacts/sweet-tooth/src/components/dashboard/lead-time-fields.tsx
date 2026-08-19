import { Clock } from "lucide-react";
import { formatLeadTime } from "@/lib/shop-settings";

const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-secondary/60 focus:ring-4 focus:ring-secondary/10";

export function LeadTimeFields({
  days,
  hours,
  onDaysChange,
  onHoursChange,
}: {
  days: string;
  hours: string;
  onDaysChange: (value: string) => void;
  onHoursChange: (value: string) => void;
}) {
  const parsedDays = Number.parseInt(days, 10);
  const parsedHours = Number.parseInt(hours, 10);
  const preview = formatLeadTime(
    Number.isFinite(parsedDays) ? parsedDays : 0,
    Number.isFinite(parsedHours) ? parsedHours : 0,
  ) ?? "Ready in 1 day";

  return (
    <section className="rounded-xl border border-border bg-card/80 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-primary" />
        How long to make this
      </h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        Buyers and the chat assistant see this wait time. The first box is whole days after an order. The second box is extra hours on top (0–23).
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-foreground">Days</span>
          <span className="block text-xs text-muted-foreground">Whole days after the order</span>
          <input
            type="number"
            min={0}
            max={60}
            value={days}
            onChange={(event) => onDaysChange(event.target.value)}
            className={inputClass}
            aria-label="Lead time in days"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-foreground">Extra hours</span>
          <span className="block text-xs text-muted-foreground">0–23 hours on top of days</span>
          <input
            type="number"
            min={0}
            max={23}
            value={hours}
            onChange={(event) => onHoursChange(event.target.value)}
            placeholder="0"
            className={inputClass}
            aria-label="Extra lead time hours"
          />
        </label>
      </div>
      <p className="mt-3 text-sm font-medium text-primary">
        Buyers will see: {preview}
      </p>
    </section>
  );
}
