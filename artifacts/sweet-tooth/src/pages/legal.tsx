import { Link } from "wouter";
import type { ReactNode } from "react";

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">← Back to Sweet Tooth</Link>
        <h1 className="mt-6 font-serif text-4xl font-bold text-primary">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">{children}</div>
      </article>
    </main>
  );
}

export function PrivacyPolicy() {
  return <LegalLayout title="Privacy Policy">
    <section><h2 className="text-lg font-bold text-foreground">What we collect</h2><p>Sweet Tooth stores bakery account details, menu information, order details, customer contact details, delivery information, payment-status records, and chat history needed to operate each bakery.</p></section>
    <section><h2 className="text-lg font-bold text-foreground">How data is used</h2><p>Information is used to manage menus, orders, delivery, customer support, analytics, and the bakery’s configured messaging assistant. We do not sell customer data.</p></section>
    <section><h2 className="text-lg font-bold text-foreground">Access and retention</h2><p>Each bakery can access only its own operational records. Bakery owners control staff access. Payment screenshots are used for manual verification and should not be treated as automatic payment approval.</p></section>
    <section><h2 className="text-lg font-bold text-foreground">Contact</h2><p>For privacy or account requests, contact the Sweet Tooth team through the <Link href="/contact" className="font-semibold text-primary hover:underline">support page</Link>.</p></section>
  </LegalLayout>;
}

export function TermsOfService() {
  return <LegalLayout title="Terms of Service">
    <section><h2 className="text-lg font-bold text-foreground">Service</h2><p>Sweet Tooth provides menu, order-management, customer-communication, and bakery operations tools. Bakers remain responsible for their menus, prices, ingredients, food safety, delivery commitments, and customer communication.</p></section>
    <section><h2 className="text-lg font-bold text-foreground">Orders and payments</h2><p>Orders are placed with an individual bakery. Payment screenshots and OCR are advisory; the bakery must verify payment before fulfilling an order. Refund and cancellation decisions follow the bakery policy displayed on its menu.</p></section>
    <section><h2 className="text-lg font-bold text-foreground">Assistant limits</h2><p>The messaging assistant answers from the bakery’s menu and policies. It must not be relied on for medical, allergy-safety, legal, or payment guarantees. Bakers should review and update their menu and availability settings.</p></section>
    <section><h2 className="text-lg font-bold text-foreground">Support</h2><p>Support hours and contact details are published on the <Link href="/contact" className="font-semibold text-primary hover:underline">support page</Link>.</p></section>
  </LegalLayout>;
}
