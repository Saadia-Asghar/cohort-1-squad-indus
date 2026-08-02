import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Instagram,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { BuyerLayout } from "@/components/layout/buyer-layout";
import { PricingSection } from "@/components/marketing/pricing-section";
import { whatsappSupportLink } from "@/lib/support";

const demoMessages = [
  {
    id: 1,
    sender: "customer",
    text: "Assalam-o-Alaikum! Kal ke liye 2kg chocolate cake available hai?",
  },
  {
    id: 2,
    sender: "agent",
    text: "Wa Alaikum Assalam! 🎂 Yes, it is available. Please share your delivery area and cake message.",
  },
  {
    id: 3,
    sender: "customer",
    text: "DHA Phase 6. Cake par Happy Birthday Hira likhna hai.",
  },
  {
    id: 4,
    sender: "agent",
    text: "Perfect! Your order summary is ready. Total: PKR 4,200. Shall I confirm it?",
  },
] as const;

const problems = [
  {
    title: "Messages everywhere",
    text: "Customer questions are spread across WhatsApp, Instagram and phone calls.",
    icon: MessageCircle,
  },
  {
    title: "Order details get lost",
    text: "Flavour, size, date, address and cake notes are hidden inside long conversations.",
    icon: ClipboardCheck,
  },
  {
    title: "Payments need checking",
    text: "JazzCash, Easypaisa and bank-transfer screenshots need careful manual review.",
    icon: WalletCards,
  },
  {
    title: "Deadlines become stressful",
    text: "Baking, decoration and delivery dates are difficult to manage without one clear calendar.",
    icon: Clock3,
  },
];

const workflow = [
  {
    number: "01",
    title: "A customer sends an enquiry",
    text: "The customer asks about price, flavour, size, availability or delivery.",
  },
  {
    number: "02",
    title: "The assistant collects the details",
    text: "Sweet Tooth gathers the information needed to create a clear order.",
  },
  {
    number: "03",
    title: "The baker stays in control",
    text: "The baker reviews the order, confirms payment and manages production.",
  },
];

const productFeatures = [
  {
    icon: Bot,
    label: "AI ASSISTANT",
    title: "Turn conversations into structured orders",
    text: "The assistant answers common menu questions, collects requirements and prepares an order summary for the baker.",
    items: [
      "Uses your own menu and bakery rules",
      "Collects size, flavour, date and address",
      "Escalates unclear requests to the baker",
    ],
  },
  {
    icon: PackageCheck,
    label: "ORDER MANAGEMENT",
    title: "Keep every order clear from enquiry to delivery",
    text: "Track the customer, product, payment, production stage and delivery date from one organized workspace.",
    items: [
      "Clear order statuses",
      "Production checklist",
      "Customer and delivery information",
    ],
  },
  {
    icon: WalletCards,
    label: "PAYMENT REVIEW",
    title: "Review payment evidence without losing screenshots",
    text: "Keep JazzCash, Easypaisa, bank transfer and cash-on-delivery information attached to the correct order.",
    items: [
      "Manual baker confirmation",
      "Payment evidence history",
      "Advance and remaining balance tracking",
    ],
  },
  {
    icon: CalendarDays,
    label: "PRODUCTION CALENDAR",
    title: "Know what must be baked and delivered next",
    text: "See upcoming orders, production dates and delivery commitments in one simple calendar.",
    items: [
      "Daily production view",
      "Delivery planning",
      "Capacity awareness",
    ],
  },
];

const faqs = [
  {
    question: "What is Sweet Tooth?",
    answer:
      "Sweet Tooth is an order-management and AI-assistant platform designed for home bakers. It helps organize customer enquiries, orders, payments, customers and delivery schedules.",
  },
  {
    question: "Does the assistant use my bakery menu?",
    answer:
      "Yes. The assistant is designed to answer using the menu, pricing, delivery areas and rules provided by the baker.",
  },
  {
    question: "Will Sweet Tooth automatically confirm payments?",
    answer:
      "No. Payment evidence can be organized and reviewed, but the baker remains responsible for confirming that money has actually been received.",
  },
  {
    question: "Can I take over a customer conversation?",
    answer:
      "Yes. The baker stays in control and can handle a conversation when a customer request needs human attention.",
  },
  {
    question: "Are WhatsApp and Instagram fully connected?",
    answer:
      "The website demonstrates the intended workflow. Full channel integrations should only be advertised after the connections and end-to-end testing are complete.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes. You can begin with a smaller plan and move to a higher plan as your bakery grows.",
  },
];

export default function Home() {
  return (
    <BuyerLayout>
      <HeroSection />
      <TrustStrip />
      <ProblemSection />
      <WorkflowSection />
      <ProductShowcase />
      <ControlSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </BuyerLayout>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:pt-16 md:pb-28 md:pt-24">
      <div className="absolute left-[-120px] top-[-150px] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-100px] h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Built for Pakistan&apos;s home bakers
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Turn every bakery message into an{" "}
            <span className="text-primary">organized order.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg lg:mx-0">
            Sweet Tooth helps home bakers capture customer requirements,
            organize orders, review payments and plan deliveries from one calm
            workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/dashboard/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Start your bakery
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#agent-demo"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-bold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30"
            >
              <Bot className="h-4 w-4 text-primary" />
              Watch the agent demo
            </a>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Baker stays in control
            </span>
          </div>
        </motion.div>

        <div id="agent-demo" className="scroll-mt-24">
          <AgentDemo />
        </div>
      </div>
    </section>
  );
}

function AgentDemo() {
  const [visibleMessages, setVisibleMessages] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisibleMessages((current) =>
        current >= demoMessages.length ? 1 : current + 1,
      );
    }, 1600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.7 }}
      className="relative mx-auto w-full max-w-[650px]"
    >
      <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-primary/5 blur-2xl" />

      <div className="mb-3 flex justify-center lg:justify-start">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Interactive product demo
        </span>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[0_30px_80px_rgba(55,27,70,0.17)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <Bot className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                Sweet Tooth Assistant
              </p>
              <p className="flex items-center gap-1.5 text-xs text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Demo conversation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-700">
              <Instagram className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-[430px] flex-col bg-[hsl(36_45%_98%)] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Hira Khan</p>
                <p className="text-xs text-muted-foreground">
                  Customer enquiry
                </p>
              </div>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                AI assisting
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <AnimatePresence initial={false}>
                {demoMessages.slice(0, visibleMessages).map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.sender === "agent"
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        message.sender === "agent"
                          ? "rounded-bl-md border border-primary/10 bg-primary/10"
                          : "rounded-br-md bg-white"
                      }`}
                    >
                      {message.sender === "agent" && (
                        <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                          <Sparkles className="h-3 w-3" />
                          Sweet Tooth AI
                        </span>
                      )}

                      {message.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {visibleMessages < demoMessages.length && (
                <div className="flex items-center gap-1 pl-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/50" />
                  <span className="ml-1">Assistant is replying</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-white px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Demo only. The assistant uses the baker&apos;s menu and rules.
            </div>
          </div>

          <div className="border-t border-border bg-white p-4 sm:p-5 md:border-l md:border-t-0">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Live order summary</p>
            </div>

            <div className="mt-5 space-y-4">
              <SummaryRow
                label="Product"
                value={
                  visibleMessages >= 2
                    ? "Chocolate birthday cake"
                    : "Collecting..."
                }
              />

              <SummaryRow
                label="Size"
                value={visibleMessages >= 2 ? "2kg" : "Collecting..."}
              />

              <SummaryRow
                label="Delivery"
                value={
                  visibleMessages >= 3
                    ? "Tomorrow · DHA Phase 6"
                    : "Collecting..."
                }
              />

              <SummaryRow
                label="Cake message"
                value={
                  visibleMessages >= 3
                    ? "Happy Birthday Hira"
                    : "Collecting..."
                }
              />

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Order total
                  </span>
                  <span className="font-bold">
                    {visibleMessages >= 4 ? "PKR 4,200" : "—"}
                  </span>
                </div>
              </div>

              <motion.div
                animate={{
                  opacity: visibleMessages >= 4 ? 1 : 0.5,
                  scale: visibleMessages >= 4 ? 1 : 0.98,
                }}
                className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-800"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {visibleMessages >= 4
                  ? "Ready for baker confirmation"
                  : "Collecting order details"}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function TrustStrip() {
  const items = [
    "Built for home bakers",
    "WhatsApp-first workflow",
    "JazzCash & Easypaisa friendly",
    "Baker stays in control",
  ];

  return (
    <section className="border-y border-border bg-white px-4 py-5">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 text-center text-xs font-semibold text-muted-foreground md:grid-cols-4">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="THE PROBLEM"
          title="Baking is already hard. Managing orders should not be."
          text="Sweet Tooth brings scattered conversations, order details, payment evidence and delivery planning into one organized workflow."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(({ icon: Icon, title, text }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.08 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {text}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-border bg-white px-4 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="HOW IT WORKS"
          title="From customer message to clear bakery order"
          text="The assistant helps collect information. The baker still reviews important decisions and remains in control."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {workflow.map((step, index) => (
            <motion.article
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <span className="text-5xl font-bold text-primary/15">
                {step.number}
              </span>
              <h3 className="mt-3 text-2xl font-bold">{step.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                {step.text}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  return (
    <section
      id="features"
      className="scroll-mt-24 px-4 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="ONE CALM WORKSPACE"
          title="Everything a growing home bakery needs"
          text="Designed around the real work of answering customers, managing orders, checking payments and meeting delivery dates."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {productFeatures.map(
            ({ icon: Icon, label, title, text, items }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-70px" }}
                transition={{ delay: index * 0.08 }}
                className="group rounded-3xl border border-border bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.18em] text-primary">
                    {label}
                  </span>
                </div>

                <h3 className="mt-7 text-2xl font-bold leading-tight sm:text-3xl">
                  {title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {text}
                </p>

                <ul className="mt-6 space-y-3">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm font-medium"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                        <Check className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function ControlSection() {
  return (
    <section className="px-4 pb-20 md:pb-28">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[hsl(266_55%_13%)] px-6 py-12 text-white shadow-2xl sm:px-10 md:px-14 md:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
              TRUST & CONTROL
            </span>

            <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Your bakery. Your menu. Your rules.
            </h2>

            <p className="mt-5 max-w-xl leading-8 text-white/70">
              Automation should support the baker, not replace their judgment.
              You control the menu, availability, pricing, payment confirmation
              and customer experience.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                icon: Store,
                text: "The assistant follows your menu and policies.",
              },
              {
                icon: ShieldCheck,
                text: "The baker confirms important actions and payments.",
              },
              {
                icon: UsersRound,
                text: "Unclear requests can be escalated to a human.",
              },
              {
                icon: Bot,
                text: "The assistant can be paused when needed.",
              },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-secondary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-white/90">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="FREQUENTLY ASKED QUESTIONS"
          title="Clear answers before you begin"
          text="Everything you should know about Sweet Tooth and the bakery workflow."
        />

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <FaqItem key={faq.question} {...faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
      >
        <span className="font-bold">{question}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {open ? "−" : "+"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground sm:px-6 sm:pb-6">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-primary/10 bg-primary/5 px-6 py-14 text-center sm:px-10 md:py-20">
        <Sparkles className="mx-auto h-7 w-7 text-primary" />

        <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Spend more time baking. Less time chasing messages.
        </h2>

        <p className="mx-auto mt-5 max-w-xl leading-8 text-muted-foreground">
          Create your bakery workspace or book a demo using your real order
          process.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard/register"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
          >
            Create your bakery
            <ArrowRight className="h-4 w-4" />
          </Link>

          <a
            href={whatsappSupportLink(
              "Assalam-o-Alaikum! I would like to book a Sweet Tooth demo for my bakery.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-green-600/20 bg-white px-6 py-3 text-sm font-bold text-green-800 transition hover:-translate-y-0.5 hover:bg-green-50"
          >
            <MessageCircle className="h-4 w-4" />
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
        {text}
      </p>
    </div>
  );
}