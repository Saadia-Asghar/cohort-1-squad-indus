import { useState, type FormEvent } from "react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { Link, useLocation } from "wouter";

export default function OpenSharedMenu() {
  const [, setLocation] = useLocation();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openMenu = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const raw = value.trim();
    const fromUrl = raw.match(/\/(?:menu|bakers)\/([^/?#]+)/i);
    const token = (fromUrl?.[1] ?? raw).replace(/^#/, "");
    const id = Number(token);
    if (Number.isInteger(id) && id > 0) {
      setLocation(`/menu/${id}`);
      return;
    }
    setError("Paste the menu link your baker sent, or the number from /menu/12.");
  };

  return (
    <BuyerLayout>
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Shared menu</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-foreground">Open a bakery menu you were sent</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sweet Tooth is not a shopper mall. Customers do not browse every bakery. If a baker shared their menu, WhatsApp, or Instagram with you, open that link here.
        </p>
        <form onSubmit={openMenu} className="mt-8 space-y-3">
          <input
            className="h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="https://…/menu/12"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">
            Open menu
          </button>
        </form>
        <p className="mt-8 text-sm text-muted-foreground">
          Are you a baker?{" "}
          <Link href="/dashboard/register" className="font-semibold text-primary">
            Share your own menu from the dashboard
          </Link>
          .
        </p>
      </div>
    </BuyerLayout>
  );
}
