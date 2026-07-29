import { Link } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ArrowRight, Bot, CheckCircle2, ClipboardCheck, Clock3, Instagram, MessageSquare, Phone, Share2, ShieldCheck } from "lucide-react";

const features = [
  { icon: Share2, title: "Share one menu", text: "Add your products, prices, dietary details and delivery areas once. Share the branded link or QR code anywhere customers find you." },
  { icon: Bot, title: "Answer the first questions", text: "Your assistant uses only the menu and rules you set to answer availability, price, delivery, allergen and custom-order questions." },
  { icon: ClipboardCheck, title: "Run every order calmly", text: "Turn a chat into an order, set the due time and rider, track payment review, and use a production checklist before delivery." },
];

export default function Home() {
  return (
    <BuyerLayout>
      <section className="relative overflow-hidden bg-primary px-4 py-16 text-primary-foreground md:py-24">
        <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.05fr_.95fr] md:items-center">
          <div>
            <h1 className="max-w-2xl font-serif text-5xl font-bold leading-[1.05] md:text-6xl">Turn WhatsApp chats into organised bakery orders.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">Sweet Tooth gives your home bakery one menu, a menu-aware assistant and a simple order workspace. You set the facts; the agent handles the first reply while you stay in control.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/register" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 font-bold text-primary transition-transform hover:scale-[1.02]">Create your bakery <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-bold hover:bg-white/10">See how it works</a>
            </div>
            <p className="mt-4 text-sm text-white/70">Start by adding your menu. Connect WhatsApp or Instagram when your channel is ready.</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white p-6 text-foreground shadow-2xl md:p-7">
            <div className="flex items-center justify-between border-b border-border pb-4"><div><p className="font-serif text-2xl font-bold text-primary">A customer asks</p><p className="text-sm text-muted-foreground">Your menu keeps the answer accurate</p></div><Bot className="h-11 w-11 text-primary" /></div>
            <div className="space-y-3 py-5 text-sm"><div className="ml-8 rounded-2xl rounded-br-sm bg-muted p-3"><span className="font-semibold">Customer</span><p className="mt-1">Is the chocolate cake eggless, and can you deliver it on Friday?</p></div><div className="mr-8 rounded-2xl rounded-bl-sm bg-primary p-3 text-primary-foreground"><span className="font-semibold">Your bakery assistant</span><p className="mt-1">It&apos;s available eggless. Friday delivery is available in your selected area. Would you like to choose a size?</p></div></div>
            <div className="grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2"><p className="flex items-center gap-2 font-medium"><Phone className="h-4 w-4 text-green-600" /> WhatsApp when connected</p><p className="flex items-center gap-2 font-medium"><Instagram className="h-4 w-4 text-pink-600" /> Instagram when connected</p></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="max-w-2xl"><h2 className="font-serif text-4xl font-bold">Start in three simple steps.</h2><p className="mt-4 text-muted-foreground">You do not need to change how you bake. Set up the information customers ask for most, then share your menu.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
      </section>

      <section className="border-y border-border bg-card px-4 py-16"><div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3"><div><p className="font-serif text-2xl font-bold text-primary">Your menu stays yours</p><p className="mt-2 text-sm text-muted-foreground">Control your products, prices, availability, delivery zones and dietary information from your dashboard.</p></div><div><p className="font-serif text-2xl font-bold text-primary">The agent knows its limits</p><p className="mt-2 text-sm text-muted-foreground">When it does not have an answer in your menu or policy, it asks the customer to wait for your follow-up.</p></div><div><p className="font-serif text-2xl font-bold text-primary">Every order has a next step</p><p className="mt-2 text-sm text-muted-foreground">Track a quote, due time, deposit review, production checklist, delivery status and feedback in one flow.</p></div></div></section>

      <PricingSection />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[.9fr_1.1fr] md:items-center"><div><p className="text-sm font-bold uppercase tracking-wider text-primary">A professional customer experience</p><h2 className="mt-3 font-serif text-4xl font-bold">Built to answer clearly, not make things up.</h2><p className="mt-5 leading-relaxed text-muted-foreground">The agent is grounded in your menu, dietary notes, delivery areas, availability and payment policies. When a customer needs a human, it creates a clear follow-up for you instead of guessing.</p><Link href="/contact" className="mt-7 inline-flex items-center gap-2 font-bold text-primary hover:underline">Talk to the Sweet Tooth team <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-border p-5"><ShieldCheck className="h-7 w-7 text-primary" /><h3 className="mt-4 font-bold">Menu-grounded answers</h3><p className="mt-2 text-sm text-muted-foreground">Product facts and rules stay at the centre of every response.</p></div><div className="rounded-2xl border border-border p-5"><Clock3 className="h-7 w-7 text-primary" /><h3 className="mt-4 font-bold">Availability-aware</h3><p className="mt-2 text-sm text-muted-foreground">Tell customers your lead time, working hours and delivery areas.</p></div><div className="rounded-2xl border border-border p-5 sm:col-span-2"><CheckCircle2 className="h-7 w-7 text-primary" /><h3 className="mt-4 font-bold">Your bakery, your rules</h3><p className="mt-2 text-sm text-muted-foreground">You approve the policies, payments, custom-order questions and agent escalation settings from one dashboard.</p></div></div></section>

      <section className="bg-muted px-4 py-20"><div className="mx-auto max-w-4xl text-center"><h2 className="font-serif text-4xl font-bold">Ready for a calmer bakery day?</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Create one bakery account, add your menu and rules, then share the link with customers. You can connect channels when you are ready.</p><Link href="/dashboard/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">Create your bakery <ArrowRight className="h-4 w-4" /></Link></div></section>
    </BuyerLayout>
  );
}
