import { Link } from "wouter";
import { ArrowLeft, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import { SUPPORT_EMAIL, whatsappSupportLink } from "@/lib/support";

export default function Contact() {
  return (
    <BuyerLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_.9fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Sweet Tooth support</p>
            <h1 className="mt-3 font-serif text-5xl font-bold">Let&apos;s make your bakery&apos;s first reply feel professional.</h1>
            <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
              Want a bakery workspace? Join the waitlist and we will WhatsApp you to onboard. Already invited? Sign in. Anyone can also leave a review of the app.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
                <div><h2 className="font-bold">Product and agent setup</h2><p className="mt-1 text-sm text-muted-foreground">Use Agent Hub to set your greeting, policies, dietary guidance and escalation rules.</p></div>
              </div>
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div><h2 className="font-bold">Privacy-first customer handling</h2><p className="mt-1 text-sm text-muted-foreground">Each bakery sees only its own orders, customer history and conversation memory.</p></div>
              </div>
            </div>
          </div>
          <aside className="rounded-3xl border border-border bg-card p-7 shadow-sm">
            <Mail className="h-9 w-9 text-primary" />
            <h2 className="mt-5 font-serif text-2xl font-bold">Need a hand?</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">For account, menu, agent, or order-workflow support, contact the Sweet Tooth team directly.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">Email support</a>
            <a href={whatsappSupportLink("Assalam-o-Alaikum! I need help with my Sweet Tooth bakery account.")} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-green-200 bg-green-50 px-5 py-3 font-bold text-green-800 hover:bg-green-100">WhatsApp support</a>
            <Link href="/review" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 font-bold hover:bg-muted">Review the app</Link>
            <Link href="/waitlist" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 font-bold hover:bg-muted">Join the waitlist</Link>
            <Link href="/dashboard/login" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 font-bold hover:bg-muted">Already invited? Sign in</Link>
          </aside>
        </div>
      </section>
    </BuyerLayout>
  );
}
