import { useManagedBaker } from "@/lib/managed-auth";

export function useBuyerSession() {
  const { bakerId } = useManagedBaker();
  return { buyerId: 0, bakerId };
}
