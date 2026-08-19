import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function GuestMenuShell({
  bakerName,
  bakerId,
  children,
}: {
  bakerName?: string | null;
  bakerId?: number | null;
  children: React.ReactNode;
}) {
  const menuHref = bakerId ? `/menu/${bakerId}` : "/";
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href={menuHref} className="flex min-w-0 items-center gap-2 font-serif text-lg font-bold hover:text-primary">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{bakerName || "Bakery menu"}</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-4 text-sm font-semibold">
            {bakerId ? (
              <Link href={`/menu/${bakerId}`} className="hover:text-primary">
                Menu
              </Link>
            ) : null}
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
