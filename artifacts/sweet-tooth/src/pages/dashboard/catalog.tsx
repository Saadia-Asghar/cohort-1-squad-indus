import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  useGetBakerProducts, 
  useToggleProductStock, 
  useUpdateProduct,
  useCreateProduct,
  getGetBakerProductsQueryKey,
  useGetBaker,
  useUpdateBaker,
  getGetBakerQueryKey
} from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, Tag, Trash2, Clock, Sparkles, AlertCircle, Settings2, Plus } from "lucide-react";
import { ProductEditorPanel } from "@/components/dashboard/product-editor";

const DIETARY_AND_ALLERGEN_LABELS = [
  "Egg-free", "Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Nut-free", "Sugar-free", "Halal",
  "Contains eggs", "Contains dairy", "Contains gluten", "Contains nuts", "Contains soy", "Contains sesame",
];

export default function DashboardCatalog() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  
  const { data: products, isLoading } = useGetBakerProducts(bakerId, { 
    query: { enabled: !!bakerId, queryKey: getGetBakerProductsQueryKey(bakerId) } 
  });
  
  const { data: baker } = useGetBaker(bakerId, { 
    query: { enabled: !!bakerId, queryKey: getGetBakerQueryKey(bakerId) } 
  });

  const toggleStock = useToggleProductStock();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const updateBaker = useUpdateBaker();

  const [activeTab, setActiveTab] = useState<"items" | "drops">("items");
  const [editingLabelsFor, setEditingLabelsFor] = useState<number | null>(null);
  const [managingProduct, setManagingProduct] = useState<(NonNullable<typeof products>[number]) | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "Cakes",
    basePricePkr: "",
    description: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Drops Form State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [releaseDate, setReleaseDate] = useState("");
  const [releaseTime, setReleaseTime] = useState("18:00");
  const [limitStock, setLimitStock] = useState<number>(20);

  const currentDrops = (baker as any)?.agentConfig?.drops ?? [];

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const price = parseInt(createForm.basePricePkr, 10);
    if (!createForm.name.trim() || !createForm.category.trim() || !Number.isFinite(price) || price < 1) {
      setCreateError("Name, category, and a valid price are required.");
      return;
    }
    createProduct.mutate(
      {
        data: {
          bakerId,
          name: createForm.name.trim(),
          category: createForm.category.trim(),
          basePricePkr: price,
          description: createForm.description.trim() || undefined,
          isAvailable: true,
          sizes: [{ label: "Standard", pricePkr: price }],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBakerProductsQueryKey(bakerId) });
          setShowCreate(false);
          setCreateForm({ name: "", category: "Cakes", basePricePkr: "", description: "" });
        },
        onError: (err) => {
          setCreateError((err as Error)?.message || "Could not create product.");
        },
      },
    );
  };

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

  const handleScheduleDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !releaseDate || !releaseTime) {
      alert("Please fill in all drop details.");
      return;
    }

    const prodId = parseInt(selectedProductId, 10);
    const product = products?.find(p => p.id === prodId);
    if (!product) return;

    const newDrop = {
      id: `drop-${Date.now()}`,
      productId: prodId,
      productName: product.name,
      releaseDate,
      releaseTime,
      limitStock,
      active: true
    };

    const updatedDrops = [...currentDrops, newDrop].sort((a, b) => 
      a.releaseDate.localeCompare(b.releaseDate) || a.releaseTime.localeCompare(b.releaseTime)
    );

    updateBaker.mutate({
      bakerId,
      data: {
        blockedDates: (baker as any)?.agentConfig?.blockedDates ?? [],
        // Merge drops back into agentConfig via route update
        ...({ drops: updatedDrops } as any)
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBakerQueryKey(bakerId) });
        setSelectedProductId("");
        setReleaseDate("");
        alert("Flash Drop scheduled successfully!");
      },
      onError: (err) => {
        alert("Failed to schedule drop: " + (err as any).message);
      }
    });
  };

  const handleDeleteDrop = (dropId: string) => {
    const updatedDrops = currentDrops.filter((d: any) => d.id !== dropId);
    updateBaker.mutate({
      bakerId,
      data: {
        blockedDates: (baker as any)?.agentConfig?.blockedDates ?? [],
        ...({ drops: updatedDrops } as any)
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBakerQueryKey(bakerId) });
        alert("Scheduled drop cancelled.");
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-4xl font-bold font-serif text-primary">Catalog & Drops Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage kitchen menu items and schedule limited-quantity flash pre-order releases.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeTab === "items" && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add product
              </button>
            )}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "items" ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Menu Items
            </button>
            <button
              onClick={() => setActiveTab("drops")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "drops" ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Flash Drops
            </button>
            </div>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateProduct} className="rounded-xl border border-border bg-card p-5 space-y-3 max-w-xl">
            <h2 className="font-serif text-xl font-bold">New menu item</h2>
            <input
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Product name"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Category (e.g. Cakes)"
                value={createForm.category}
                onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
              />
              <input
                required
                type="number"
                min={1}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Base price PKR"
                value={createForm.basePricePkr}
                onChange={(e) => setCreateForm((p) => ({ ...p, basePricePkr: e.target.value }))}
              />
            </div>
            <textarea
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Short description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
            />
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createProduct.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createProduct.isPending ? "Saving…" : "Save product"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(null); }}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {activeTab === "items" ? (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse"></div>)}
              </div>
            ) : (products?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
                <p className="text-muted-foreground">No products yet. Add your first cake or treat.</p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" /> Add product
                </button>
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
                        </fieldset>
                      )}
                      <div className="flex justify-between items-center pt-4 border-t border-border mt-auto gap-2">
                        <span className="font-mono font-medium text-primary">PKR {product.basePricePkr.toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setManagingProduct(product)}
                            className="text-xs px-2 py-1 rounded-full font-medium border border-border hover:bg-muted flex items-center gap-1"
                          >
                            <Settings2 className="h-3 w-3" /> Manage
                          </button>
                          <button 
                            onClick={() => handleToggle(product.id)}
                            className={`text-xs px-2 py-1 rounded-full font-medium ${product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {product.isAvailable ? 'Available' : 'Sold out'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8">
            {/* Create Drop Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 h-fit">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Schedule Flash Drop
              </h3>
              <p className="text-xs text-muted-foreground">
                Set limited inventory and specific release date/times for special launches.
              </p>

              <form onSubmit={handleScheduleDrop} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">Select Product</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Menu Item --</option>
                    {products?.filter(p => p.isAvailable).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (PKR {p.basePricePkr.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">Release Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">Release Time</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                      value={releaseTime}
                      onChange={(e) => setReleaseTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">Limit Quantity Slots Available</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
                    value={limitStock}
                    onChange={(e) => setLimitStock(Number(e.target.value))}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateBaker.isPending}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {updateBaker.isPending ? "Scheduling..." : "Schedule Drop Launch"}
                </button>
              </form>
            </div>

            {/* Scheduled Drops List */}
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold">Upcoming Scheduled Drops</h3>
              {currentDrops.length > 0 ? (
                <div className="space-y-3">
                  {currentDrops.map((drop: any) => (
                    <div key={drop.id} className="p-4 border border-border bg-card rounded-xl flex items-center justify-between shadow-xs">
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-foreground font-serif">{drop.productName}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {drop.releaseDate}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {drop.releaseTime}</span>
                          <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {drop.limitStock} slots max</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDrop(drop.id)}
                        className="p-2 border border-border hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer text-muted-foreground"
                        title="Cancel Drop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-card">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No drops currently scheduled.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {managingProduct && (
          <ProductEditorPanel
            product={managingProduct}
            onClose={() => setManagingProduct(null)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: getGetBakerProductsQueryKey(bakerId) })}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
