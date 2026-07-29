import { Link } from "wouter";

export function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold text-primary">Sweet Tooth</span>
          </Link>
          <div className="flex items-center gap-5">
            <a href="/#how-it-works" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary md:inline">How it works</a>
            <a href="/#pricing" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary md:inline">Pricing</a>
            <Link href="/contact" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary md:inline">Contact</Link>
            <Link
              href="/dashboard/login"
              className="text-sm font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
            >
              Baker portal
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-card py-12 mt-16">
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 text-left md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div><p className="mb-2 font-serif text-2xl font-bold text-primary">Sweet Tooth</p><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">The calm operating system for Pakistan&apos;s home bakers: one menu, one bakery agent, and one place for every order.</p></div>
          <div><p className="mb-3 text-sm font-bold text-foreground">Platform</p><div className="space-y-2 text-sm text-muted-foreground"><a href="/#pricing" className="block hover:text-primary">Plans and pricing</a><Link href="/dashboard/register" className="block hover:text-primary">Create baker account</Link><Link href="/dashboard/login" className="block hover:text-primary">Baker portal</Link></div></div>
          <div><p className="mb-3 text-sm font-bold text-foreground">Support</p><div className="space-y-2 text-sm text-muted-foreground"><Link href="/contact" className="block hover:text-primary">Contact the team</Link><a href="/#how-it-works" className="block hover:text-primary">How it works</a><Link href="/privacy" className="block hover:text-primary">Privacy Policy</Link><Link href="/terms" className="block hover:text-primary">Terms of Service</Link></div></div>
        </div>
      </footer>
    </div>
  );
}
