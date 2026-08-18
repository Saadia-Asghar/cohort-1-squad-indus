import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { Link } from "wouter";

const benefits = [
  "Turn customer chats into clear orders",
  "Keep payments and production details together",
  "Answer using your menu and bakery rules",
];

export function AuthShell({
  children,
  title,
  description,
  step,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  step?: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-plum-deep px-10 py-9 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <div aria-hidden="true" className="absolute -left-28 top-1/3 h-80 w-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

        <Link href="/" className="relative z-10 inline-flex w-fit items-center rounded-2xl bg-white px-3 py-2 shadow-lg shadow-black/10">
          <img
            src="/sweet-tooth-logo.png"
            alt="Sweet Tooth — AI Assistant for Bakeries"
            className="h-14 w-auto max-w-[245px] object-contain"
          />
        </Link>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="text-sm font-semibold text-gold">One connected bakery workspace</p>
          <h2 className="mt-6 max-w-lg font-serif text-5xl font-bold leading-[0.98] tracking-[-0.035em] xl:text-6xl">
            Less chat chasing. More time to bake.
          </h2>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/68">
            Sign in to manage the details Sweet Tooth collects from every customer conversation.
          </p>

          <div className="mt-10 space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-sm font-semibold text-white/85">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-gold">
                  <Check className="h-4 w-4" />
                </span>
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 border-t border-white/10 pt-6 text-sm text-white/60">
          <MessageCircle className="h-4 w-4 text-gold" />
          Built around the way Pakistan&apos;s home bakers already work.
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-4 py-4 sm:px-8 sm:py-7 lg:px-12 xl:px-18">
        <header className="mx-auto flex w-full max-w-xl items-center justify-between">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link href="/" className="flex items-center lg:hidden" aria-label="Sweet Tooth home">
            <img
              src="/sweet-tooth-logo.png"
              alt="Sweet Tooth — AI Assistant for Bakeries"
              className="h-10 w-auto max-w-[165px] object-contain"
            />
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-xl flex-1 items-center py-6 sm:py-10">
          <div className="w-full">
            {step && <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary/65">{step}</p>}
            <h1 className="font-serif text-4xl font-bold leading-tight tracking-[-0.025em] text-foreground sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="mx-auto w-full max-w-xl text-center text-xs leading-5 text-muted-foreground sm:text-left">
          By continuing, you agree to Sweet Tooth&apos;s Terms and Privacy Policy.
        </p>
      </section>
    </main>
  );
}
