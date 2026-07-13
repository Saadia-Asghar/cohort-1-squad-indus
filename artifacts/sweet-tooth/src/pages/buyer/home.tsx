import { useState } from "react";
import { useLocation } from "wouter";
import { BuyerLayout } from "@/components/layout/buyer-layout";
import {
  useGetFeaturedBakers,
  useGetCategories,
  useSearchMarketplace,
  getGetFeaturedBakersQueryKey,
  getGetCategoriesQueryKey,
  getSearchMarketplaceQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, MapPin, Star, ChevronRight, Cake, Cookie, Coffee } from "lucide-react";

const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad"];

const CATEGORY_ICONS: Record<string, typeof Cake> = {
  Cakes: Cake,
  Cookies: Cookie,
  Cheesecakes: Cake,
  Cupcakes: Cake,
  Brownies: Cookie,
  Chocolates: Cookie,
  Breads: Coffee,
  "Wedding Cakes": Cake,
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [city, setCity] = useState("Lahore");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: featuredBakers, isLoading: loadingFeatured } = useGetFeaturedBakers(
    { city },
    { query: { queryKey: getGetFeaturedBakersQueryKey({ city }) } }
  );

  const { data: categories, isLoading: loadingCategories } = useGetCategories({
    query: { queryKey: getGetCategoriesQueryKey() },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/bakers?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(city)}`);
    }
  };

  return (
    <BuyerLayout>
      {/* Hero */}
      <section
        className="relative py-20 px-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-foreground-dark, 262 80% 20%)) 100%)" }}
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=1600&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-3xl mx-auto">
          <p className="text-sm font-medium tracking-widest uppercase mb-4" style={{ color: "hsl(var(--secondary))" }}>
            Pakistan's Home Baker Marketplace
          </p>
          <h1 className="text-5xl md:text-6xl font-bold font-serif mb-4" style={{ color: "hsl(var(--primary-foreground))" }}>
            Meethi Khushiyan, Ghar Se Aap Tak
          </h1>
          <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.8)" }}>
            Fresh, custom homemade bakes from local kitchens in Pakistan. Crafted with love, delivered with care.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <div className="relative flex items-center flex-1">
              <MapPin className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" style={{ color: "hsl(var(--muted-foreground))" }} />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                data-testid="select-city"
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/95 text-foreground text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-secondary appearance-none"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="relative flex items-center flex-1">
              <Search className="absolute left-3 w-4 h-4 pointer-events-none text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cakes, bakers, occasions..."
                data-testid="input-search"
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/95 text-foreground text-sm border-0 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <button
              type="submit"
              data-testid="button-search"
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: "hsl(var(--secondary))", color: "hsl(var(--primary))" }}
            >
              Find Bakers
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-serif text-foreground">Browse by Category</h2>
            <Link href="/bakers" className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              All categories <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loadingCategories ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 w-32 bg-muted rounded-xl animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {categories?.slice(0, 12).map((cat) => {
                const Icon = CATEGORY_ICONS[cat.name] ?? Cake;
                return (
                  <Link
                    key={cat.name}
                    href={`/bakers?category=${encodeURIComponent(cat.name)}`}
                    data-testid={`link-category-${cat.name}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center leading-tight">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.count}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Bakers */}
      <section className="py-12 px-4" style={{ background: "hsl(var(--muted))" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold font-serif text-foreground">Bakers in {city}</h2>
              <p className="text-sm text-muted-foreground mt-1">Handpicked home bakers, verified and loved by neighbours</p>
            </div>
            <Link href="/bakers" className="text-sm text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card animate-pulse">
                  <div className="h-48 bg-muted" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredBakers && featuredBakers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredBakers.map((baker) => (
                <Link
                  key={baker.id}
                  href={`/bakers/${baker.id}`}
                  data-testid={`card-baker-${baker.id}`}
                  className="group block"
                >
                  <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="aspect-[4/3] relative overflow-hidden bg-primary/5">
                      {baker.photoUrl ? (
                        <img
                          src={baker.photoUrl}
                          alt={baker.businessName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-serif text-5xl text-primary/30">{baker.businessName[0]}</span>
                        </div>
                      )}
                      {/* Rating badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {baker.ratingAvg?.toFixed(1) ?? "New"}
                      </div>
                      {/* Active dot */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight mb-1">
                        {baker.businessName}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {baker.tagline ?? "Artisanal home baker"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {baker.area ?? baker.city}
                        </span>
                        {(baker as any).startingPrice && (
                          <span className="font-mono font-medium text-foreground">
                            From PKR {(baker as any).startingPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-serif text-xl mb-2">No bakers in {city} yet</p>
              <p className="text-sm">Try selecting a different city above.</p>
            </div>
          )}
        </div>
      </section>

      {/* Baker value proposition */}
      <section className="py-16 px-4" style={{ background: "hsl(var(--primary) / 0.06)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">For home bakers</p>
              <h2 className="text-3xl font-bold font-serif text-foreground">Turn your kitchen into a storefront</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl">Sweet Tooth helps bakers showcase menus, answer customer questions, organise orders, and share one trusted marketplace link.</p>
            </div>
            <Link href="/dashboard/login" className="shrink-0 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Join as a baker
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "A menu customers can understand", desc: "Show prices, availability, dietary tags, offers, and delivery areas in one place." },
              { title: "Your bakery agent", desc: "Give shoppers quick, grounded answers about your menu before they place an order." },
              { title: "A simpler daily workflow", desc: "Track orders, customer feedback, cancellations, payments, and performance from your dashboard." },
            ].map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold font-serif mb-2">How it works</h2>
          <p className="text-muted-foreground mb-12">Order fresh baked goods in three simple steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Find your baker", desc: "Browse home bakers in your city, filter by occasion or dietary needs." },
              { step: "02", title: "Place your order", desc: "Add items to cart and checkout with your delivery details and special instructions." },
              { step: "03", title: "Pay on delivery", desc: "Your baker bakes fresh. You pay cash on delivery — no advance required for most orders." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold font-mono text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-serif font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </BuyerLayout>
  );
}
