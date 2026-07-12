import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardWorkspace } from "@/components/dashboard/workspace-panel";
import { useGetBakerStats } from "@workspace/api-client-react";
import { useBuyerSession } from "@/hooks/use-session";

export default function DashboardHome() {
  const { bakerId } = useBuyerSession();
  const { data: stats, isLoading } = useGetBakerStats(bakerId, { query: { enabled: !!bakerId, queryKey: ['baker-stats', bakerId] } });

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8 font-serif">Good morning.</h1>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Today's Orders</h3>
              <p className="text-3xl font-bold tabular-nums">{stats?.todayOrders || 0}</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending</h3>
              <p className="text-3xl font-bold text-secondary tabular-nums">{stats?.pendingOrders || 0}</p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Revenue (Today)</h3>
              <p className="text-3xl font-bold text-primary tabular-nums">PKR {stats?.todayRevenue?.toLocaleString() || 0}</p>
            </div>
          </div>
        )}
        <DashboardWorkspace />
      </div>
    </DashboardLayout>
  );
}
