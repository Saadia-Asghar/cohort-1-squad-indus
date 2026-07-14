import { Link } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { ArrowRight, Bot, QrCode, Share2, Sparkles, Store } from "lucide-react";

const features = [
  { icon: Store, title: "Your menu, your brand", text: "Build a polished menu with prices, photos, dietary labels and availability. Your customers see your bakery—not a crowded marketplace." },
  { icon: Share2, title: "One link to share everywhere", text: "Send your menu on WhatsApp, add it to Instagram bio, or print its QR code on packaging and business cards." },
  { icon: Bot, title: "A helpful menu assistant", text: "Answer questions about products, delivery areas, dietary options and custom orders while you focus on baking." },
];

export default function Home() {
  return (
    <BuyerLayout>
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground md:py-28">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),radial-gradient(circle_at_80%_60%,hsl(var(--secondary))_0,transparent_25%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold"><Sparkles className="h-4 w-4" /> Built for Pakistan's home bakers</p>
            <h1 className="font-serif text-5xl font-bold leading-tight md:text-6xl">Your baking deserves its own beautiful online menu.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">Sweet Tooth gives every baker a branded menu, simple orders, direct customer conversations and one shareable link—without competing in a marketplace.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/register" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 font-bold text-primary transition-transform hover:scale-[1.02]">Create your bakery <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/dashboard/login" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-bold hover:bg-white/10">Baker sign in</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white p-6 text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4"><div><p className="font-serif text-2xl font-bold text-primary">Sana's Sweet Studio</p><p className="text-sm text-muted-foreground">Ghar ka meetha</p></div><QrCode className="h-12 w-12 text-primary" /></div>
            <div className="space-y-3 py-5">
              {[['Custom birthday cake', 'PKR 3,500'], ['Eggless brownies', 'PKR 1,200'], ['Chocolate cupcakes', 'PKR 1,800']].map(([name, price]) => <div key={name} className="flex items-center justify-between rounded-xl bg-muted p-3"><span className="font-medium">{name}</span><span className="font-semibold text-primary">{price}</span></div>)}
            </div>
            <div className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground">Ask about delivery, ingredients or a custom order</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-primary">Sell directly</p><h2 className="mt-3 font-serif text-4xl font-bold">Everything your bakery needs to be easy to order from.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
      </section>

      <section className="bg-muted px-4 py-20"><div className="mx-auto max-w-4xl text-center"><h2 className="font-serif text-4xl font-bold">Create. Share. Take orders.</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Set up your bakery profile, customise the menu, then share your unique link with the people who already love your food.</p><Link href="/dashboard/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">Start your bakery <ArrowRight className="h-4 w-4" /></Link></div></section>
    </BuyerLayout>
  );
}
