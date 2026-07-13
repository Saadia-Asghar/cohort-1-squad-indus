import { Link } from "wouter";

export function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold text-primary">Sweet Tooth</span>
          </Link>
          <div className="flex gap-6 items-center">
            <Link href="/bakers" className="text-sm font-medium hover:text-primary transition-colors">Find Bakers</Link>
            <Link href="/cart" className="text-sm font-medium hover:text-primary transition-colors">Cart</Link>
            <Link href="/orders" className="text-sm font-medium hover:text-primary transition-colors">Orders</Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-card py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="font-serif text-2xl font-bold text-primary mb-2">Sweet Tooth</p>
          <p className="text-muted-foreground">Ghar ka meetha.</p>
        </div>
      </footer>
    </div>
  );
}
