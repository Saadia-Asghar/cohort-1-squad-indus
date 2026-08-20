/** Shared React Query defaults so dashboard pages feel instant after first load. */
export const DASHBOARD_STALE_MS = 60_000;
export const ORDERS_POLL_MS = 15_000;
export const NOTIFICATIONS_POLL_MS = 15_000;
export const WORKSPACE_POLL_MS = 120_000;
export const ANALYTICS_POLL_MS = 120_000;

export const dashboardQueryDefaults = {
  staleTime: DASHBOARD_STALE_MS,
  refetchOnWindowFocus: false,
  refetchIntervalInBackground: false,
  retry: 1,
} as const;

export function liveDashboardQuery(pollMs: number) {
  return {
    ...dashboardQueryDefaults,
    staleTime: pollMs,
    refetchInterval: pollMs,
    refetchOnWindowFocus: true,
  };
}
