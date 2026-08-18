import { useEffect, useState } from "react";
import { useDeleteProduct, useUpdateProduct } from "@workspace/api-client-react";
import { Clock, Trash2, Truck, X } from "lucide-react";
import {
  ALLERGEN_LABELS,
  DIETARY_LABELS,
  LABEL_CONFLICTS,
  MAX_PRODUCT_DESCRIPTION_CHARS,
  MAX_PRODUCT_PRICE_PKR,
  PRODUCT_CATEGORIES,
  applyLabelToggle,
  coerceProductCategory,
  parseMoneyPkr,
  toTitleCase,
} from "@/lib/catalog-product";
import { isPublicImageUrl, uploadBakerImage } from "@/lib/image-upload";
import { SafeImage } from "@/components/ui/safe-image";

const SUGGESTION_TAGS = [
  "Birthday", "Eid", "Wedding", "Anniversary", "Tea party", "Corporate", "Kids party", "Eggless favourite",
];

type ProductShape = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  photoUrl?: string | null;
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

const inputClass = "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm";

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
  const deleteProduct = useDeleteProduct();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [category, setCategory] = useState(coerceProductCategory(product.category));
  const [photoUrl, setPhotoUrl] = useState(product.photoUrl ?? "");
  const [basePricePkr, setBasePricePkr] = useState(String(product.basePricePkr ?? ""));
  const [isAvailable, setIsAvailable] = useState(product.isAvailable !== false);
  const [leadTimeDays, setLeadTimeDays] = useState(String(product.leadTimeDays ?? 1));
  const [leadTimeHours, setLeadTimeHours] = useState(String(product.leadTimeHours ?? ""));
  const [pickupAvailable, setPickupAvailable] = useState(product.pickupAvailable !== false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(product.deliveryAvailable !== false);
  const [ingredientsText, setIngredientsText] = useState((product.ingredients ?? []).join(", "));
  const [allergens, setAllergens] = useState<string[]>(product.allergens ?? []);
  const [dietaryTags, setDietaryTags] = useState<string[]>(product.dietaryTags ?? []);
  const [suggestionTags, setSuggestionTags] = useState<string[]>(product.suggestionTags ?? []);
  const [recipeCostPkr, setRecipeCostPkr] = useState(String(product.recipeCostPkr ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(product.name);
    setDescription(product.description ?? "");
    setCategory(coerceProductCategory(product.category));
    setPhotoUrl(product.photoUrl ?? "");
    setBasePricePkr(String(product.basePricePkr ?? ""));
    setIsAvailable(product.isAvailable !== false);
    setLeadTimeDays(String(product.leadTimeDays ?? 1));
    setLeadTimeHours(String(product.leadTimeHours ?? ""));
    setPickupAvailable(product.pickupAvailable !== false);
    setDeliveryAvailable(product.deliveryAvailable !== false);
    setIngredientsText((product.ingredients ?? []).join(", "));
    setAllergens(product.allergens ?? []);
    setDietaryTags(product.dietaryTags ?? []);
    setSuggestionTags(product.suggestionTags ?? []);
    setRecipeCostPkr(product.recipeCostPkr != null ? String(product.recipeCostPkr) : "");
    setError(null);
  }, [product]);

  const friendlyError = (cause: unknown) =>
    (cause instanceof Error ? cause.message : "Could not save this product.").replace(/^HTTP \d+\s*[^:]*:\s*/, "");

  const save = () => {
    setError(null);
    const titled = toTitleCase(name);
    const price = parseMoneyPkr(basePricePkr);
    const recipeCost = recipeCostPkr.trim() ? parseMoneyPkr(recipeCostPkr) : null;
    if (!titled || titled.length < 2) {
      setError("Enter a product name.");
      return;
    }
    if (price == null || price < 1) {
      setError(`Price must be a whole number from PKR 1 to PKR ${MAX_PRODUCT_PRICE_PKR.toLocaleString()}.`);
      return;
    }
    if (recipeCostPkr.trim() && recipeCost == null) {
      setError(`Recipe cost must be a whole number up to PKR ${MAX_PRODUCT_PRICE_PKR.toLocaleString()}.`);
      return;
    }
    if (description.length > MAX_PRODUCT_DESCRIPTION_CHARS) {
      setError(`Description must be ${MAX_PRODUCT_DESCRIPTION_CHARS} characters or fewer.`);
      return;
    }
    if (photoUrl.trim() && !isPublicImageUrl(photoUrl) && !photoUrl.startsWith("data:image/")) {
      setError("Paste a public image URL or upload a photo.");
      return;
    }
    const ingredients = ingredientsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateProduct.mutate(
      {
        productId: product.id,
        data: {
          name: titled,
          description: description.trim() || undefined,
          category,
          photoUrl: photoUrl.trim() || undefined,
          basePricePkr: price,
          isAvailable,
          leadTimeDays: parseInt(leadTimeDays, 10) || 1,
          leadTimeHours: leadTimeHours ? parseInt(leadTimeHours, 10) : null,
          pickupAvailable,
          deliveryAvailable,
          ingredients,
          allergens,
          dietaryTags,
          suggestionTags,
          recipeCostPkr: recipeCost,
          isEgglessAvailable: dietaryTags.includes("Egg-free"),
        } as Record<string, unknown>,
      },
      {
        onSuccess: () => { onSaved(); onClose(); },
        onError: (cause) => setError(friendlyError(cause)),
      },
    );
  };

  const remove = () => {
    if (!window.confirm(`Delete “${product.name}”? This removes it from your catalogue.`)) {
      return;
    }
    deleteProduct.mutate(
      { productId: product.id },
      {
        onSuccess: () => { onSaved(); onClose(); },
        onError: (cause) => setError(friendlyError(cause)),
      },
    );
  };

  const priceNumber = parseMoneyPkr(basePricePkr) ?? 0;
  const recipeNumber = recipeCostPkr.trim() ? parseMoneyPkr(recipeCostPkr) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-card border-l border-border shadow-xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Edit product</p>
            <h2 className="font-serif text-xl font-bold">{toTitleCase(name) || product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <label className="text-xs font-semibold">Name</label>
            <input
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setName((current) => toTitleCase(current))}
              className={inputClass}
            />
          </section>

          <section>
            <label className="text-xs font-semibold">Category</label>
            <select value={category} onChange={(e) => setCategory(coerceProductCategory(e.target.value))} className={inputClass}>
              {PRODUCT_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </section>

          <section>
            <label className="text-xs font-semibold">Price in PKR</label>
            <input
              inputMode="numeric"
              value={basePricePkr}
              onChange={(e) => setBasePricePkr(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={inputClass}
            />
          </section>

          <section>
            <label className="text-xs font-semibold">
              Description ({description.length}/{MAX_PRODUCT_DESCRIPTION_CHARS})
            </label>
            <textarea
              rows={4}
              maxLength={MAX_PRODUCT_DESCRIPTION_CHARS}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_PRODUCT_DESCRIPTION_CHARS))}
              className={`${inputClass} resize-none`}
            />
          </section>

          <section>
            <label className="text-xs font-semibold">Product photo</label>
            <div className="mt-2 overflow-hidden rounded-xl border border-border bg-accent h-36">
              <SafeImage src={photoUrl} alt={name} className="h-full w-full object-cover" fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">No photo yet</div>} />
            </div>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
            <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-white px-3 text-xs font-semibold">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  setError(null);
                  try {
                    setPhotoUrl(await uploadBakerImage(file));
                  } catch (cause) {
                    setError(friendlyError(cause));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {uploading ? "Uploading…" : "Upload image"}
            </label>
            <p className="mt-2 text-xs text-muted-foreground">If upload fails, paste a public https photo URL above and save.</p>
          </section>

          <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 text-sm font-semibold">
            <span>{isAvailable ? "Available to order" : "Sold out"}</span>
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          </label>

          <section>
            <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
              <Clock className="h-4 w-4 text-primary" /> Ready in (agent tells buyers)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                Days
                <input type="number" min={0} value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} className={inputClass} />
              </label>
              <label className="text-xs">
                Extra hours
                <input type="number" min={0} max={23} value={leadTimeHours} onChange={(e) => setLeadTimeHours(e.target.value)} placeholder="0" className={inputClass} />
              </label>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Recipe cost (for Khata margin)</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Ingredient cost per unit.
              {priceNumber > 0 && recipeNumber != null ? (
                <span className="block mt-1 text-primary font-medium">
                  Est. margin: PKR {Math.max(0, priceNumber - (recipeNumber ?? 0)).toLocaleString()} per unit
                </span>
              ) : null}
            </p>
            <input
              inputMode="numeric"
              value={recipeCostPkr}
              onChange={(e) => setRecipeCostPkr(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="e.g. 450"
              className={inputClass}
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
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={3}
              placeholder="e.g. almond flour, butter, dark chocolate"
              className={`${inputClass} resize-none`}
            />
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Dietary labels</h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_LABELS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setDietaryTags((current) => applyLabelToggle(current, tag));
                    setAllergens((current) => current.filter((item) => !(LABEL_CONFLICTS[tag] ?? []).includes(item)));
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    dietaryTags.includes(tag) ? "border-primary bg-primary/10 text-primary" : "border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm mb-2">Allergens</h3>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_LABELS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setAllergens((current) => applyLabelToggle(current, tag));
                    setDietaryTags((current) => current.filter((item) => !(LABEL_CONFLICTS[tag] ?? []).includes(item)));
                  }}
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
                  onClick={() => setSuggestionTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    suggestionTags.includes(tag) ? "border-secondary bg-secondary/20 text-primary" : "border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {error ? (
            <p role="alert" className="rounded-xl bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[#a7313b]">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={save}
            disabled={updateProduct.isPending || uploading}
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {updateProduct.isPending ? "Saving…" : "Save product"}
          </button>

          <button
            type="button"
            onClick={remove}
            disabled={deleteProduct.isPending}
            className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[#f0c9cc] bg-[#f8dddd] text-sm font-semibold text-[#a7313b] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleteProduct.isPending ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>
    </div>
  );
}
