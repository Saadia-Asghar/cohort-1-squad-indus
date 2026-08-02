import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Instagram,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Store,
  WalletCards,
} from "lucide-react";

import { BuyerLayout } from "@/components/layout/buyer-layout";
import { PricingSection } from "@/components/marketing/pricing-section";
import { whatsappSupportLink } from "@/lib/support";

const storySteps = [
  {
    number: "01",
    label: "The enquiry",
    title: "A customer sends a message.",
    text: "Sweet Tooth receives the customer’s question and begins collecting the information needed for the order.",
  },
  {
    number: "02",
    label: "The conversation",
    title: "The assistant asks the right questions.",
    text: "Flavour, size, delivery date, cake message and location are collected using the bakery’s own menu and rules.",
  },
  {
    number: "03",
    label: "The order",
    title: "The conversation becomes an order.",
    text: "Instead of remaining buried inside chat history, the information is converted into a structured order for the baker.",
  },
  {
    number: "04",
    label: "The payment",
    title: "Payment evidence stays attached.",
    text: "The baker can review payment information without searching through screenshots and separate customer conversations.",
  },
  {
    number: "05",
    label: "The schedule",
    title: "Production becomes clear.",
    text: "Once confirmed, the order moves into the bakery calendar so preparation and delivery deadlines remain visible.",
  },
];

const capabilities = [
  {
    number: "01",
    icon: Bot,
    title: "Bakery assistant",
    text: "Answers common questions using your menu, prices, delivery areas and bakery policies.",
  },
  {
    number: "02",
    icon: PackageCheck,
    title: "Order management",
    text: "Keeps every product, customer detail, cake message and delivery requirement together.",
  },
  {
    number: "03",
    icon: WalletCards,
    title: "Payment review",
    text: "Connects advance-payment evidence and remaining balances with the correct order.",
  },
  {
    number: "04",
    icon: CalendarDays,
    title: "Production calendar",
    text: "Shows what needs to be prepared, completed and delivered next.",
  },
];

const demoMessages = [
  {
    sender: "customer",
    text: "Assalam-o-Alaikum. Kal ke liye 2kg chocolate cake available hai?",
  },
  {
    sender: "assistant",
    text: "Wa Alaikum Assalam. Yes. Please share the cake message and delivery area.",
  },
  {
    sender: "customer",
    text: "Happy Birthday Hira. Delivery DHA Phase 6 mein chahiye.",
  },
  {
    sender: "customer",
    text: "Advance payment sent through JazzCash.",
  },
  {
    sender: "assistant",
    text: "Your order information is ready for the baker to review.",
  },
];

export default function Home() {
  return (
    <BuyerLayout>
      <HeroSection />
      <MovingStatement />
      <ScrollStory />
      <CapabilitiesSection />
      <ControlSection />
      <PricingSection />
      <FinalSection />
    </BuyerLayout>
  );
}

function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#f5f0e9] text-[#1b1519] lg:min-h-[calc(100svh-4rem)]"
    >
      <div className="absolute inset-0 hidden lg:block">
        <div
          className="absolute inset-y-0 left-0 w-[64%] bg-[#54152f]"
          style={{
            clipPath: "ellipse(84% 108% at 0% 50%)",
          }}
        />

        <div className="absolute inset-y-0 left-[46%] w-px bg-[#54152f]/15" />
      </div>

      <div className="absolute inset-x-0 top-0 h-[64%] bg-[#54152f] lg:hidden" />

      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
        }}
      />

      <div className="relative mx-auto min-h-[calc(100svh-4rem)] max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 md:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-30 flex items-center justify-between"
        >
          <div className="text-white">
            <p className="font-serif text-xl font-semibold leading-none sm:text-3xl">
              Sweet/
            </p>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.28em] text-white/45">
              AI for home bakers
            </p>
          </div>

          <div className="text-right text-white lg:text-[#54152f]">
            <p className="font-serif text-xl font-semibold leading-none sm:text-3xl">
              /Tooth
            </p>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.28em] opacity-45">
              Order intelligence
            </p>
          </div>
        </motion.div>

        <div className="relative mt-6 grid min-h-[calc(100svh-8rem)] items-center sm:mt-8 lg:min-h-[calc(100svh-10rem)] lg:grid-cols-2">
          <motion.div
            className="relative z-20 pb-[315px] pt-8 text-white sm:pb-[455px] sm:pt-12 lg:pb-0 lg:pr-32 lg:pt-0"
          >
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.75,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center gap-3 sm:gap-4"
            >
              <span className="h-px w-8 bg-[#e5b671] sm:w-12" />

              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#e5b671] sm:text-[9px] sm:tracking-[0.27em]">
                One connected bakery workspace
              </p>
            </motion.div>

            <div className="mt-7 sm:mt-10">
              <HeroLine text="Smart" delay={0.05} />
              <HeroLine text="baking," delay={0.14} accent />
              <HeroLine text="without the" delay={0.23} />
              <HeroLine text="busywork." delay={0.32} />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.62 }}
              className="mt-6 max-w-[470px] border-l border-[#e5b671]/55 pl-4 text-[13px] leading-6 text-white/68 sm:mt-9 sm:pl-6 sm:text-base sm:leading-8"
            >
              Sweet Tooth turns customer conversations into organized orders,
              payment records and production plans while keeping the baker in
              control.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.76 }}
              className="mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row"
            >
              <Link
                href="/dashboard/register"
                className="group inline-flex min-h-[50px] w-full items-center justify-center gap-4 bg-[#f5f0e9] px-5 py-3 text-sm font-bold text-[#54152f] transition duration-300 hover:bg-[#e5b671] hover:text-[#1b1519] sm:min-h-[54px] sm:w-auto sm:gap-6 sm:px-8 sm:py-4"
              >
                Start your bakery

                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <a
                href="#product-story"
                className="group inline-flex min-h-[50px] w-full items-center justify-center gap-4 border border-white/25 px-5 py-3 text-sm font-bold transition duration-300 hover:border-[#e5b671] hover:text-[#e5b671] sm:min-h-[54px] sm:w-auto sm:gap-5 sm:px-8 sm:py-4"
              >
                See the workflow

                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
              </a>
            </motion.div>
          </motion.div>

          <div className="relative z-10 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.85, delay: 0.45 }}
              className="hidden text-[#54152f] lg:relative lg:top-auto lg:block lg:w-full"
            >
              <div className="ml-auto max-w-[330px] border-t border-[#54152f]/20 pt-6 lg:max-w-[360px]">
                <p className="font-serif text-6xl font-semibold leading-none tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                  01
                </p>

                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.23em] text-[#54152f]/55">
                  Clear workspace for every order
                </p>
              </div>

              <div className="ml-auto mt-20 max-w-[330px] border-t border-[#54152f]/20 pt-6 lg:mt-32 lg:max-w-[360px]">
                <p className="font-serif text-6xl font-semibold leading-none tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                  05
                </p>

                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.23em] text-[#54152f]/55">
                  Connected stages from message to delivery
                </p>
              </div>
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
            className="absolute bottom-[58px] left-1/2 z-20 w-[70vw] max-w-[275px] -translate-x-1/2 sm:bottom-[45px] sm:w-[410px] sm:max-w-none lg:bottom-auto lg:left-[51%] lg:top-1/2 lg:w-[480px] lg:-translate-y-1/2 xl:w-[550px]"
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
                className="absolute inset-[6%] rounded-full bg-[#e5b671]/35 blur-[55px]"
              />

              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [-8, 8, -8],
                      }
                }
                transition={{
                  duration: 5.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative aspect-square overflow-hidden rounded-full border-[7px] border-[#f5f0e9] bg-[#f5f0e9] shadow-[0_28px_70px_rgba(30,9,19,0.3)] sm:border-[14px] sm:shadow-[0_40px_100px_rgba(30,9,19,0.32)]"
              >
                <img
                  src="/sweet-tooth-cake-hero.png"
                  alt="Elegant custom cake made by a home baker"
                  className="h-full w-full scale-[1.08] object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-tr from-[#54152f]/20 via-transparent to-white/15" />
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
                className="absolute inset-[-5%] rounded-full border border-dashed border-[#e5b671]/65"
              >
                <span className="absolute left-1/2 top-[-5px] h-3 w-3 -translate-x-1/2 rounded-full bg-[#e5b671] shadow-[0_0_22px_rgba(229,182,113,0.9)]" />
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
                className="absolute -left-2 top-[12%] max-w-[145px] border border-white/15 bg-[#24131c]/92 px-3 py-2.5 text-white shadow-2xl backdrop-blur-xl sm:-left-14 sm:max-w-none sm:px-4 sm:py-3"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#e5b671]">
                  New enquiry
                </p>

                <p className="mt-2 text-xs font-semibold">
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
                className="absolute -right-2 bottom-[14%] max-w-[145px] bg-[#f5f0e9] px-3 py-2.5 text-[#54152f] shadow-2xl sm:-right-14 sm:bottom-[18%] sm:max-w-none sm:px-4 sm:py-3"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-55">
                  Order ready
                </p>

                <p className="mt-2 text-xs font-bold">
                  Tomorrow · DHA 6
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="absolute bottom-8 left-5 z-30 hidden items-center gap-4 lg:flex lg:left-20"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#e5b671]" />

          <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-white/40">
            Scroll to explore the workflow
          </p>
        </motion.div>
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
    <div className="overflow-hidden">
      <motion.h1
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{
          duration: 0.9,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`font-serif text-[2.85rem] font-semibold leading-[0.88] tracking-[-0.055em] min-[390px]:text-[3.2rem] sm:text-[5rem] md:text-[5.8rem] lg:text-[5.6rem] xl:text-[6.6rem] ${
          accent ? "italic text-[#e5b671]" : ""
        }`}
      >
        {text}
      </motion.h1>
    </div>
  );
}

function MovingStatement() {
  const statements = [
    "CUSTOMER MESSAGE",
    "ORDER DETAILS",
    "PAYMENT REVIEW",
    "PRODUCTION PLAN",
    "DELIVERY",
  ];

  return (
    <div className="overflow-hidden border-y border-[#6f2d4a]/15 bg-[#eadfd3] py-3.5 text-[#6f2d4a] sm:py-5">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex w-max items-center"
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {statements.map((statement) => (
              <div
                key={`${copy}-${statement}`}
                className="flex items-center"
              >
                <p className="px-5 text-[8px] font-bold uppercase tracking-[0.2em] text-[#6f2d4a]/70 sm:px-12 sm:text-[10px] sm:tracking-[0.25em]">
                  {statement}
                </p>

                <span className="h-1.5 w-1.5 rotate-45 bg-[#c68b4f]" />
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function ScrollStory() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id="product-story"
      className="scroll-mt-16 bg-[#f7f2ea] text-[#2b2327]"
    >
      <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="grid gap-5 border-b border-[#6f2d4a]/15 pb-10 sm:gap-8 sm:pb-14 lg:grid-cols-[0.8fr_1.2fr] lg:pb-16"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d9a766]">
            From conversation to delivery
          </p>

          <h2 className="max-w-4xl font-serif text-[2.55rem] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-5xl md:text-6xl lg:text-7xl">
            Watch one customer message become a complete bakery workflow.
          </h2>
        </motion.div>

        <div className="mt-12 hidden grid-cols-[0.72fr_1.28fr] gap-10 lg:grid xl:gap-14">
          <div>
            {storySteps.map((step, index) => (
              <StoryStep
                key={step.number}
                step={step}
                index={index}
                activeStep={activeStep}
                onActive={setActiveStep}
              />
            ))}
          </div>

          <div className="relative">
            <div className="sticky top-20 flex h-[calc(100vh-6rem)] min-h-[520px] max-h-[680px] items-center">
              <ProductStage activeStep={activeStep} />
            </div>
          </div>
        </div>

        <div className="mt-10 lg:hidden">
          <div className="sticky top-16 z-30 -mx-4 border-y border-[#6f2d4a]/10 bg-[#f7f2ea]/95 px-4 py-3 shadow-[0_14px_35px_rgba(83,45,61,0.08)] backdrop-blur-xl sm:-mx-7 sm:px-7">
            <MobileStoryPreview activeStep={activeStep} />
          </div>

          <div className="mt-8">
            {storySteps.map((step, index) => (
              <MobileStoryStep
                key={step.number}
                step={step}
                index={index}
                activeStep={activeStep}
                onActive={setActiveStep}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileStoryStep({
  step,
  index,
  activeStep,
  onActive,
}: {
  step: (typeof storySteps)[number];
  index: number;
  activeStep: number;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  const inView = useInView(ref, {
    margin: "-32% 0px -52% 0px",
  });

  useEffect(() => {
    if (inView) {
      onActive(index);
    }
  }, [inView, index, onActive]);

  const active = activeStep === index;

  return (
    <motion.article
      ref={ref}
      animate={{
        opacity: active ? 1 : 0.35,
        y: active ? 0 : 12,
      }}
      transition={{ duration: 0.35 }}
      className="flex min-h-[62svh] items-center border-b border-[#6f2d4a]/15 py-12"
    >
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.span
              animate={{
                rotate: active ? 45 : 0,
                scale: active ? 1 : 0.75,
              }}
              className={`h-2.5 w-2.5 ${
                active ? "bg-[#9f3156]" : "bg-[#6f2d4a]/25"
              }`}
            />

            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9f3156]">
              {step.label}
            </p>
          </div>

          <p className="font-serif text-xl text-[#6f2d4a]/45">
            {step.number}
          </p>
        </div>

        <h3 className="mt-6 max-w-[330px] font-serif text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.025em]">
          {step.title}
        </h3>

        <p className="mt-5 max-w-[340px] text-sm leading-7 text-[#6f6468]">
          {step.text}
        </p>

        <div className="mt-7 flex gap-1.5">
          {storySteps.map((item, itemIndex) => (
            <span
              key={item.number}
              className={`h-1 flex-1 transition-all duration-500 ${
                itemIndex === activeStep
                  ? "bg-[#9f3156]"
                  : itemIndex < activeStep
                    ? "bg-[#d9a766]"
                    : "bg-[#6f2d4a]/15"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function StoryStep({
  step,
  index,
  activeStep,
  onActive,
}: {
  step: (typeof storySteps)[number];
  index: number;
  activeStep: number;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const inView = useInView(ref, {
    margin: "-43% 0px -43% 0px",
  });

  useEffect(() => {
    if (inView) {
      onActive(index);
    }
  }, [inView, index, onActive]);

  const active = activeStep === index;

  return (
    <div
      ref={ref}
      className="flex min-h-[72vh] items-center border-l border-[#6f2d4a]/15 pl-9"
    >
      <motion.div
        animate={{
          opacity: active ? 1 : 0.28,
          x: active ? 0 : -8,
        }}
        transition={{ duration: 0.35 }}
        className="max-w-md"
      >
        <div className="flex items-center gap-5">
          <span
            className={`h-2.5 w-2.5 rotate-45 transition-colors duration-300 ${
              active ? "bg-[#d9a766]" : "bg-white/20"
            }`}
          />

          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d9a766]">
            {step.label}
          </p>

          <p className="ml-auto font-serif text-xl text-[#6f2d4a]/35">
            {step.number}
          </p>
        </div>

        <h3 className="mt-8 font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.03em]">
          {step.title}
        </h3>

        <p className="mt-6 text-base leading-8 text-[#6f6468]">
          {step.text}
        </p>
      </motion.div>
    </div>
  );
}

function ProductStage({ activeStep }: { activeStep: number }) {
  const visibleMessages = demoMessages.slice(
    0,
    Math.min(activeStep + 1, demoMessages.length),
  );

  return (
    <div className="w-full max-h-[calc(100vh-6rem)] overflow-hidden rounded-[24px] border border-[#6f2d4a]/15 bg-[#fffaf4] shadow-[0_30px_80px_rgba(83,45,61,0.12)]">
      <div className="flex items-center justify-between border-b border-[#6f2d4a]/10 px-5 py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6f2d4a] text-[#fffaf4]">
            <span className="font-serif text-sm font-bold">ST</span>
          </div>

          <div>
            <p className="text-sm font-bold">Sweet Tooth workspace</p>

            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#776b70]">
              Interactive product demonstration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {storySteps.map((step, index) => (
            <span
              key={step.number}
              className={`h-1.5 transition-all duration-500 ${
                index === activeStep
                  ? "w-8 bg-[#d9a766]"
                  : index < activeStep
                    ? "w-4 bg-[#9f3156]"
                    : "w-4 bg-[#6f2d4a]/15"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid min-h-[500px] max-h-[580px] grid-cols-[0.9fr_1.1fr]">
        <div className="flex min-h-0 flex-col border-r border-[#6f2d4a]/10 bg-[#f0e5da] p-5">
          <div className="flex items-center justify-between border-b border-[#6f2d4a]/10 pb-5">
            <div>
              <p className="text-sm font-bold">Hira Khan</p>

              <p className="mt-1 text-xs text-[#776b70]">
                Customer conversation
              </p>
            </div>

            <div className="flex items-center gap-3 text-[#6f6468]">
              <MessageCircle className="h-4 w-4" />
              <Instagram className="h-4 w-4" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden py-4">
            <AnimatePresence initial={false}>
              {visibleMessages.map((message, index) => (
                <motion.div
                  key={`${message.sender}-${index}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className={`flex ${
                    message.sender === "assistant"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[88%] px-4 py-3 text-xs leading-6 ${
                      message.sender === "assistant"
                        ? "bg-[#6f2d4a] text-white"
                        : "border border-[#6f2d4a]/15 bg-[#fffdf8] text-[#2b2327]"
                    }`}
                  >
                    {message.sender === "assistant" && (
                      <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.2em] text-[#f3d7a8]">
                        Sweet Tooth
                      </p>
                    )}

                    {message.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 border-t border-[#6f2d4a]/10 pt-5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#d9a766]" />

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#776b70]">
              Assistant following bakery rules
            </p>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-[#fffdf8] p-5 text-[#2b2327]">
          <AnimatePresence mode="wait">
            {activeStep === 4 ? (
              <CalendarPanel key="calendar" />
            ) : (
              <OrderPanel key="order" activeStep={activeStep} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function OrderPanel({ activeStep }: { activeStep: number }) {
  const product =
    activeStep >= 1 ? "Chocolate birthday cake" : "Collecting details";

  const size = activeStep >= 1 ? "2kg" : "Not provided";
  const delivery = activeStep >= 2 ? "Tomorrow · DHA Phase 6" : "Not provided";
  const message = activeStep >= 2 ? "Happy Birthday Hira" : "Not provided";

  const status =
    activeStep >= 3
      ? "Waiting for baker confirmation"
      : activeStep >= 2
        ? "Order draft created"
        : "Information being collected";

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-start justify-between border-b border-[#1d1519]/15 pb-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9f3156]">
            Order intelligence
          </p>

          <h3 className="mt-2 font-serif text-3xl font-semibold">
            Order #ST-1048
          </h3>
        </div>

        <PackageCheck className="h-5 w-5 text-[#9f3156]" />
      </div>

      <div className="mt-4 bg-[#6f2d4a] p-4 text-white">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d9a766]">
          Current status
        </p>

        <p className="mt-3 font-serif text-2xl leading-tight">{status}</p>
      </div>

      <div className="mt-5 divide-y divide-[#1d1519]/12 border-y border-[#1d1519]/12">
        <OrderDetail label="Product" value={product} />
        <OrderDetail label="Size" value={size} />
        <OrderDetail label="Delivery" value={delivery} />
        <OrderDetail label="Cake message" value={message} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="border border-[#1d1519]/15 p-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#786b70]">
            Total
          </p>

          <p className="mt-3 font-serif text-2xl font-semibold">
            {activeStep >= 2 ? "PKR 4,200" : "—"}
          </p>
        </div>

        <div className="border border-[#1d1519]/15 p-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#786b70]">
            Payment
          </p>

          <p className="mt-3 text-sm font-bold">
            {activeStep >= 3 ? "Evidence received" : "Not received"}
          </p>
        </div>
      </div>

      <motion.div
        animate={{
          opacity: activeStep >= 3 ? 1 : 0.35,
        }}
        className="mt-4 flex items-center gap-3 border border-[#9f3156]/20 bg-[#9f3156]/[0.07] p-3"
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#9f3156]" />

        <p className="text-xs font-semibold">
          The baker confirms whether payment has been received.
        </p>
      </motion.div>
    </motion.div>
  );
}

function OrderDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[0.75fr_1.25fr] gap-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#786b70]">
        {label}
      </p>

      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function CalendarPanel() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const dates = [12, 13, 14, 15, 16, 17, 18];

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-start justify-between border-b border-[#1d1519]/15 pb-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9f3156]">
            Production calendar
          </p>

          <h3 className="mt-2 font-serif text-3xl font-semibold">
            This week
          </h3>
        </div>

        <CalendarDays className="h-5 w-5 text-[#9f3156]" />
      </div>

      <div className="mt-5 grid grid-cols-7 border-l border-t border-[#1d1519]/15">
        {days.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="border-b border-r border-[#1d1519]/15 py-3 text-center text-[9px] font-bold uppercase text-[#786b70]"
          >
            {day}
          </div>
        ))}

        {dates.map((date) => (
          <div
            key={date}
            className={`min-h-20 border-b border-r border-[#1d1519]/15 p-2 ${
              date === 18 ? "bg-[#9f3156] text-white" : ""
            }`}
          >
            <p className="text-xs font-bold">{date}</p>

            {date === 18 && (
              <p className="mt-3 text-[8px] font-bold uppercase leading-4 tracking-[0.12em] text-[#2b2327]/75">
                Hira
                <br />
                2kg cake
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-4 border border-[#1d1519]/15 p-4">
          <Clock3 className="h-5 w-5 shrink-0 text-[#9f3156]" />

          <div>
            <p className="text-sm font-bold">Preparation deadline</p>

            <p className="mt-1 text-xs text-[#786b70]">
              Complete decoration before delivery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#6f2d4a] p-4 text-white">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#d9a766]" />

          <div>
            <p className="text-sm font-bold">Workflow completed</p>

            <p className="mt-1 text-xs text-[#6f6468]">
              Conversation, order, payment and schedule connected
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MobileStoryPreview({
  activeStep,
}: {
  activeStep: number;
}) {
  const labels = [
    "Customer enquiry",
    "Information collected",
    "Order created",
    "Payment review",
    "Production scheduled",
  ];

  const titles = [
    "New customer message",
    "Details being collected",
    "Structured order ready",
    "Waiting for confirmation",
    "Added to production",
  ];

  const descriptions = [
    "“Kal ke liye 2kg chocolate cake available hai?”",
    "Chocolate cake · 2kg · DHA Phase 6",
    "Order #ST-1048 · PKR 4,200",
    "JazzCash evidence received",
    "Delivery added to tomorrow",
  ];

  const icons = [
    MessageCircle,
    Bot,
    PackageCheck,
    WalletCards,
    CalendarDays,
  ];

  const Icon = icons[activeStep];

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#6f2d4a]/15 bg-[#fffaf4] text-[#2b2327] shadow-[0_18px_50px_rgba(83,45,61,0.1)]">
      <div className="flex items-center justify-between border-b border-[#6f2d4a]/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <motion.span
            key={`icon-${activeStep}`}
            initial={{ scale: 0.75, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6f2d4a] text-[#fffaf4]"
          >
            <Icon className="h-4 w-4" />
          </motion.span>

          <div className="min-w-0">
            <p className="truncate text-[8px] font-bold uppercase tracking-[0.17em] text-[#9f3156]">
              Sweet Tooth workflow
            </p>

            <AnimatePresence mode="wait">
              <motion.p
                key={labels[activeStep]}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="mt-1 truncate text-xs font-bold"
              >
                {labels[activeStep]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <p className="font-serif text-lg text-[#d9a766]">
          0{activeStep + 1}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="m-3 rounded-[13px] bg-[#f0e5da] p-4"
        >
          <p className="font-serif text-[1.45rem] font-semibold leading-tight">
            {titles[activeStep]}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#6f6468]">
            {descriptions[activeStep]}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-[#6f2d4a]/12 pt-3">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[#9f3156]" />

              <p className="text-[10px] font-semibold">
                Baker remains in control
              </p>
            </div>

            <div className="flex gap-1">
              {storySteps.map((step, index) => (
                <span
                  key={step.number}
                  className={`h-1 w-4 rounded-full transition-all duration-500 ${
                    index === activeStep
                      ? "bg-[#9f3156]"
                      : index < activeStep
                        ? "bg-[#d9a766]"
                        : "bg-[#6f2d4a]/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CapabilitiesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-[#f7f2ea] px-4 py-16 text-[#1d1519] sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20 lg:py-32"
    >
      <div className="mx-auto max-w-[1360px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-5 sm:gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9f3156]">
            One connected workspace
          </p>

          <h2 className="max-w-5xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.035em] sm:text-6xl md:text-7xl">
            The business side of baking, beautifully under control.
          </h2>
        </motion.div>

        <div className="mt-12 border-t border-[#1d1519]/20 sm:mt-16 lg:mt-20">
          {capabilities.map(
            ({ number, icon: Icon, title, text }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.05 }}
                className="group grid grid-cols-[42px_1fr] gap-x-4 gap-y-3 border-b border-[#1d1519]/20 py-7 sm:grid-cols-[52px_1fr] sm:py-9 md:grid-cols-[80px_80px_0.85fr_1fr] md:items-center md:gap-6"
              >
                <p className="font-serif text-xl text-[#9f3156] sm:text-2xl">
                  {number}
                </p>

                <Icon
                  className="h-5 w-5 text-[#9f3156] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110 sm:h-6 sm:w-6"
                  strokeWidth={1.6}
                />

                <h3 className="col-start-2 font-serif text-2xl font-semibold sm:text-3xl md:col-start-auto md:text-4xl">
                  {title}
                </h3>

                <p className="col-span-2 max-w-xl text-[13px] leading-6 text-[#6b5e64] sm:text-sm sm:leading-7 md:col-span-1 md:text-base">
                  {text}
                </p>
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
    <section className="bg-[#eadce1] px-4 py-16 text-[#2b2327] sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20 lg:py-32">
      <div className="mx-auto grid max-w-[1360px] gap-10 sm:gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6f2d4a]">
            Built around trust
          </p>

          <h2 className="mt-5 max-w-4xl font-serif text-[2.55rem] font-semibold leading-[0.96] tracking-[-0.035em] sm:mt-8 sm:text-5xl md:text-6xl lg:text-7xl">
            The assistant supports your judgment. It does not replace it.
          </h2>
        </motion.div>

        <div className="border-t border-[#6f2d4a]/15">
          {[
            {
              icon: Store,
              text: "Uses the bakery’s own menu, prices and policies.",
            },
            {
              icon: ShieldCheck,
              text: "The baker confirms important actions and payments.",
            },
            {
              icon: Bot,
              text: "Unclear customer requests can be handed to a human.",
            },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-5 border-b border-[#6f2d4a]/15 py-6"
            >
              <Icon className="h-5 w-5 shrink-0 text-[#6f2d4a]" />

              <p className="text-sm leading-7 text-[#6f6468]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="bg-[#f7f2ea] px-4 py-16 text-[#1d1519] sm:px-7 sm:py-20 md:px-10 md:py-28 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1360px]">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 border-y border-[#1d1519]/20 py-10 sm:gap-12 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end lg:py-16"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9f3156]">
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
              href="/dashboard/register"
              className="group inline-flex min-h-12 w-full items-center justify-center gap-4 bg-[#1d1519] px-5 py-3 text-sm font-bold text-white transition-colors duration-300 hover:bg-[#9f3156] sm:min-h-14 sm:px-8 sm:py-4 lg:w-auto lg:gap-6"
            >
              Create your bakery

              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <a
              href={whatsappSupportLink(
                "Assalam-o-Alaikum! I would like to book a Sweet Tooth demo for my bakery.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-4 border border-[#1d1519]/25 px-5 py-3 text-sm font-bold transition-colors duration-300 hover:border-[#9f3156] hover:text-[#9f3156] sm:min-h-14 sm:px-8 sm:py-4 lg:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Book a demonstration
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}