import { Link } from "wouter";
import { ArrowRight, Bot, CalendarDays, CheckCircle2, ClipboardCheck, MessageCircleMore, PackageCheck, ShieldCheck, Share2, UsersRound, WalletCards } from "lucide-react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { PricingSection } from "@/components/marketing/pricing-section";

const steps = [
  { icon: Share2, title: "Share your menu", text: "Add products, prices, dietary details and delivery areas once. Then put your link or QR code wherever customers find you." },
  { icon: Bot, title: "Let the agent answer", text: "The assistant answers from your menu and rules, captures the order details and flags any question that needs you." },
  { icon: ClipboardCheck, title: "Run the order clearly", text: "Set the due time, payment review, production checklist and delivery status from one place." },
];

const capabilities = [
  { icon: Bot, title: "Menu assistant", text: "Accurate answers about products, prices, flavours, dietary notes and availability." },
  { icon: MessageCircleMore, title: "Order agent", text: "Collects the details a baker needs before an order can move forward." },
  { icon: CalendarDays, title: "Delivery calendar", text: "Set lead time, blocked dates, delivery zones and daily capacity." },
  { icon: WalletCards, title: "Payment review", text: "Keep advance instructions and receipt checks next to the order." },
  { icon: UsersRound, title: "Customer profiles", text: "See order history, feedback and repeat-customer notes without hunting in chats." },
  { icon: PackageCheck, title: "Production checklist", text: "Track design, flavour, allergen flag, packing and rider hand-off." },
];

export default function Home() {
  return (
    <BuyerLayout>
      <section className="overflow-hidden bg-background px-4 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[.92fr_1.08fr] md:items-center">
          <div className="max-w-xl">
            <h1 className="font-serif text-5xl font-bold leading-[1.04] tracking-tight text-foreground md:text-7xl">Your orders, finally under control.</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">Sweet Tooth keeps bakery orders, customer questions and delivery details in one calm place—so you can spend less time in scattered chats and more time baking.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/register" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">Get started free <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-md border border-primary/45 bg-background px-5 py-3 text-sm font-bold text-primary hover:bg-primary/5">See how it works</a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-amber-600" /> Start with your menu. Connect channels when you are ready.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[630px]">
            <img src="/sweet-tooth-cake-hero.png" alt="Elegant custom birthday cake made by a home baker" className="aspect-[4/5] w-full rounded-3xl object-cover shadow-[0_24px_55px_rgba(55,27,70,.16)]" />
            <div className="absolute -bottom-7 right-4 w-[min(90%,320px)] rounded-2xl border border-border bg-card p-5 shadow-[0_18px_45px_rgba(55,27,70,.16)] sm:right-7">
              <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" /><div><p className="font-semibold text-foreground">One order, clear next step</p><p className="mt-1 text-sm text-muted-foreground">Menu answer → order details → payment review → bake checklist → delivery.</p></div></div>
              <Link href="/dashboard/register" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">Set up your bakery <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-card px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl"><h2 className="text-center font-serif text-4xl font-bold">How it works</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <article key={title} className="relative"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-serif text-lg font-bold text-primary">{index + 1}</span><Icon className="mt-5 h-8 w-8 text-amber-600" /><h3 className="mt-4 font-serif text-2xl font-bold">{title}</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <h2 className="font-serif text-4xl font-bold">Everything a baker needs</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">A practical workspace for the jobs that happen before, during and after every custom order.</p>
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-amber-600"><Icon className="h-5 w-5" /></span><div><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div></article>)}</div>
      </section>

      <section className="border-y border-border bg-muted/60 px-4 py-20"><div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[.9fr_1.1fr] md:items-center"><div><h2 className="font-serif text-4xl font-bold">Built to keep your answers honest.</h2><p className="mt-5 leading-relaxed text-muted-foreground">The assistant is grounded in the menu, availability, delivery areas and policies that you set. If it does not have the answer, it keeps the customer informed and brings the question back to you.</p><Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">Talk to the Sweet Tooth team <ArrowRight className="h-4 w-4" /></Link></div><div className="rounded-2xl border border-border bg-card p-7"><ShieldCheck className="h-8 w-8 text-primary" /><h3 className="mt-5 font-serif text-2xl font-bold">Your bakery. Your rules.</h3><ul className="mt-5 space-y-3 text-sm text-muted-foreground"><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Set dietary labels, product availability, lead times and delivery sectors.</li><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Review payment proof and decide whether an order is confirmed.</li><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> Keep sensitive payments and settings restricted to bakery owners.</li></ul></div></div></section>

      <PricingSection />

      <section className="bg-[hsl(266_55%_13%)] px-4 py-20 text-white"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div><h2 className="max-w-xl font-serif text-4xl font-bold leading-tight">Spend less time on messages. More time doing what you love.</h2><p className="mt-4 max-w-xl text-white/75">Create your bakery, set your menu and share one clear place for customers to order.</p></div><Link href="/dashboard/register" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.02]">Get started free <ArrowRight className="h-4 w-4" /></Link></div></section>
    </BuyerLayout>
  );
}
