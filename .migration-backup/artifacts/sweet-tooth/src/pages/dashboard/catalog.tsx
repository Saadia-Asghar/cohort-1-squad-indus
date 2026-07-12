import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGetBakerProducts, useToggleProductStock, getGetBakerProductsQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardCatalog() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useGetBakerProducts(bakerId, { query: { enabled: !!bakerId, queryKey: getGetBakerProductsQueryKey(bakerId) } });
  const toggleStock = useToggleProductStock();

  const handleToggle = (productId: number) => {
    toggleStock.mutate({ productId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBakerProductsQueryKey(bakerId) });
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-serif text-primary">Catalog Editor</h1>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
            Add Product
          </button>
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
