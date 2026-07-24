import { useEffect, useState } from "react";
import { useUpdateProduct } from "@workspace/api-client-react";
import { Clock, Truck, X } from "lucide-react";

const SUGGESTION_TAGS = [
  "Birthday", "Eid", "Wedding", "Anniversary", "Tea party", "Corporate", "Kids party", "Eggless favourite",
];

const ALLERGEN_OPTIONS = [
  "Contains eggs", "Contains dairy", "Contains gluten", "Contains nuts", "Contains soy", "Contains sesame",
];

type ProductShape = {
  id: number;
  name: string;
  basePricePkr?: number;
  recipeCostPkr?: number | null;
  leadTimeDays?: number;
  leadTimeHours?: number | null;
  isAvailable?: boolean;
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  ingredients?: string[];
  allergens?: string[];
  suggestionTags?: string[];
  dietaryTags?: string[];
};

export function ProductEditorPanel({
  product,
  onClose,
  onSaved,
}: {
  product: ProductShape;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateProduct = useUpdateProduct();
  const [leadTimeDays, setLeadTimeDays] = useState(String(product.leadTimeDays ?? 1));
  const [leadTimeHours, setLeadTimeHours] = useState(String(product.leadTimeHours ?? ""));
  const [pickupAvailable, setPickupAvailable] = useState(product.pickupAvailable !== false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(product.deliveryAvailable !== false);
  const [ingredientsText, setIngredientsText] = useState((product.ingredients ?? []).join(", "));
  const [allergens, setAllergens] = useState<string[]>(product.allergens ?? []);
  const [suggestionTags, setSuggestionTags] = useState<string[]>(product.suggestionTags ?? []);
  const [recipeCostPkr, setRecipeCostPkr] = useState(String(product.recipeCostPkr ?? ""));

  useEffect(() => {
    setLeadTimeDays(String(product.leadTimeDays ?? 1));
    setLeadTimeHours(String(product.leadTimeHours ?? ""));
    setPickupAvailable(product.pickupAvailable !== false);
    setDeliveryAvailable(product.deliveryAvailable !== false);
    setIngredientsText((product.ingredients ?? []).join(", "));
    setAllergens(product.allergens ?? []);
    setSuggestionTags(product.suggestionTags ?? []);
    setRecipeCostPkr(String(product.recipeCostPkr ?? ""));
  }, [product]);

  const toggleTag = (list: string[], setList: (v: string[]) => void, tag: string) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const save = () => {
    const ingredients = ingredientsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateProduct.mutate(
      {
        productId: product.id,
        data: {
          leadTimeDays: parseInt(leadTimeDays, 10) || 1,
          leadTimeHours: leadTimeHours ? parseInt(leadTimeHours, 10) : null,
          pickupAvailable,
          deliveryAvailable,
          ingredients,
          allergens,
          suggestionTags,
          recipeCostPkr: recipeCostPkr ? parseInt(recipeCostPkr, 10) : null,
        } as Record<string, unknown>,
      },
      { onSuccess: () => { onSaved(); onClose(); } },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-card border-l border-border shadow-xl overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Manage product</p>
            <h2 className="font-serif text-xl font-bold">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
              <Clock className="h-4 w-4 text-primary" /> Ready in (agent tells buyers)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                Days
                <input
                  type="number"
                  min={0}
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs">
                Extra hours
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={leadTimeHours}
                  onChange={(e) => setLeadTimeHours(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Recipe cost (for Khata margin)</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Your ingredient cost per unit — used to show margin per cake on Khata.
              {product.basePricePkr != null && recipeCostPkr && (
                <span className="block mt-1 text-primary font-medium">
                  Est. margin: PKR {Math.max(0, product.basePricePkr - (parseInt(recipeCostPkr, 10) || 0)).toLocaleString()} per unit
                </span>
              )}
            </p>
            <input
              type="number"
              min={0}
              value={recipeCostPkr}
              onChange={(e) => setRecipeCostPkr(e.target.value)}
              placeholder="e.g. 450"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </section>

          <section>
            <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
              <Truck className="h-4 w-4 text-primary" /> How buyers get it
            </h3>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.checked)} />
              Home delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pickupAvailable} onChange={(e) => setPickupAvailable(e.target.checked)} />
              Pickup from my kitchen
            </label>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
            <p className="text-xs text-muted-foreground mb-2">Comma-separated — agent shares these when asked.</p>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={3}
              placeholder="e.g. almond flour, butter, dark chocolate, gluten-free flour"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none"
            />
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Allergens</h3>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(allergens, setAllergens, tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    allergens.includes(tag) ? "border-primary bg-primary/10 text-primary" : "border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Suggestion tags</h3>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(suggestionTags, setSuggestionTags, tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    suggestionTags.includes(tag) ? "border-secondary bg-secondary/20 text-primary" : "border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={save}
            disabled={updateProduct.isPending}
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {updateProduct.isPending ? "Saving…" : "Save & update agent memory"}
          </button>
        </div>
      </div>
    </div>
  );
}
