import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetBakerProducts, useToggleProductStock, useUpdateProduct, getGetBakerProductsQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const DIETARY_AND_ALLERGEN_LABELS = [
  "Egg-free", "Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Nut-free", "Sugar-free", "Halal",
  "Contains eggs", "Contains dairy", "Contains gluten", "Contains nuts", "Contains soy", "Contains sesame",
];

export default function DashboardCatalog() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useGetBakerProducts(bakerId, { query: { enabled: !!bakerId, queryKey: getGetBakerProductsQueryKey(bakerId) } });
  const toggleStock = useToggleProductStock();
  const updateProduct = useUpdateProduct();
  const [editingLabelsFor, setEditingLabelsFor] = useState<number | null>(null);

  const handleToggle = (productId: number) => {
    toggleStock.mutate({ productId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBakerProductsQueryKey(bakerId) });
      }
    });
  };

  const toggleLabel = (productId: number, labels: string[], label: string) => {
    const dietaryTags = labels.includes(label)
      ? labels.filter((item) => item !== label)
      : [...labels, label];
    updateProduct.mutate({ productId, data: { dietaryTags, isEgglessAvailable: dietaryTags.includes("Egg-free") } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBakerProductsQueryKey(bakerId) }),
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-serif text-primary">Catalog Editor</h1>
          <p className="text-sm text-muted-foreground max-w-md">Set only labels you can verify from the recipe and kitchen process. “Contains” labels help the assistant answer safely.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products?.map(product => (
              <div key={product.id} className="border border-border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col">
                <div className="h-40 bg-muted relative">
                  {product.photoUrl && (
                    <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif font-bold text-lg leading-tight">{product.name}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">{product.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3" aria-label={`Dietary labels for ${product.name}`}>
                    {(product.dietaryTags ?? []).map((label) => (
                      <span key={label} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{label}</span>
                    ))}
                    {(product.dietaryTags ?? []).length === 0 && <span className="text-xs text-muted-foreground">No dietary labels yet</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingLabelsFor(editingLabelsFor === product.id ? null : product.id)}
                    className="mb-3 text-left text-xs font-semibold text-primary hover:underline"
                    aria-expanded={editingLabelsFor === product.id}
                  >
                    {editingLabelsFor === product.id ? "Close label editor" : "Edit dietary & allergen labels"}
                  </button>
                  {editingLabelsFor === product.id && (
                    <fieldset className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
                      <legend className="px-1 text-xs font-semibold">Dietary & allergen labels</legend>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                        {DIETARY_AND_ALLERGEN_LABELS.map((label) => {
                          const checked = (product.dietaryTags ?? []).includes(label);
                          return (
                            <label key={label} className="flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={updateProduct.isPending}
                                onChange={() => toggleLabel(product.id, product.dietaryTags ?? [], label)}
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">Do not mark an item gluten-free or nut-free when shared tools or ingredients can cause cross-contact.</p>
                    </fieldset>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t border-border mt-auto">
                    <span className="font-mono font-medium text-primary">PKR {product.basePricePkr.toLocaleString()}</span>
                    <button 
                      onClick={() => handleToggle(product.id)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {product.isAvailable ? 'Available' : 'Out of stock'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
