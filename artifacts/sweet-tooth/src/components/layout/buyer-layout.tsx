import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import {
  ChevronRight,
  Mail,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";

import { SUPPORT_EMAIL, whatsappSupportLink } from "@/lib/support";

const navigation = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-[68px] max-w-[1220px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="flex min-w-0 items-center"
            aria-label="Sweet Tooth home"
          >
            <img
              src="/sweet-tooth-logo.png"
              alt="Sweet Tooth — AI Assistant for Bakeries"
              className="h-11 w-auto max-w-[188px] object-contain sm:h-12 sm:max-w-[205px]"
            />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </a>
            ))}

            <Link
              href="/contact"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Contact
            </Link>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/dashboard/login"
              className="px-3 py-2 text-sm font-bold text-foreground transition-colors hover:text-primary"
            >
              Baker sign in
            </Link>

            <Link
              href="/waitlist"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Join waitlist
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/review"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              Review
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm sm:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-border bg-background sm:hidden"
            >
              <div className="space-y-2 px-4 py-5">
                {navigation.map((item, index) => (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    onClick={closeMobileMenu}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-bold text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.a>
                ))}

                <Link
                  href="/contact"
                  onClick={closeMobileMenu}
                  className="flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-bold text-foreground hover:bg-primary/5 hover:text-primary"
                >
                  Contact
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <Link
                    href="/waitlist"
                    onClick={closeMobileMenu}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                  >
                    Join waitlist
                  </Link>
                  <Link
                    href="/review"
                    onClick={closeMobileMenu}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-bold"
                  >
                    Review the app
                  </Link>
                </div>
                <Link
                  href="/dashboard/login"
                  onClick={closeMobileMenu}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-muted-foreground"
                >
                  Already invited? Baker sign in
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-[1220px] px-4 py-12 sm:px-6 md:py-14 lg:px-8">
          <div className="grid gap-9 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] lg:gap-11">
            <div>
              <Link href="/" className="inline-flex items-center" aria-label="Sweet Tooth home">
                <img
                  src="/sweet-tooth-logo.png"
                  alt="Sweet Tooth — AI Assistant for Bakeries"
                  className="h-14 w-auto max-w-[245px] object-contain"
                />
              </Link>

              <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
                A workspace for Pakistan&apos;s home bakers to take orders on
                WhatsApp, Instagram, and a menu they share — not a customer mall.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <a
                  href={whatsappSupportLink(
                    "Assalam-o-Alaikum! I would like to learn more about Sweet Tooth.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Contact Sweet Tooth on WhatsApp"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-green-700 transition hover:-translate-y-0.5 hover:bg-green-50"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  aria-label={`Email ${SUPPORT_EMAIL}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary transition hover:-translate-y-0.5 hover:bg-primary/5"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <FooterColumn
              title="Product"
              links={[
                { label: "How it works", href: "/#how-it-works" },
                { label: "Features", href: "/#features" },
                { label: "Pricing", href: "/#pricing" },
                { label: "FAQ", href: "/#faq" },
              ]}
            />

            <FooterColumn
              title="For bakers"
              links={[
                {
                  label: "Join the waitlist",
                  href: "/waitlist",
                },
                {
                  label: "Already invited? Sign in",
                  href: "/dashboard/login",
                },
                {
                  label: "Book a demo",
                  href: whatsappSupportLink(
                    "Assalam-o-Alaikum! I would like to book a Sweet Tooth demo for my bakery.",
                  ),
                  external: true,
                },
              ]}
            />

            <FooterColumn
              title="Company"
              links={[
                { label: "Contact", href: "/contact" },
                { label: "Review the app", href: "/review" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ]}
            />
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Sweet Tooth. All rights reserved.
            </p>

            <p>Made for Pakistan&apos;s home-baking community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-foreground">{title}</p>

      <div className="mt-4 space-y-3">
        {links.map((link) =>
          link.external ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="block text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
