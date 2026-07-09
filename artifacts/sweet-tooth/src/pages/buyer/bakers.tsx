import { BuyerLayout } from "@/components/layout/buyer-layout";
import { useSearchMarketplace, getSearchMarketplaceQueryKey } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";

export default function Bakers() {
  const search = useSearch();
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const q = params.get("q") ?? undefined;
  const city = params.get("city") ?? undefined;

  const { data, isLoading } = useSearchMarketplace(
    { q, city },
    { query: { queryKey: getSearchMarketplaceQueryKey({ q, city }) } },
  );

  return (
    <BuyerLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 font-serif text-primary">Discover Bakers</h1>
        {(city || q) && (
          <p className="text-muted-foreground mb-8">
            {city && <span>in {city}</span>}
            {q && <span>{city ? " · " : ""}matching “{q}”</span>}
          </p>
        )}
        {!city && !q && <div className="mb-8" />}
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-muted rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data?.bakers?.map(baker => (
              <Link key={baker.id} href={`/bakers/${baker.id}`} className="group block h-full">
                <div className="overflow-hidden rounded-xl bg-card border border-border shadow-sm transition-all hover:shadow-md h-full flex flex-col">
                  <div className="aspect-[4/3] bg-muted relative shrink-0">
                    {baker.photoUrl ? (
                      <img src={baker.photoUrl} alt={baker.businessName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary">
                        <span className="font-serif text-3xl">{baker.businessName[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-serif text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{baker.businessName}</h3>
                      <div className="flex items-center gap-1 text-sm font-medium shrink-0 ml-2">
                        <span className="text-secondary">★</span> {baker.ratingAvg.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">{baker.tagline || 'Artisanal baker'}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <span className="truncate pr-2">{baker.area || baker.city}</span>
                      {baker.isActive && (
                        <span className="flex items-center gap-1 text-green-600 font-medium shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {(!data?.bakers || data.bakers.length === 0) && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No bakers found matching your criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
