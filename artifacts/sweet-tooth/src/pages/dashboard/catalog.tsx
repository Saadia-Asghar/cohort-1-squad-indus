import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProductEditorPanel } from "@/components/dashboard/product-editor";
import { useBuyerSession } from "@/hooks/use-session";
import {
  getGetBakerProductsQueryKey,
  getGetBakerQueryKey,
  useCreateProduct,
  useGetBaker,
  useGetBakerProducts,
  useToggleProductStock,
  useUpdateBaker,
  useUpdateProduct,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Check,
  Clock3,
  ImageIcon,
  Package,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";

const DIETARY_AND_ALLERGEN_LABELS = [
  "Egg-free",
  "Vegan",
  "Vegetarian",
  "Gluten-free",
  "Dairy-free",
  "Nut-free",
  "Sugar-free",
  "Halal",
  "Contains eggs",
  "Contains dairy",
  "Contains gluten",
  "Contains nuts",
  "Contains soy",
  "Contains sesame",
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-[#dfd1c4] bg-[#fffaf6] px-3.5 text-sm text-[#241629] outline-none transition placeholder:text-[#a99ca9] focus:border-[#c24f7a]/60 focus:ring-4 focus:ring-[#c24f7a]/10";

type CatalogSort =
  | "name_asc"
  | "price_asc"
  | "price_desc";

export default function DashboardCatalog() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useGetBakerProducts(
    bakerId,
    {
      query: {
        enabled: Boolean(bakerId),
        queryKey: getGetBakerProductsQueryKey(bakerId),
      },
    },
  );

  const { data: baker } = useGetBaker(bakerId, {
    query: {
      enabled: Boolean(bakerId),
      queryKey: getGetBakerQueryKey(bakerId),
    },
  });

  const toggleStock = useToggleProductStock();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const updateBaker = useUpdateBaker();

  const [activeTab, setActiveTab] = useState<
    "items" | "drops"
  >("items");

  const [editingLabelsFor, setEditingLabelsFor] = useState<
    number | null
  >(null);

  const [managingProduct, setManagingProduct] = useState<
    NonNullable<typeof products>[number] | null
  >(null);

  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] =
    useState<CatalogSort>("name_asc");

  const [createForm, setCreateForm] = useState({
    name: "",
    category: "Cakes",
    basePricePkr: "",
    description: "",
  });

  const [createError, setCreateError] = useState<
    string | null
  >(null);

  const [selectedProductId, setSelectedProductId] =
    useState("");

  const [releaseDate, setReleaseDate] = useState("");
  const [releaseTime, setReleaseTime] = useState("18:00");
  const [limitStock, setLimitStock] = useState(20);

  const allProducts = products ?? [];

  const currentDrops: any[] =
    (baker as any)?.agentConfig?.drops ?? [];

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        allProducts
          .map((product) => product.category?.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allProducts
      .filter((product) => {
        const category =
          product.category?.trim() || "Uncategorised";

        const matchesCategory =
          categoryFilter === "all" ||
          category === categoryFilter;

        if (!matchesCategory) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchText = [
          product.name,
          product.category,
          product.description,
          ...(product.dietaryTags ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchText.includes(query);
      })
      .sort((first, second) => {
        if (sortMode === "price_asc") {
          return first.basePricePkr - second.basePricePkr;
        }

        if (sortMode === "price_desc") {
          return second.basePricePkr - first.basePricePkr;
        }

        return first.name.localeCompare(second.name);
      });
  }, [
    allProducts,
    categoryFilter,
    searchQuery,
    sortMode,
  ]);

  const catalogMetrics = useMemo(
    () => ({
      total: allProducts.length,
      available: allProducts.filter(
        (product) => product.isAvailable,
      ).length,
      soldOut: allProducts.filter(
        (product) => !product.isAvailable,
      ).length,
      categories: categories.length,
    }),
    [allProducts, categories],
  );

  const closeCreate = () => {
    setShowCreate(false);
    setCreateError(null);
    setCreateForm({
      name: "",
      category: "Cakes",
      basePricePkr: "",
      description: "",
    });
  };

  const handleCreateProduct = (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const price = Number.parseInt(
      createForm.basePricePkr,
      10,
    );

    if (
      !createForm.name.trim() ||
      !createForm.category.trim() ||
      !Number.isFinite(price) ||
      price < 1
    ) {
      setCreateError(
        "Name, category and a valid price are required.",
      );
      return;
    }

    createProduct.mutate(
      {
        data: {
          bakerId,
          name: createForm.name.trim(),
          category: createForm.category.trim(),
          basePricePkr: price,
          description:
            createForm.description.trim() || undefined,
          isAvailable: true,
          sizes: [
            {
              label: "Standard",
              pricePkr: price,
            },
          ],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey:
              getGetBakerProductsQueryKey(bakerId),
          });

          window.dispatchEvent(
            new CustomEvent(
              "sweet-tooth:quest-product-created",
            ),
          );

          closeCreate();
        },
        onError: (error) => {
          setCreateError(
            (error as Error)?.message ||
              "Could not create product.",
          );
        },
      },
    );
  };

  const handleToggle = (productId: number) => {
    toggleStock.mutate(
      { productId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey:
              getGetBakerProductsQueryKey(bakerId),
          });
        },
      },
    );
  };

  const toggleLabel = (
    productId: number,
    labels: string[],
    label: string,
  ) => {
    const dietaryTags = labels.includes(label)
      ? labels.filter((item) => item !== label)
      : [...labels, label];

    updateProduct.mutate(
      {
        productId,
        data: {
          dietaryTags,
          isEgglessAvailable:
            dietaryTags.includes("Egg-free"),
        },
      },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey:
              getGetBakerProductsQueryKey(bakerId),
          }),
      },
    );
  };

  const handleScheduleDrop = (event: FormEvent) => {
    event.preventDefault();

    if (
      !selectedProductId ||
      !releaseDate ||
      !releaseTime
    ) {
      window.alert(
        "Please complete all flash-drop details.",
      );
      return;
    }

    const productId = Number.parseInt(
      selectedProductId,
      10,
    );

    const product = allProducts.find(
      (item) => item.id === productId,
    );

    if (!product) {
      return;
    }

    const newDrop = {
      id: `drop-${Date.now()}`,
      productId,
      productName: product.name,
      releaseDate,
      releaseTime,
      limitStock,
      active: true,
    };

    const updatedDrops = [
      ...currentDrops,
      newDrop,
    ].sort(
      (first, second) =>
        first.releaseDate.localeCompare(
          second.releaseDate,
        ) ||
        first.releaseTime.localeCompare(
          second.releaseTime,
        ),
    );

    updateBaker.mutate(
      {
        bakerId,
        data: {
          blockedDates:
            (baker as any)?.agentConfig
              ?.blockedDates ?? [],
          ...({ drops: updatedDrops } as any),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetBakerQueryKey(bakerId),
          });

          setSelectedProductId("");
          setReleaseDate("");

          window.alert(
            "Flash drop scheduled successfully.",
          );
        },
        onError: (error) => {
          window.alert(
            `Failed to schedule drop: ${
              (error as Error).message
            }`,
          );
        },
      },
    );
  };

  const handleDeleteDrop = (dropId: string) => {
    const updatedDrops = currentDrops.filter(
      (drop) => drop.id !== dropId,
    );

    updateBaker.mutate(
      {
        bakerId,
        data: {
          blockedDates:
            (baker as any)?.agentConfig
              ?.blockedDates ?? [],
          ...({ drops: updatedDrops } as any),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetBakerQueryKey(bakerId),
          });

          window.alert("Scheduled drop cancelled.");
        },
      },
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fbf6ee] px-4 py-5 text-[#241629] sm:px-6 lg:px-7">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 border-b border-[#dfd1c4] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c24f7a]">
                Menu operations
              </p>

              <h1 className="mt-2 font-serif text-[2.8rem] font-semibold leading-none tracking-[-0.045em] sm:text-[3.35rem]">
                Catalog
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746876]">
                Manage the products, prices, availability
                and dietary information your assistant
                shares with customers.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex rounded-xl border border-[#dfd1c4] bg-[#f4eae1] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("items")}
                  className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition ${
                    activeTab === "items"
                      ? "bg-white text-[#632a73] shadow-sm"
                      : "text-[#746876]"
                  }`}
                >
                  Menu items
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("drops")}
                  className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition ${
                    activeTab === "drops"
                      ? "bg-white text-[#632a73] shadow-sm"
                      : "text-[#746876]"
                  }`}
                >
                  Flash drops
                </button>
              </div>

              {activeTab === "items" ? (
                <button
                  type="button"
                  data-quest="add-product"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(47,24,55,0.12)] transition hover:bg-[#542261]"
                >
                  <Plus className="h-4 w-4" />
                  Add product
                </button>
              ) : null}
            </div>
          </header>

          <section className="grid border-b border-[#dfd1c4] sm:grid-cols-2 xl:grid-cols-4">
            <CatalogMetric
              icon={Package}
              label="Menu items"
              value={catalogMetrics.total}
            />

            <CatalogMetric
              icon={Check}
              label="Available"
              value={catalogMetrics.available}
              valueClass="text-[#168a55]"
            />

            <CatalogMetric
              icon={AlertCircle}
              label="Sold out"
              value={catalogMetrics.soldOut}
              valueClass="text-[#b83a42]"
            />

            <CatalogMetric
              icon={Tag}
              label="Categories"
              value={catalogMetrics.categories}
            />
          </section>

          {activeTab === "items" ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
              <main className="min-w-0">
                {allProducts.length > 0 ? (
                  <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                    <div className="border-b border-[#dfd1c4] p-4">
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_180px]">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8d9c]" />

                          <input
                            value={searchQuery}
                            onChange={(event) =>
                              setSearchQuery(
                                event.target.value,
                              )
                            }
                            placeholder="Search products, categories or dietary labels"
                            className={`${inputClass} pl-10`}
                          />
                        </div>

                        <select
                          value={categoryFilter}
                          onChange={(event) =>
                            setCategoryFilter(
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        >
                          <option value="all">
                            All categories
                          </option>

                          {categories.map((category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          ))}
                        </select>

                        <div className="relative">
                          <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8d9c]" />

                          <select
                            value={sortMode}
                            onChange={(event) =>
                              setSortMode(
                                event.target
                                  .value as CatalogSort,
                              )
                            }
                            className={`${inputClass} pl-10`}
                          >
                            <option value="name_asc">
                              Name A–Z
                            </option>

                            <option value="price_asc">
                              Lowest price
                            </option>

                            <option value="price_desc">
                              Highest price
                            </option>
                          </select>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-[#746876]">
                        Showing{" "}
                        <strong className="text-[#241629]">
                          {filteredProducts.length}
                        </strong>{" "}
                        of {allProducts.length} products
                      </p>
                    </div>

                    {isLoading ? (
                      <div className="grid gap-4 p-4 sm:grid-cols-2 2xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map(
                          (item) => (
                            <div
                              key={item}
                              className="h-[380px] animate-pulse rounded-2xl bg-[#f1e9e2]"
                            />
                          ),
                        )}
                      </div>
                    ) : filteredProducts.length > 0 ? (
                      <div className="grid gap-4 p-4 sm:grid-cols-2 2xl:grid-cols-3">
                        {filteredProducts.map(
                          (product) => {
                            const labels =
                              product.dietaryTags ?? [];

                            const labelEditorOpen =
                              editingLabelsFor ===
                              product.id;

                            return (
                              <article
                                key={product.id}
                                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dfd1c4] bg-[#fffaf6] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,24,55,0.08)]"
                              >
                                <div className="relative h-44 overflow-hidden bg-[#f1dde5]">
                                  {product.photoUrl ? (
                                    <img
                                      src={product.photoUrl}
                                      alt={product.name}
                                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                    />
                                  ) : (
                                    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top_left,#fff7fa_0,#f1dde5_55%,#ead0dc_100%)]">
                                      <div className="text-center">
                                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/70 bg-white/45 text-[#c24f7a] shadow-sm">
                                          <ImageIcon className="h-6 w-6" />
                                        </span>

                                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9b5572]">
                                          Product photo
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <span className="absolute left-3 top-3 rounded-lg border border-white/60 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-[#632a73] backdrop-blur">
                                    {product.category ||
                                      "Uncategorised"}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggle(
                                        product.id,
                                      )
                                    }
                                    disabled={
                                      toggleStock.isPending
                                    }
                                    aria-pressed={
                                      product.isAvailable
                                    }
                                    className={`absolute right-3 top-3 rounded-lg px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur transition disabled:opacity-50 ${
                                      product.isAvailable
                                        ? "bg-[#e4f3e8]/95 text-[#168a55]"
                                        : "bg-[#f8dddd]/95 text-[#b83a42]"
                                    }`}
                                  >
                                    {product.isAvailable
                                      ? "Available"
                                      : "Sold out"}
                                  </button>
                                </div>

                                <div className="flex flex-1 flex-col p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h2 className="truncate font-serif text-xl font-semibold">
                                        {product.name}
                                      </h2>

                                      <p className="mt-1 font-mono text-sm font-semibold text-[#632a73]">
                                        PKR{" "}
                                        {product.basePricePkr.toLocaleString()}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setManagingProduct(
                                          product,
                                        )
                                      }
                                      aria-label={`Manage ${product.name}`}
                                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-white text-[#632a73] transition hover:bg-[#f4eae1]"
                                    >
                                      <Settings2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#746876]">
                                    {product.description ||
                                      "Add a short product description so customers and your assistant understand this item."}
                                  </p>

                                  <div
                                    className="mt-4 flex min-h-8 flex-wrap gap-1.5"
                                    aria-label={`Dietary labels for ${product.name}`}
                                  >
                                    {labels
                                      .slice(0, 4)
                                      .map((label) => (
                                        <span
                                          key={label}
                                          className="rounded-lg bg-[#f1dde5] px-2 py-1 text-[9px] font-semibold text-[#8e345c]"
                                        >
                                          {label}
                                        </span>
                                      ))}

                                    {labels.length > 4 ? (
                                      <span className="rounded-lg bg-[#eee8ee] px-2 py-1 text-[9px] font-semibold text-[#746876]">
                                        +{labels.length - 4}
                                      </span>
                                    ) : null}

                                    {labels.length === 0 ? (
                                      <span className="text-[10px] text-[#9b8d9c]">
                                        No dietary labels
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-4 border-t border-[#eadfd5] pt-4">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingLabelsFor(
                                          labelEditorOpen
                                            ? null
                                            : product.id,
                                        )
                                      }
                                      aria-expanded={
                                        labelEditorOpen
                                      }
                                      className="inline-flex min-h-9 items-center gap-2 text-[11px] font-semibold text-[#c24f7a]"
                                    >
                                      <Tag className="h-3.5 w-3.5" />

                                      {labelEditorOpen
                                        ? "Close label editor"
                                        : "Edit dietary labels"}
                                    </button>

                                    {labelEditorOpen ? (
                                      <fieldset className="mt-3 rounded-xl border border-[#dfd1c4] bg-white/60 p-3">
                                        <legend className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#746876]">
                                          Dietary and allergen labels
                                        </legend>

                                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                          {DIETARY_AND_ALLERGEN_LABELS.map(
                                            (label) => {
                                              const checked =
                                                labels.includes(
                                                  label,
                                                );

                                              return (
                                                <label
                                                  key={label}
                                                  className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-[10px] font-medium transition ${
                                                    checked
                                                      ? "border-[#c24f7a]/40 bg-[#f1dde5] text-[#632a73]"
                                                      : "border-[#eadfd5] bg-[#fffaf6] text-[#746876]"
                                                  }`}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={
                                                      checked
                                                    }
                                                    disabled={
                                                      updateProduct.isPending
                                                    }
                                                    onChange={() =>
                                                      toggleLabel(
                                                        product.id,
                                                        labels,
                                                        label,
                                                      )
                                                    }
                                                    className="accent-[#632a73]"
                                                  />

                                                  {label}
                                                </label>
                                              );
                                            },
                                          )}
                                        </div>
                                      </fieldset>
                                    ) : null}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setManagingProduct(
                                        product,
                                      )
                                    }
                                    className="mt-4 min-h-10 w-full rounded-xl border border-[#dfd1c4] bg-white text-xs font-semibold text-[#632a73] transition hover:bg-[#f4eae1]"
                                  >
                                    Manage product
                                  </button>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <div className="grid min-h-[360px] place-items-center p-6 text-center">
                        <div>
                          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                            <Search className="h-6 w-6" />
                          </span>

                          <h2 className="mt-4 font-serif text-2xl font-semibold">
                            No matching products
                          </h2>

                          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#746876]">
                            Change the search, category or
                            sorting options to find another
                            menu item.
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setCategoryFilter("all");
                            }}
                            className="mt-5 min-h-11 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white"
                          >
                            Clear filters
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                ) : isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-[380px] animate-pulse rounded-2xl bg-[#f1e9e2]"
                      />
                    ))}
                  </div>
                ) : (
                  <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                    <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                      <div className="flex min-h-[390px] items-center p-7 sm:p-10">
                        <div className="max-w-xl">
                          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                            <Package className="h-6 w-6" />
                          </span>

                          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#c24f7a]">
                            Start your menu
                          </p>

                          <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-[-0.035em]">
                            Add the first item customers can order.
                          </h2>

                          <p className="mt-4 max-w-lg text-sm leading-7 text-[#746876]">
                            Product names, prices,
                            availability and dietary details
                            help your storefront and AI
                            assistant answer customers
                            accurately.
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setShowCreate(true)
                            }
                            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white"
                          >
                            <Plus className="h-4 w-4" />
                            Add first product
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-[#dfd1c4] bg-[#fff0f5] p-7 lg:border-l lg:border-t-0">
                        <Sparkles className="h-6 w-6 text-[#c24f7a]" />

                        <h3 className="mt-5 font-serif text-2xl font-semibold">
                          What your assistant needs
                        </h3>

                        <div className="mt-6 space-y-4">
                          <EmptyRequirement
                            number="01"
                            title="Product name"
                            description="A clear customer-facing menu name."
                          />

                          <EmptyRequirement
                            number="02"
                            title="Price and sizes"
                            description="The starting price and available variants."
                          />

                          <EmptyRequirement
                            number="03"
                            title="Availability"
                            description="Whether customers can order it today."
                          />

                          <EmptyRequirement
                            number="04"
                            title="Dietary information"
                            description="Allergens and available alternatives."
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </main>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-[#dfd1c4] bg-white/45 p-4">
                  <h2 className="font-serif text-xl font-semibold">
                    Catalog health
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[#746876]">
                    Keep customer-facing information
                    complete and accurate.
                  </p>

                  <div className="mt-5 space-y-4">
                    <HealthRow
                      label="Products available"
                      value={`${catalogMetrics.available}/${catalogMetrics.total}`}
                      complete={
                        catalogMetrics.available > 0
                      }
                    />

                    <HealthRow
                      label="Categories created"
                      value={catalogMetrics.categories.toString()}
                      complete={
                        catalogMetrics.categories > 0
                      }
                    />

                    <HealthRow
                      label="Products with photos"
                      value={allProducts
                        .filter(
                          (product) =>
                            Boolean(product.photoUrl),
                        )
                        .length.toString()}
                      complete={allProducts.some(
                        (product) =>
                          Boolean(product.photoUrl),
                      )}
                    />

                    <HealthRow
                      label="Dietary labels added"
                      value={allProducts
                        .filter(
                          (product) =>
                            (product.dietaryTags ?? [])
                              .length > 0,
                        )
                        .length.toString()}
                      complete={allProducts.some(
                        (product) =>
                          (product.dietaryTags ?? [])
                            .length > 0,
                      )}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e5cfd9] bg-[#fff0f5] p-4">
                  <Sparkles className="h-5 w-5 text-[#c24f7a]" />

                  <h2 className="mt-3 font-serif text-xl font-semibold">
                    Assistant knowledge
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#746876]">
                    Catalog edits update the product
                    information available to customer
                    conversations.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dcb8c8] bg-white/55 text-xs font-semibold text-[#632a73]"
                  >
                    <Plus className="h-4 w-4" />
                    Add menu item
                  </button>
                </section>
              </aside>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="h-fit rounded-2xl border border-[#e5cfd9] bg-[#fff0f5] p-5 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#c24f7a]">
                  <Sparkles className="h-5 w-5" />
                </div>

                <h2 className="mt-5 font-serif text-2xl font-semibold">
                  Schedule a flash drop
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#746876]">
                  Create a limited pre-order release
                  with a launch date, time and maximum
                  number of slots.
                </p>

                <form
                  onSubmit={handleScheduleDrop}
                  className="mt-6 space-y-4"
                >
                  <FormField label="Menu item">
                    <select
                      value={selectedProductId}
                      onChange={(event) =>
                        setSelectedProductId(
                          event.target.value,
                        )
                      }
                      required
                      className={inputClass}
                    >
                      <option value="">
                        Choose an available product
                      </option>

                      {allProducts
                        .filter(
                          (product) =>
                            product.isAvailable,
                        )
                        .map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                          >
                            {product.name} — PKR{" "}
                            {product.basePricePkr.toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </FormField>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <FormField label="Release date">
                      <input
                        type="date"
                        value={releaseDate}
                        onChange={(event) =>
                          setReleaseDate(
                            event.target.value,
                          )
                        }
                        required
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Release time">
                      <input
                        type="time"
                        value={releaseTime}
                        onChange={(event) =>
                          setReleaseTime(
                            event.target.value,
                          )
                        }
                        required
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <FormField label="Available order slots">
                    <input
                      type="number"
                      min="1"
                      value={limitStock}
                      onChange={(event) =>
                        setLimitStock(
                          Number(event.target.value),
                        )
                      }
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <button
                    type="submit"
                    disabled={updateBaker.isPending}
                    className="min-h-11 w-full rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {updateBaker.isPending
                      ? "Scheduling drop…"
                      : "Schedule drop"}
                  </button>
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#dfd1c4] bg-white/45">
                <div className="border-b border-[#dfd1c4] px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#c24f7a]">
                    Upcoming releases
                  </p>

                  <h2 className="mt-1 font-serif text-2xl font-semibold">
                    Scheduled flash drops
                  </h2>
                </div>

                {currentDrops.length > 0 ? (
                  <div className="divide-y divide-[#eadfd5]">
                    {currentDrops.map((drop) => (
                      <article
                        key={drop.id}
                        className="flex flex-col gap-4 px-5 py-5 transition hover:bg-[#fff8f3] sm:flex-row sm:items-center"
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                          <Sparkles className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-serif text-xl font-semibold">
                            {drop.productName}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#746876]">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[#c24f7a]" />
                              {drop.releaseDate}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5 text-[#c24f7a]" />
                              {drop.releaseTime}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5 text-[#c24f7a]" />
                              {drop.limitStock} slots
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDrop(drop.id)
                          }
                          title="Cancel flash drop"
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-[#fffaf6] text-[#b83a42] transition hover:bg-[#f8dddd]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-[380px] place-items-center p-6 text-center">
                    <div>
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1dde5] text-[#c24f7a]">
                        <Calendar className="h-6 w-6" />
                      </span>

                      <h3 className="mt-4 font-serif text-2xl font-semibold">
                        No drops scheduled
                      </h3>

                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#746876]">
                        Choose an available product and
                        schedule a limited pre-order
                        release.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {showCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241629]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-product-title"
        >
          <form
            data-quest="product-form"
            onSubmit={handleCreateProduct}
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#dfd1c4] bg-[#fbf6ee] text-[#241629] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#dfd1c4] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c24f7a]">
                  New menu item
                </p>

                <h2
                  id="new-product-title"
                  className="mt-2 font-serif text-3xl font-semibold"
                >
                  Add product
                </h2>

                <p className="mt-2 text-sm text-[#746876]">
                  Start with the essentials. More
                  product options can be added through
                  Manage product.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreate}
                aria-label="Close new product form"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfd1c4] bg-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <FormField label="Product name">
                <input
                  required
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Red velvet cake"
                  className={inputClass}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Category">
                  <input
                    required
                    value={createForm.category}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder="Cakes"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Base price in PKR">
                  <input
                    required
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={createForm.basePricePkr}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        basePricePkr:
                          event.target.value,
                      }))
                    }
                    placeholder="2500"
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField label="Short description">
                <textarea
                  rows={4}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }))
                  }
                  placeholder="Describe the flavour, size or occasion this product is suited for."
                  className={`${inputClass} resize-none py-3`}
                />
              </FormField>

              {createError ? (
                <p
                  role="alert"
                  className="rounded-xl bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[#a7313b]"
                >
                  {createError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dfd1c4] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeCreate}
                className="min-h-11 rounded-xl border border-[#dfd1c4] bg-white/55 px-5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                data-quest="save-product"
                disabled={createProduct.isPending}
                className="min-h-11 rounded-xl bg-[#632a73] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {createProduct.isPending
                  ? "Saving product…"
                  : "Save product"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {managingProduct ? (
        <ProductEditorPanel
          product={managingProduct}
          onClose={() => setManagingProduct(null)}
          onSaved={() =>
            queryClient.invalidateQueries({
              queryKey:
                getGetBakerProductsQueryKey(bakerId),
            })
          }
        />
      ) : null}
    </DashboardLayout>
  );
}

function CatalogMetric({
  icon: Icon,
  label,
  value,
  valueClass = "",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="border-[#dfd1c4] px-4 py-5 sm:border-r sm:last:border-r-0 lg:px-5">
      <div className="flex items-center gap-2 text-[#746876]">
        <Icon className="h-5 w-5 text-[#c24f7a]" />

        <span className="text-[11px] font-medium">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 font-mono text-2xl font-semibold ${valueClass}`}
      >
        {value.toString().padStart(2, "0")}
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyRequirement({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 border-b border-[#e5cfd9] pb-4 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] font-semibold text-[#c24f7a]">
        {number}
      </span>

      <div>
        <p className="text-sm font-semibold">{title}</p>

        <p className="mt-1 text-xs leading-5 text-[#746876]">
          {description}
        </p>
      </div>
    </div>
  );
}

function HealthRow({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[#746876]">
        {label}
      </span>

      <span
        className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold ${
          complete
            ? "bg-[#e4f3e8] text-[#168a55]"
            : "bg-[#f1e9e2] text-[#746876]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}