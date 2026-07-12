import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useListCustomers, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";

export default function DashboardCustomers() {
  const { bakerId } = useBuyerSession();
  const { data: customers, isLoading } = useListCustomers({ bakerId }, { query: { enabled: !!bakerId, queryKey: getListCustomersQueryKey({ bakerId }) } });

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8 font-serif text-primary">Customer CRM</h1>
        
        {isLoading ? (
          <div className="animate-pulse h-64 bg-muted rounded-xl w-full"></div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-6">Your Regulars</h3>
              <div className="space-y-4">
                {customers?.filter(c => c.isRegular).map(customer => (
                  <div key={customer.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.whatsappNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-primary">PKR {customer.totalSpentPkr.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{customer.totalOrders} orders</p>
                    </div>
                  </div>
                ))}
                {(!customers?.filter(c => c.isRegular).length) && (
                  <p className="text-muted-foreground">No regular customers yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
