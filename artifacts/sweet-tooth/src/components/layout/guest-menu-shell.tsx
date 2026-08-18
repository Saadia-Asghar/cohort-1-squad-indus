import { Link } from "wouter";

export function GuestMenuShell({
  bakerName,
  bakerId,
  children,
}: {
  bakerName?: string | null;
  bakerId?: number | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#241629]">
      <header className="border-b border-[#eadfce] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <p className="truncate font-serif text-lg font-bold">{bakerName || "Bakery menu"}</p>
          <nav className="flex shrink-0 items-center gap-4 text-sm font-semibold">
            {bakerId ? (
              <Link href={`/menu/${bakerId}`} className="hover:text-primary">
                Menu
              </Link>
            ) : null}
            <Link href="/cart" className="hover:text-primary">
              Bag
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

export function bakerMenuHref(bakerId: number): string {
  if (typeof window === "undefined") return `/menu/${bakerId}`;
  return `${window.location.origin}/menu/${bakerId}`;
}

export function openBakerMenu(bakerId: number): void {
  window.open(bakerMenuHref(bakerId), "_blank", "noopener,noreferrer");
}
