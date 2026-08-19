import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Instagram,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  Store,
  WalletCards,
} from "lucide-react";

import { BuyerLayout } from "@/components/layout/buyer-layout";
import { PricingSection } from "@/components/marketing/pricing-section";
import { scrollToHomeSection, sectionIdFromHref } from "@/lib/home-section-nav";
import { WORKSPACE_CAPABILITIES } from "@/lib/workspace-capabilities";
import { whatsappSupportLink } from "@/lib/support";

const heroSlides = [
  {
    key: "before",
    eyebrow: "Before Sweet Tooth",
    title: "Orders scattered across customer chats",
    description:
      "Important details are split between WhatsApp messages, Instagram DMs, screenshots and handwritten notes.",
  },
  {
    key: "conversation",
    eyebrow: "AI conversation",
    title: "The assistant collects every order detail",
    description:
      "Sweet Tooth asks the right questions using the bakery’s menu, prices, delivery areas and policies.",
  },
  {
    key: "after",
    eyebrow: "After Sweet Tooth",
    title: "One clear order ready for the baker",
    description:
      "Customer details, payment evidence and production deadlines remain connected in one workspace.",
  },
] as const;

const workflow = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Customer enquiry",
    description:
      "A customer asks about availability, price, flavour or delivery through a normal conversation.",
  },
  {
    number: "02",
    icon: Bot,
    title: "AI collection",
    description:
      "The assistant gathers size, cake message, delivery date and location using your bakery rules.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Order creation",
    description:
      "The conversation becomes a structured order instead of remaining buried in chat history.",
  },
  {
    number: "04",
    icon: WalletCards,
    title: "Payment review",
    description:
      "Payment evidence stays attached to the correct order for the baker to verify.",
  },
  {
    number: "05",
    icon: CalendarDays,
    title: "Production planning",
    description:
      "Confirmed work moves into the calendar so baking and delivery deadlines remain visible.",
  },
];

const capabilities = WORKSPACE_CAPABILITIES;

export default function Home() {
  useEffect(() => {
    const jumpToHash = () => {
      const id = sectionIdFromHref(window.location.hash);
      if (!id) return;
      window.setTimeout(() => {
        scrollToHomeSection(id);
      }, 80);
    };

    jumpToHash();
    window.addEventListener("hashchange", jumpToHash);
    window.addEventListener("popstate", jumpToHash);
    return () => {
      window.removeEventListener("hashchange", jumpToHash);
      window.removeEventListener("popstate", jumpToHash);
    };
  }, []);

  return (
    <BuyerLayout>
      <HeroSection />
      <ProofStrip />
      <HowItWorksSection />
      <CapabilitiesSection />
      <TrustSection />
      <PricingSection />
      <FAQSection />
      <FinalSection />
    </BuyerLayout>
  );
}

function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 hidden lg:block">
        <div
          className="absolute inset-y-0 left-0 w-[64%] bg-primary"
          style={{ clipPath: "ellipse(84% 108% at 0% 50%)" }}
        />
        <div className="absolute inset-y-0 left-[46%] w-px bg-primary/15" />
      </div>

      <div className="absolute inset-x-0 top-0 h-[67%] bg-primary lg:hidden" />

      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(47,24,55,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(47,24,55,0.8) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
        }}
      />

      <div className="relative mx-auto max-w-[1480px] px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6 md:px-8 lg:min-h-[720px] lg:px-10 lg:pb-8 xl:px-14">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-30 flex items-start justify-between lg:max-w-[880px] xl:max-w-[980px]"
        >
          <div className="text-primary-foreground">
            <p className="font-serif text-xl font-semibold leading-none sm:text-3xl">
              Sweet/
            </p>
            <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.24em] text-primary-foreground/45 sm:text-[8px] sm:tracking-[0.28em]">
              AI for home bakers
            </p>
          </div>

          <div className="text-right text-primary-foreground lg:text-primary">
            <p className="font-serif text-xl font-semibold leading-none sm:text-3xl">
              /Tooth
            </p>
            <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.24em] opacity-45 sm:text-[8px] sm:tracking-[0.28em]">
              Order intelligence
            </p>
          </div>
        </motion.div>

        <div className="relative mt-5 grid items-center gap-3 sm:mt-7 sm:gap-5 lg:min-h-[620px] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)] xl:gap-10">
          <div className="relative z-30 w-full max-w-[560px] pt-8 text-primary-foreground sm:pt-12 lg:max-w-[640px] lg:pb-0 lg:pr-0 lg:pt-0 xl:max-w-[680px]">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.75,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center gap-3 sm:gap-4"
            >
              <span className="h-px w-8 bg-secondary sm:w-12" />
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-secondary sm:text-[9px] sm:tracking-[0.27em]">
                One connected bakery workspace
              </p>
            </motion.div>

            <div className="mt-7 sm:mt-10">
              <HeroLine text="Let us" delay={0.05} />
              <HeroLine text="handle the chats" delay={0.14} accent />
              <HeroLine text="while you" delay={0.23} />
              <HeroLine text="bake." delay={0.32} />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.62 }}
              className="mt-6 max-w-[470px] border-l border-secondary/60 pl-4 text-[13px] leading-6 text-primary-foreground/68 sm:mt-9 sm:pl-6 sm:text-base sm:leading-8"
            >
              Sweet Tooth turns WhatsApp and your shared menu chat into
              organized orders for the people you already bake for. Instagram
              DM agent coming soon. It is not a customer marketplace.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.76 }}
              className="mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row lg:flex-wrap"
            >
              <Link
                href="/waitlist"
                className="group inline-flex min-h-12 w-full items-center justify-center gap-4 rounded-xl bg-background px-5 py-3 text-sm font-bold text-primary shadow-md transition hover:-translate-y-0.5 hover:bg-secondary hover:text-secondary-foreground sm:min-h-14 sm:w-auto sm:px-8"
              >
                Join the waitlist
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                href="/dashboard/register"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary-foreground/25 px-5 py-3 text-sm font-bold text-primary-foreground transition hover:border-secondary hover:text-secondary sm:min-h-14 sm:w-auto sm:px-8"
              >
                Create a free account
              </Link>

              <Link
                href="/review"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary-foreground/25 px-5 py-3 text-sm font-bold text-primary-foreground transition hover:border-secondary hover:text-secondary sm:min-h-14 sm:w-auto sm:px-8"
              >
                Review the app
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mt-5 hidden items-center gap-4 xl:flex"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
              <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-primary-foreground/40">
                Scroll to explore the workflow
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.72, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={{
              duration: 1.1,
              delay: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative z-20 mx-auto mb-8 mt-12 w-[76vw] max-w-[305px] sm:mb-12 sm:mt-16 sm:w-[410px] sm:max-w-none lg:mb-0 lg:mt-0 lg:w-full lg:max-w-[430px] lg:justify-self-end xl:max-w-[480px] 2xl:max-w-[530px]"
          >
            <div className="relative">
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        scale: [0.94, 1.04, 0.94],
                        opacity: [0.2, 0.5, 0.2],
                      }
                }
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-[6%] rounded-full bg-secondary/30 blur-[55px]"
              />

              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [-7, 7, -7],
                      }
                }
                transition={{
                  duration: 5.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative aspect-square overflow-hidden rounded-full border-[8px] border-background bg-background shadow-lg sm:border-[14px]"
              >
                <img
                  src="/sweet-tooth-cake-hero.png"
                  alt="Elegant custom cake made by a home baker"
                  className="h-full w-full scale-[1.08] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-white/15" />
              </motion.div>

              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        rotate: 360,
                      }
                }
                transition={{
                  duration: 24,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-[-5%] rounded-full border border-dashed border-secondary/65"
              >
                <span className="absolute left-1/2 top-[-5px] h-3 w-3 -translate-x-1/2 rounded-full bg-secondary shadow-[0_0_22px_rgba(194,79,122,0.7)]" />
              </motion.div>

              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [-5, 6, -5],
                      }
                }
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -left-2 top-[12%] max-w-[138px] rounded-xl border border-primary-foreground/15 bg-foreground/92 px-3 py-2.5 text-background shadow-lg backdrop-blur-xl sm:-left-10 sm:max-w-[170px] sm:px-4 sm:py-3 lg:-left-4 xl:-left-8"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-secondary">
                  New enquiry
                </p>
                <p className="mt-2 text-[11px] font-semibold sm:text-xs">
                  2kg chocolate cake?
                </p>
              </motion.div>

              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [6, -5, 6],
                      }
                }
                transition={{
                  duration: 4.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -right-2 bottom-[14%] max-w-[138px] rounded-xl bg-background px-3 py-2.5 text-primary shadow-lg sm:-right-10 sm:bottom-[18%] sm:max-w-[170px] sm:px-4 sm:py-3 lg:-right-4 xl:-right-8"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-55">
                  Order ready
                </p>
                <p className="mt-2 text-[11px] font-bold sm:text-xs">
                  Tomorrow · DHA 6
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}

function HeroLine({
  text,
  delay,
  accent = false,
}: {
  text: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <div className="overflow-visible pb-[0.14em]">
      <motion.h1
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.82,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`font-serif text-[2.55rem] font-semibold leading-[1.02] tracking-[-0.052em] min-[390px]:text-[3rem] sm:text-[4.35rem] md:text-[4.8rem] lg:text-[3.85rem] xl:text-[4.45rem] 2xl:text-[5rem] ${
          accent ? "italic text-secondary" : ""
        }`}
      >
        {text}
      </motion.h1>
    </div>
  );
}

function BeforeVisual() {
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[1fr_0.92fr] sm:gap-4">
      <div className="flex min-h-[250px] flex-col rounded-[20px] border border-border bg-muted/45 p-4 sm:min-h-0 sm:p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold">WhatsApp</p>
          </div>
          <span className="rounded-full bg-secondary/12 px-2 py-1 text-[8px] font-bold uppercase text-secondary">
            14 unread
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <ChatBubble side="right">
            Kal ke liye chocolate cake available?
          </ChatBubble>
          <ChatBubble side="left">Kitne kg chahiye?</ChatBubble>
          <ChatBubble side="right">
            2kg. Message “Happy Birthday Hira”.
          </ChatBubble>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-4 text-[10px] font-semibold text-muted-foreground">
          <CircleAlert className="h-4 w-4 text-secondary" />
          Delivery area still missing
        </div>
      </div>

      <div className="grid gap-3 sm:grid-rows-2">
        <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-secondary" />
              <p className="text-xs font-bold">Instagram DM</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-secondary" />
          </div>
          <p className="mt-4 text-sm font-semibold leading-6">
            “Can you deliver to DHA Phase 6?”
          </p>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Separate conversation
          </p>
        </div>

        <div className="rounded-[20px] border border-secondary/20 bg-accent p-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
            The problem
          </p>
          <p className="mt-3 font-serif text-xl font-semibold leading-tight">
            Details exist, but not in one place.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Size", "Date", "Address", "Payment"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-secondary/15 bg-card/70 px-2.5 py-1 text-[9px] font-semibold text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationVisual() {
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[1.08fr_0.92fr] sm:gap-4">
      <div className="flex min-h-[290px] flex-col overflow-hidden rounded-[20px] border border-border bg-muted/40 sm:min-h-0">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold">Sweet Tooth Assistant</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                Following bakery rules
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-3 p-4">
          <ChatBubble side="right">
            Kal ke liye 2kg chocolate cake available hai?
          </ChatBubble>
          <ChatBubble side="left" assistant>
            Yes. Please share the cake message and delivery area.
          </ChatBubble>
          <ChatBubble side="right">
            Happy Birthday Hira. DHA Phase 6.
          </ChatBubble>
          <ChatBubble side="left" assistant>
            Great. Your order is ready for baker review.
          </ChatBubble>
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-secondary">
          Information collected
        </p>

        <div className="mt-4 divide-y divide-border border-y border-border">
          <DetailRow label="Product" value="Chocolate cake" />
          <DetailRow label="Size" value="2kg" />
          <DetailRow label="Message" value="Happy Birthday Hira" />
          <DetailRow label="Delivery" value="Tomorrow" />
          <DetailRow label="Area" value="DHA Phase 6" />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary/8 p-3 text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-[10px] font-bold">
            Required information collected
          </p>
        </div>
      </div>
    </div>
  );
}

function AfterVisual() {
  return (
    <div className="grid h-full gap-3 sm:grid-cols-[1fr_0.95fr] sm:gap-4">
      <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-secondary">
              Structured order
            </p>
            <p className="mt-1 font-serif text-xl font-semibold">
              Order #ST-1048
            </p>
          </div>
          <PackageCheck className="h-5 w-5 text-primary" />
        </div>

        <div className="relative overflow-hidden bg-primary p-4 text-primary-foreground sm:p-5">
          <div className="relative z-10 max-w-[65%]">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-secondary">
              Product
            </p>
            <p className="mt-2 font-serif text-xl font-semibold leading-tight sm:text-2xl">
              Chocolate birthday cake
            </p>
            <p className="mt-2 text-xs text-primary-foreground/65">
              2kg · Happy Birthday Hira
            </p>
          </div>

          <div className="absolute -right-4 -top-6 h-32 w-32 overflow-hidden rounded-full border-[6px] border-background shadow-lg sm:h-36 sm:w-36">
            <img
              src="/sweet-tooth-cake-hero.png"
              alt="Chocolate celebration cake"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <Metric label="Delivery" value="Tomorrow" />
          <Metric label="Area" value="DHA 6" />
          <Metric label="Total" value="PKR 4,200" />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Status
            </p>
            <p className="mt-1 text-xs font-bold">Ready for baker review</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1.5 text-[9px] font-bold text-primary">
            New order
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-rows-2">
        <div className="rounded-[20px] border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-secondary">
              Payment
            </p>
            <WalletCards className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-serif text-xl font-semibold">
            Evidence received
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            The baker confirms whether the advance was received.
          </p>
        </div>

        <div className="rounded-[20px] border border-border bg-accent p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-secondary">
              Production
            </p>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-serif text-xl font-semibold">
            Added to tomorrow
          </p>
          <div className="mt-4 flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            Decoration before 4:00 PM
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  assistant = false,
  children,
}: {
  side: "left" | "right";
  assistant?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-5 sm:text-xs ${
          assistant
            ? "rounded-bl-md bg-primary text-primary-foreground"
            : side === "right"
              ? "rounded-br-md bg-secondary/12 text-foreground"
              : "rounded-bl-md border border-border bg-card text-foreground"
        }`}
      >
        {assistant && (
          <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-secondary">
            Sweet Tooth
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[0.72fr_1.28fr] gap-3 py-2.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </p>
      <p className="text-[10px] font-bold sm:text-xs">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 py-3 text-center sm:px-3">
      <p className="truncate text-[7px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:text-[8px]">
        {label}
      </p>
      <p className="mt-1 truncate text-[9px] font-bold sm:text-xs">{value}</p>
    </div>
  );
}

function ProofStrip() {
  const items = [
    "Customer conversation",
    "Order details",
    "Payment review",
    "Production calendar",
    "Baker control",
  ];

  return (
    <div className="overflow-hidden border-y border-border bg-accent py-4">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        className="flex w-max"
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {items.map((item) => (
              <div key={`${copy}-${item}`} className="flex items-center">
                <p className="px-6 text-[8px] font-bold uppercase tracking-[0.2em] text-primary/70 sm:px-12 sm:text-[10px]">
                  {item}
                </p>
                <span className="h-1.5 w-1.5 rotate-45 bg-secondary" />
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function WorkflowGallery() {
  const reduceMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [activeSlide]);

  const showSlide = (index: number) => {
    const total = heroSlides.length;
    setActiveSlide((index + total) % total);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
      className="relative mt-12 sm:mt-16"
    >
      <div className="overflow-hidden rounded-[24px] border border-primary/15 bg-card shadow-lg sm:rounded-[30px]">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full sweet-gradient text-xs font-bold text-white sm:h-10 sm:w-10">
              ST
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                Sweet Tooth live workflow
              </p>
              <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Before → conversation → after
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => showSlide(activeSlide - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/30 hover:text-primary"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => showSlide(activeSlide + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/30 hover:text-primary"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-border bg-muted/45">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => showSlide(index)}
              className={`relative px-2 py-3 text-center text-[9px] font-bold uppercase tracking-[0.12em] transition sm:px-4 sm:text-[10px] ${
                activeSlide === index
                  ? "bg-card text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {slide.key}
              {activeSlide === index && (
                <motion.span
                  layoutId="active-workflow-tab"
                  className="absolute inset-x-4 bottom-0 h-0.5 bg-secondary"
                />
              )}
            </button>
          ))}
        </div>

        <div className="relative min-h-[500px] overflow-hidden bg-card sm:min-h-[560px] lg:min-h-[610px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={heroSlides[activeSlide].key}
              initial={{ opacity: 0, x: 34, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -28, scale: 0.985 }}
              transition={{ duration: 0.38 }}
              drag={reduceMotion ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70) showSlide(activeSlide + 1);
                if (info.offset.x > 70) showSlide(activeSlide - 1);
              }}
              className="absolute inset-0 touch-pan-y p-4 sm:p-6"
            >
              <div className="flex h-full flex-col">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.21em] text-secondary">
                    {heroSlides[activeSlide].eyebrow}
                  </p>
                  <h3 className="mt-3 max-w-[760px] font-serif text-[1.8rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[2.55rem]">
                    {heroSlides[activeSlide].title}
                  </h3>
                  <p className="mt-3 max-w-[720px] text-xs leading-6 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-7">
                    {heroSlides[activeSlide].description}
                  </p>
                </div>

                <div className="mt-5 min-h-0 flex-1 sm:mt-7">
                  {activeSlide === 0 && <BeforeVisual />}
                  {activeSlide === 1 && <ConversationVisual />}
                  {activeSlide === 2 && <AfterVisual />}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex gap-1.5">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                aria-label={`Show ${slide.key} slide`}
                onClick={() => showSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeSlide === index
                    ? "w-8 bg-secondary"
                    : "w-4 bg-primary/15"
                }`}
              />
            ))}
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Swipe on mobile
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 bg-background px-4 py-16 text-foreground sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20"
    >
      <div className="mx-auto max-w-[1380px]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="block"
        >

          <h2 className="max-w-5xl font-serif text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.038em] sm:text-5xl md:text-6xl lg:text-7xl">
            See the journey from scattered messages to one clear order.
          </h2>
        </motion.div>

        <WorkflowGallery />

        <WorkflowJourney />
      </div>
    </section>
  );
}

function WorkflowJourney() {
  const stageLabels = [
    "Signal received",
    "Details understood",
    "Order structured",
    "Payment reviewed",
    "Production scheduled",
  ];

  return (
    <div className="relative mt-16 overflow-hidden rounded-[28px] border border-primary/15 bg-card px-4 py-10 shadow-lg sm:mt-20 sm:px-7 sm:py-14 lg:px-10 lg:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-secondary/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      <div className="relative">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-secondary">
            The order journey
          </p>
          <h3 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Five moments. One uninterrupted flow.
          </h3>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Each stage passes the right information forward, so nothing has to
            be copied, searched for or remembered twice.
          </p>
        </div>

        <div className="relative mx-auto max-w-[1120px]">
          <div className="absolute bottom-0 left-[18px] top-0 w-px bg-primary/12 md:left-1/2 md:-translate-x-1/2" />

          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-[18px] top-0 w-px origin-top bg-gradient-to-b from-secondary via-primary to-secondary md:left-1/2 md:-translate-x-1/2"
          />

          <div className="space-y-8 sm:space-y-10 md:space-y-4">
            {workflow.map(
              ({ number, icon: Icon, title, description }, index) => {
                const isLeft = index % 2 === 0;

                return (
                  <motion.article
                    key={number}
                    initial={{
                      opacity: 0,
                      x: isLeft ? -30 : 30,
                      y: 18,
                    }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true, margin: "-90px" }}
                    transition={{
                      duration: 0.65,
                      delay: index * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="relative grid pl-12 md:min-h-[255px] md:grid-cols-[1fr_86px_1fr] md:items-center md:pl-0"
                  >
                    <div
                      className={`${
                        isLeft
                          ? "md:col-start-1 md:pr-7"
                          : "md:col-start-3 md:pl-7"
                      }`}
                    >
                      <div className="group relative overflow-hidden rounded-[22px] border border-primary/12 bg-background/88 p-5 shadow-sm backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-secondary/35 hover:shadow-md sm:p-6">
                        <div className="pointer-events-none absolute -right-4 -top-8 font-serif text-[7rem] font-semibold leading-none text-primary/[0.045] sm:text-[8rem]">
                          {number}
                        </div>

                        <div className="relative">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-secondary">
                                {stageLabels[index]}
                              </p>
                              <h4 className="mt-3 font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                                {title}
                              </h4>
                            </div>

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition duration-500 group-hover:rotate-6 group-hover:scale-110">
                              <Icon className="h-5 w-5" strokeWidth={1.7} />
                            </div>
                          </div>

                          <p className="mt-4 max-w-lg text-[13px] leading-6 text-muted-foreground sm:text-sm sm:leading-7">
                            {description}
                          </p>

                          <StageArtifact index={index} />
                        </div>
                      </div>
                    </div>

                    <div className="absolute left-0 top-7 md:static md:col-start-2 md:row-start-1 md:flex md:h-full md:items-center md:justify-center">
                      <motion.div
                        initial={{ scale: 0.55, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.55,
                          delay: 0.15 + index * 0.06,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border-[5px] border-card bg-secondary shadow-[0_0_0_1px_hsl(var(--primary)/0.16),0_10px_30px_hsl(var(--primary)/0.18)] md:h-11 md:w-11"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-card" />
                        <span className="absolute inset-[-7px] animate-pulse rounded-full border border-secondary/25" />
                      </motion.div>
                    </div>

                    <div
                      className={`hidden md:block ${
                        isLeft
                          ? "md:col-start-3 md:pl-7"
                          : "md:col-start-1 md:row-start-1 md:pr-7"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-4 ${
                          isLeft ? "justify-start" : "justify-end"
                        }`}
                      >
                        <span className="font-serif text-5xl font-semibold tracking-[-0.05em] text-primary/10">
                          {number}
                        </span>
                        <div
                          className={`h-px w-16 bg-gradient-to-r ${
                            isLeft
                              ? "from-primary/35 to-transparent"
                              : "from-transparent to-primary/35"
                          }`}
                        />
                      </div>
                    </div>
                  </motion.article>
                );
              },
            )}
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-[1120px] items-center justify-center sm:mt-16">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/15 bg-accent px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <CheckCircle2 className="h-4 w-4" />
            One connected customer journey
          </div>
        </div>
      </div>
    </div>
  );
}

function StageArtifact({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <MessageCircle className="h-4 w-4 shrink-0 text-secondary" />
        <p className="text-xs font-semibold text-foreground/80">
          “Kal ke liye 2kg chocolate cake available hai?”
        </p>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="mt-5 flex flex-wrap gap-2">
        {["Chocolate", "2kg", "Tomorrow", "DHA 6"].map((item) => (
          <span
            key={item}
            className="rounded-full border border-primary/12 bg-accent px-3 py-1.5 text-[9px] font-bold text-primary"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="mt-5 flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-primary p-3.5 text-primary-foreground">
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-secondary">
            Order #ST-1048
          </p>
          <p className="mt-1 truncate text-xs font-bold">
            Chocolate birthday cake
          </p>
        </div>

        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-background">
          <img
            src="/sweet-tooth-cake-hero.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-secondary/20 bg-secondary/8 px-4 py-3">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-secondary">
            JazzCash evidence
          </p>
          <p className="mt-1 text-xs font-bold">Waiting for baker confirmation</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
        <CalendarDays className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-secondary">
          Tomorrow
        </p>
        <p className="mt-1 text-xs font-bold">
          Decoration deadline · 4:00 PM
        </p>
      </div>
    </div>
  );
}

function CapabilitiesSection() {
  const [activeCapability, setActiveCapability] = useState(0);
  const active = capabilities[activeCapability];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveCapability(
        (current) => (current + 1) % capabilities.length,
      );
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [activeCapability]);

  return (
    <section
      id="features"
      className="scroll-mt-24 overflow-hidden bg-muted/45 px-4 py-16 text-foreground sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20"
    >
      <div className="mx-auto max-w-[1380px]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-5 lg:grid-cols-[0.58fr_1.42fr] lg:gap-10"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-secondary">
              One connected workspace
            </p>
            <div className="mt-5 hidden h-px w-20 bg-secondary lg:block" />
          </div>

          <div>
            <h2 className="max-w-5xl font-serif text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.038em] sm:text-5xl md:text-6xl lg:text-7xl">
              Four tools working as one bakery command center.
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Select a workspace to see how customer information moves through
              Sweet Tooth without being copied between different apps.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative mt-12 overflow-hidden rounded-[28px] border border-primary/15 bg-card shadow-lg sm:mt-16 lg:grid lg:min-h-[690px] lg:grid-cols-[0.78fr_1.22fr]"
        >
          <div className="relative overflow-hidden bg-primary px-4 py-6 text-primary-foreground sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-secondary/20 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-background/10 blur-[100px]" />

            <div className="relative">
              <div className="flex items-center justify-between border-b border-primary-foreground/15 pb-5">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-secondary">
                    Workspace navigator
                  </p>
                  <p className="mt-2 font-serif text-2xl font-semibold">
                    Sweet Tooth OS
                  </p>
                </div>

                <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-primary-foreground/55">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                  Connected
                </span>
              </div>

              <div className="mt-5 space-y-2">
                {capabilities.map(
                  ({ icon: Icon, title, description }, index) => {
                    const selected = activeCapability === index;

                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => setActiveCapability(index)}
                        className={`group relative w-full overflow-hidden rounded-[18px] border px-4 py-4 text-left transition duration-300 sm:px-5 sm:py-5 ${
                          selected
                            ? "border-secondary/55 bg-background text-foreground shadow-md"
                            : "border-primary-foreground/12 bg-primary-foreground/[0.035] text-primary-foreground hover:border-primary-foreground/25 hover:bg-primary-foreground/[0.07]"
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId="capability-active"
                            className="absolute bottom-0 left-0 top-0 w-1 bg-secondary"
                          />
                        )}

                        <div className="flex items-start gap-4">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary-foreground/10 text-secondary"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-serif text-xl font-semibold sm:text-2xl">
                                {title}
                              </p>
                              <span
                                className={`font-serif text-lg ${
                                  selected
                                    ? "text-secondary"
                                    : "text-primary-foreground/30"
                                }`}
                              >
                                0{index + 1}
                              </span>
                            </div>

                            <p
                              className={`mt-2 line-clamp-2 text-xs leading-5 ${
                                selected
                                  ? "text-muted-foreground"
                                  : "text-primary-foreground/48"
                              }`}
                            >
                              {description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="mt-6 border-t border-primary-foreground/15 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/45">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                    Auto preview · 4 seconds
                  </p>

                  <div className="flex gap-1.5">
                    {capabilities.map((item, index) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => setActiveCapability(index)}
                        aria-label={`Show ${item.title}`}
                        className={`h-1.5 rounded-full transition-all ${
                          activeCapability === index
                            ? "w-8 bg-secondary"
                            : "w-4 bg-primary-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 h-px overflow-hidden bg-primary-foreground/12">
                  <motion.div
                    key={activeCapability}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: 4,
                      ease: "linear",
                    }}
                    className="h-full bg-secondary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[560px] overflow-hidden bg-background p-4 sm:p-7 lg:min-h-0 lg:p-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />

            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-5 border-b border-border pb-5">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-secondary">
                    Active workspace · 0{activeCapability + 1}
                  </p>

                  <AnimatePresence mode="wait">
                    <motion.h3
                      key={active.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-2 font-serif text-3xl font-semibold sm:text-4xl"
                    >
                      {active.title}
                    </motion.h3>
                  </AnimatePresence>
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-primary sm:flex">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  In sync
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCapability}
                  initial={{ opacity: 0, x: 24, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.985 }}
                  transition={{ duration: 0.35 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
                    {active.description}
                  </p>

                  <div className="mt-6 min-h-0 flex-1">
                    <CapabilityPreview index={activeCapability} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CapabilityPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="grid h-full gap-4 md:grid-cols-[1.08fr_0.92fr]">
        <div className="flex min-h-[360px] flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold">Sweet Tooth Assistant</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  Following your bakery rules
                </p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 text-[9px] font-bold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
              LIVE
            </span>
          </div>

          <div className="flex flex-1 flex-col justify-end gap-3 bg-muted/35 p-4">
            <ChatBubble side="right">
              Kal ke liye chocolate cake available?
            </ChatBubble>
            <ChatBubble side="left" assistant>
              Yes. What size and delivery area do you need?
            </ChatBubble>
            <ChatBubble side="right">
              2kg, DHA Phase 6. Message: Happy Birthday Hira.
            </ChatBubble>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[22px] border border-border bg-accent p-5">
            <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
              Assistant knowledge
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Menu", "Prices", "Delivery", "Policies"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-primary/12 bg-card px-3 py-1.5 text-[9px] font-bold text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-primary/15 bg-primary p-5 text-primary-foreground">
            <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
              Human handoff
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold">
              Unusual request detected
            </p>
            <p className="mt-3 text-xs leading-6 text-primary-foreground/60">
              The conversation can be handed to the baker instead of guessing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="h-full overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
              Live order board
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold">
              Today’s bakery flow
            </p>
          </div>
          <PackageCheck className="h-5 w-5 text-primary" />
        </div>

        <div className="grid gap-3 p-4 sm:p-5">
          {[
            {
              time: "10:30",
              customer: "Hira Khan",
              item: "2kg chocolate cake",
              state: "New",
              tone: "bg-accent text-primary",
            },
            {
              time: "14:00",
              customer: "Ayesha",
              item: "12 vanilla cupcakes",
              state: "Confirmed",
              tone: "bg-secondary/12 text-secondary",
            },
            {
              time: "17:30",
              customer: "Sara Ali",
              item: "Lotus celebration cake",
              state: "Production",
              tone: "bg-primary/10 text-primary",
            },
          ].map((order, orderIndex) => (
            <motion.div
              key={order.customer}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: orderIndex * 0.08 }}
              className="grid gap-3 rounded-[18px] border border-border bg-background p-4 sm:grid-cols-[65px_1fr_auto] sm:items-center"
            >
              <p className="font-mono text-xs font-bold text-muted-foreground">
                {order.time}
              </p>
              <div>
                <p className="text-sm font-bold">{order.customer}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.item}
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] ${order.tone}`}
              >
                {order.state}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="grid h-full gap-4 md:grid-cols-[1fr_0.92fr]">
        <div className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
                Payment evidence
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold">
                Order #ST-1048
              </p>
            </div>
            <WalletCards className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 rounded-[18px] border border-dashed border-primary/20 bg-muted/35 p-5">
            <div className="h-2 w-2/3 rounded-full bg-primary/10" />
            <div className="mt-3 h-2 w-1/2 rounded-full bg-primary/10" />
            <p className="mt-8 font-serif text-4xl font-semibold">
              PKR 2,100
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Customer-submitted JazzCash evidence
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[22px] bg-primary p-5 text-primary-foreground shadow-md">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
              Review status
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold leading-tight">
              Waiting for baker confirmation
            </p>
            <p className="mt-4 text-sm leading-7 text-primary-foreground/58">
              Sweet Tooth keeps the evidence attached, but does not declare the
              payment received.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-primary-foreground/15 pt-5">
            <ShieldCheck className="h-5 w-5 text-secondary" />
            <p className="text-xs font-bold">Human verification protected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-secondary">
            Production calendar
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold">This week</p>
        </div>
        <CalendarDays className="h-5 w-5 text-primary" />
      </div>

      <div className="grid grid-cols-7 border-l border-t border-border">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, dayIndex) => (
          <div
            key={`${day}-${dayIndex}`}
            className="border-b border-r border-border py-3 text-center text-[8px] font-bold text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {[12, 13, 14, 15, 16, 17, 18].map((date) => (
          <div
            key={date}
            className={`min-h-24 border-b border-r border-border p-2 sm:min-h-28 sm:p-3 ${
              date === 18 ? "bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            <p className="text-xs font-bold">{date}</p>
            {date === 18 && (
              <div className="mt-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-secondary">
                  Hira
                </p>
                <p className="mt-1 text-[9px] font-semibold">2kg cake</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="m-4 flex items-center gap-3 rounded-[16px] bg-accent p-4 sm:m-5">
        <Clock3 className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-bold">Decoration deadline</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete before tomorrow at 4:00 PM
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustSection() {
  const points = [
    {
      icon: Store,
      title: "Your bakery rules",
      text: "The assistant follows your menu, prices, availability and delivery policies.",
    },
    {
      icon: ShieldCheck,
      title: "Your confirmation",
      text: "The baker remains responsible for payment verification and important actions.",
    },
    {
      icon: Bot,
      title: "Your control",
      text: "Unclear customer requests can be handed to a human whenever needed.",
    },
  ];

  return (
    <section className="bg-accent px-4 py-16 text-foreground sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20">
      <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-secondary">
            Built around trust
          </p>
          <h2 className="mt-5 max-w-4xl font-serif text-[2.55rem] font-semibold leading-[0.96] tracking-[-0.035em] sm:mt-8 sm:text-5xl md:text-6xl lg:text-7xl">
            Automation supports the baker. It does not replace them.
          </h2>
        </motion.div>

        <div className="border-t border-primary/15">
          {points.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex gap-4 border-b border-primary/15 py-5 sm:gap-5 sm:py-6"
            >
              <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqItems = [
  {
    question: "Does Sweet Tooth confirm customer payments automatically?",
    answer:
      "No. Sweet Tooth can keep customer-submitted payment evidence attached to the correct order, but the baker confirms whether the money was actually received.",
  },
  {
    question: "What does the AI assistant use when answering customers?",
    answer:
      "It uses the menu, prices, delivery areas, greeting and bakery rules that the baker publishes. Unclear or unusual requests can be handed to a human.",
  },
  {
    question: "Can I update my menu, prices and delivery policies later?",
    answer:
      "Yes. Those details are managed from the bakery dashboard, so the information used by the assistant can be updated as the business changes.",
  },
  {
    question: "What happens after a customer shares all the cake details?",
    answer:
      "The information can be organized into an order record with the product, size, cake message, delivery date, area and payment evidence kept together.",
  },
  {
    question: "Is Sweet Tooth a marketplace like Daraz?",
    answer:
      "No. Buyers do not browse every bakery. You share your menu link, WhatsApp, or Instagram with your own customers. Their chats and orders stay in your dashboard.",
  },
  {
    question: "Is Sweet Tooth designed only for large bakeries?",
    answer:
      "No. The product is being designed around the daily workflow of home bakers and small bakery teams that currently manage orders through conversations.",
  },
  {
    question: "What if the assistant cannot understand a customer request?",
    answer:
      "It should not invent an answer. The conversation can be handed to the baker so a human can review the request and respond.",
  },
];

function FAQSection() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section
      id="faq"
      className="scroll-mt-24 overflow-hidden bg-background px-4 py-16 text-foreground sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20"
    >
      <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative overflow-hidden rounded-[28px] bg-primary p-6 text-primary-foreground shadow-lg sm:p-8 lg:sticky lg:top-24 lg:h-fit lg:p-10"
        >
          <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-secondary/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-28 right-[-60px] h-80 w-80 rounded-full bg-background/10 blur-[100px]" />

          <div className="relative">
            <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-secondary">
              Questions before launch
            </p>

            <h2 className="mt-6 max-w-xl font-serif text-[2.8rem] font-semibold leading-[0.94] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              The details should feel as clear as the dashboard.
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-7 text-primary-foreground/62 sm:text-base">
              Straight answers about automation, payments and how Sweet Tooth
              fits into a real bakery workflow.
            </p>

            <div className="relative mx-auto mt-10 aspect-square max-w-[330px]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[5%] rounded-full border border-dashed border-primary-foreground/18"
              />

              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[20%] rounded-full border border-secondary/35"
              />

              <div className="absolute inset-[31%] flex items-center justify-center rounded-full border border-primary-foreground/15 bg-background text-primary shadow-lg">
                <span className="font-serif text-7xl font-semibold">?</span>
              </div>

              {[
                { label: "AI replies", position: "left-0 top-[22%]" },
                { label: "Payments", position: "right-0 top-[42%]" },
                { label: "Setup", position: "bottom-[8%] left-[24%]" },
              ].map((tag, index) => (
                <motion.div
                  key={tag.label}
                  animate={{ y: [-5, 5, -5] }}
                  transition={{
                    duration: 4 + index * 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`absolute ${tag.position} rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-primary-foreground backdrop-blur-md`}
                >
                  {tag.label}
                </motion.div>
              ))}
            </div>

            <a
              href={whatsappSupportLink(
                "Assalam-o-Alaikum! I have a question about Sweet Tooth.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-background px-5 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-secondary hover:text-secondary-foreground sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Ask another question
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="border-t border-border"
        >
          {faqItems.map((faq, index) => {
            const open = openFaq === index;
            const answerId = `faq-answer-${index}`;

            return (
              <article
                key={faq.question}
                className="border-b border-border"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? -1 : index)}
                  aria-expanded={open}
                  aria-controls={answerId}
                  className="group flex w-full items-start gap-4 py-6 text-left sm:gap-6 sm:py-8"
                >
                  <span
                    className={`mt-1 font-serif text-lg transition ${
                      open ? "text-secondary" : "text-primary/35"
                    }`}
                  >
                    0{index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`font-serif text-xl font-semibold leading-tight transition sm:text-2xl md:text-3xl ${
                        open ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {faq.question}
                    </h3>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          id={answerId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32 }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-2xl pb-1 pt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition sm:h-11 sm:w-11 ${
                      open
                        ? "rotate-0 border-secondary bg-secondary text-secondary-foreground"
                        : "border-primary/15 bg-card text-primary group-hover:border-primary/30"
                    }`}
                  >
                    {open ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </span>
                </button>
              </article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="bg-background px-4 py-16 text-foreground sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20">
      <div className="mx-auto max-w-[1380px]">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 border-y border-border py-10 sm:gap-12 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end lg:py-16"
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.23em] text-secondary">
              Your next order starts with a message
            </p>
            <h2 className="mt-5 max-w-5xl font-serif text-[2.75rem] font-semibold leading-[0.94] tracking-[-0.04em] sm:mt-8 sm:text-5xl md:text-6xl lg:text-8xl">
              Bake more.
              <br />
              Chase fewer chats.
            </h2>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto">
            <Link
              href="/waitlist"
              className="group inline-flex min-h-12 w-full items-center justify-center gap-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary sm:min-h-14 sm:px-8 lg:w-auto"
            >
              Join the waitlist
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard/register"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary/25 px-5 py-3 text-sm font-bold text-primary transition hover:border-secondary hover:text-secondary sm:min-h-14 sm:px-8 lg:w-auto"
            >
              Create a free account
            </Link>

            <a
              href={whatsappSupportLink(
                "Assalam-o-Alaikum! I would like to book a Sweet Tooth demo for my bakery.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-4 rounded-xl border border-primary/25 px-5 py-3 text-sm font-bold text-primary transition hover:border-secondary hover:text-secondary sm:min-h-14 sm:px-8 lg:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Book a demonstration
            </a>
            <Link
              href="/review"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-muted-foreground transition hover:text-primary sm:min-h-14 sm:px-8 lg:w-auto"
            >
              Review the app — bakers, students, developers
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}