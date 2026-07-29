import { Link } from "wouter";
import { ArrowRight, Bot, CalendarDays, ClipboardCheck, MessageCircle, MessageCircleMore, PackageCheck, ShieldCheck, Share2, UsersRound, WalletCards } from "lucide-react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { PricingSection } from "@/components/marketing/pricing-section";
import { whatsappSupportLink } from "@/lib/support";

const steps = [
  { icon: Share2, title: "Share your menu", text: "One link for customers." },
  { icon: Bot, title: "Let the agent answer", text: "Answers from your rules." },
  { icon: ClipboardCheck, title: "Manage the order", text: "Keep every next step clear." },
];

const capabilities = [
  { icon: Bot, title: "Menu assistant", text: "Answers menu questions." },
  { icon: MessageCircleMore, title: "Order agent", text: "Captures order details." },
  { icon: CalendarDays, title: "Delivery calendar", text: "Plans your bake days." },
  { icon: WalletCards, title: "Payment review", text: "Checks advance proof." },
  { icon: UsersRound, title: "Customer profiles", text: "Remembers regulars." },
  { icon: PackageCheck, title: "Production checklist", text: "Keeps work on track." },
];

export default function Home() {
  return (
    <BuyerLayout>
      <section className="overflow-hidden bg-background px-4 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[.92fr_1.08fr] md:items-center">
          <div className="max-w-xl">
            <h1 className="font-serif text-5xl font-bold leading-[1.02] tracking-tight text-foreground md:text-7xl">Bake beautifully.<br />We&apos;ll organise the orders.</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">One menu, one assistant, one clear place for every order.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/register" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">Get started <ArrowRight className="h-4 w-4" /></Link>
              <a href={whatsappSupportLink("Assalam-o-Alaikum! I would like to book a Sweet Tooth demo for my bakery.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-green-600/30 bg-green-50 px-5 py-3 text-sm font-bold text-green-800 transition-colors hover:bg-green-100"><MessageCircle className="h-4 w-4" /> Book a demo</a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[630px]">
            <img src="/sweet-tooth-cake-hero.png" alt="Elegant custom birthday cake made by a home baker" className="aspect-[4/5] w-full rounded-3xl object-cover shadow-[0_24px_55px_rgba(55,27,70,.16)]" />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-card px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl"><h2 className="text-center font-serif text-4xl font-bold">How it works</h2><div className="mt-12 grid gap-8 md:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <article key={title} className="relative"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-serif text-lg font-bold text-primary">{index + 1}</span><Icon className="mt-5 h-8 w-8 text-amber-600" /><h3 className="mt-4 font-serif text-2xl font-bold">{title}</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <h2 className="font-serif text-4xl font-bold">Everything a baker needs</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">The essentials, in one place.</p>
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="group flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition-transform duration-200 group-hover:-translate-y-1"><Icon className="h-5 w-5" strokeWidth={1.8} /></span><div><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div></article>)}</div>
      </section>

      <section className="border-y border-border bg-muted/60 px-4 py-16"><div className="mx-auto max-w-6xl text-center"><ShieldCheck className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 font-serif text-4xl font-bold">Your bakery. Your rules.</h2><p className="mx-auto mt-4 max-w-xl text-muted-foreground">The assistant uses your menu and policies. You stay in control.</p></div></section>

      <PricingSection />

      <section className="bg-[hsl(266_55%_13%)] px-4 py-16 text-white"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div><h2 className="max-w-xl font-serif text-4xl font-bold leading-tight">Bake more. Chat less.</h2><p className="mt-3 text-white/70">See Sweet Tooth with your own bakery workflow.</p></div><a href={whatsappSupportLink("Assalam-o-Alaikum! I would like to book a Sweet Tooth demo for my bakery.")} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.02]"><MessageCircle className="h-4 w-4" /> Book a demo</a></div></section>
    </BuyerLayout>
  );
}
