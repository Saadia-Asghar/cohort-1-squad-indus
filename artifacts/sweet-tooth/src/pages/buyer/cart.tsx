import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { GuestMenuShell } from "@/components/layout/guest-menu-shell";

function lastBakerId(): number | null {
  try {
    const parsed = JSON.parse(localStorage.getItem("sweet_tooth_guest_baker") || "null") as { bakerId?: number };
    return Number.isInteger(parsed?.bakerId) && (parsed.bakerId ?? 0) > 0 ? parsed.bakerId! : null;
  } catch {
    return null;
  }
}

export default function Cart() {
  const [, navigate] = useLocation();
  const bakerId = lastBakerId();
  const href = bakerId ? `/menu/${bakerId}` : "/";

  useEffect(() => {
    navigate(href, { replace: true });
  }, [href, navigate]);

  return (
    <GuestMenuShell bakerId={bakerId}>
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">Book with the assistant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no bag. Open the menu and confirm in chat — the bakery gets the order on the dashboard.
        </p>
        <Link href={href} className="mt-6 inline-block font-semibold text-primary underline">
          Open menu
        </Link>
      </div>
    </GuestMenuShell>
  );
}
