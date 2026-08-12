import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BAKER_GUIDE_SECTIONS } from "@/lib/baker-guide";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Grid2X2,
  Settings,
  Share2,
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";
import { Link } from "wouter";

const quickStart = [
  {
    number: "01",
    title: "Kitchen details",
    text: "Add your WhatsApp number, city, delivery areas and pickup rules.",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    number: "02",
    title: "Menu",
    text: "Publish a real item with price, lead time, allergens and availability.",
    href: "/dashboard/catalog",
    icon: Grid2X2,
  },
  {
    number: "03",
    title: "Payments",
    text: "Add account details and decide how much advance you normally require.",
    href: "/dashboard/settings",
    icon: WalletCards,
  },
  {
    number: "04",
    title: "Assistant rules",
    text: "Set your greeting, policies, hours and human-escalation rules.",
    href: "/dashboard/agent-hub",
    icon: Bot,
  },
  {
    number: "05",
    title: "Test the AI",
    text: "Ask real customer questions until the answers match how your bakery works.",
    href: "/dashboard/agent-hub",
    icon: Sparkles,
  },
  {
    number: "06",
    title: "Preview your shop",
    text: "Open the public storefront on mobile and place one complete test order.",
    href: "/dashboard",
    icon: Store,
  },
  {
    number: "07",
    title: "Share only when ready",
    text: "Once the test works, share the storefront/menu link or QR with customers.",
    href: "/dashboard/agent-hub",
    icon: Share2,
  },
];

export default function DashboardGuide() {
  const welcome = useMemo(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("welcome") === "1",
    [],
  );
  const [openId, setOpenId] = useState(
    welcome ? "first-15-minutes" : BAKER_GUIDE_SECTIONS[0]?.id ?? "",
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <BookOpen className="h-4 w-4" /> Baker guide
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                {welcome ? "Welcome to Sweet Tooth" : "How to use Sweet Tooth"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                {welcome
                  ? "Your account is ready. Complete these steps before you send your storefront to real customers."
                  : "Use this as your operating manual whenever you need to set up, test or run the bakery workspace."}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Go to overview <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {welcome && (
            <section className="mb-8 overflow-hidden rounded-[1.75rem] border border-primary/15 bg-[#2f1837] text-white shadow-lg">
              <div className="grid gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7b7c9]">
                    New bakery setup
                  </p>
                  <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
                    Set it up once.
                    <br />
                    Let Sweet Tooth remember it.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
                    The assistant can only be as accurate as the menu, prices and policies you give it. Finish the setup before you invite customers.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 className="h-4 w-4 text-[#e7b7c9]" />
                    Best first test
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    Ask: “Can I get a 2kg chocolate cake tomorrow in my delivery area?” Then check that price, availability, delivery and lead time match your real bakery.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="mb-9">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Start here</p>
              <h2 className="mt-1 font-serif text-2xl font-bold">Your setup path</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow these in order. You do not need to configure everything on day one.
              </p>
            </div>

            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickStart.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.number}>
                    <Link
                      href={item.href}
                      className="group flex h-full min-h-[160px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-black tracking-[0.16em] text-primary/45">
                          {item.number}
                        </span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <h3 className="mt-5 font-serif text-lg font-bold">{item.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-5 text-muted-foreground">{item.text}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
                        Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <section>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Detailed guide</p>
              <h2 className="mt-1 font-serif text-2xl font-bold">When you need the details</h2>
            </div>

            <div className="grid gap-3">
              {BAKER_GUIDE_SECTIONS.map((section) => {
                const open = openId === section.id;
                return (
                  <article
                    key={section.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? "" : section.id)}
                      className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/30 sm:p-5"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                        {open ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-lg font-bold">{section.title}</h3>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{section.summary}</p>
                      </div>
                      {open ? (
                        <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {open && (
                      <ol className="border-t border-border px-5 py-5 sm:px-7">
                        {section.steps.map((step, index) => (
                          <li key={step} className="flex gap-3 py-2 text-sm leading-6 text-muted-foreground">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/8 text-[10px] font-black text-primary">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <div className="mt-8 rounded-2xl border border-border bg-muted/35 p-5 text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/contact" className="font-bold text-primary hover:underline">
              Contact the Sweet Tooth team
            </Link>
            . During the pilot, report anything confusing — onboarding friction is product feedback too.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}