import { OrderStatus } from "@/types/enums";
import { useDineInOrdersStore } from "./useDineInOrdersStore";

/**
 * Derives active (InProgress) dine-in orders directly from the already-running
 * useDineInOrdersStore subscription instead of opening a second Firestore listener.
 */
export function useActiveDineInOrdersStore() {
  const activeDineInOrders = useDineInOrdersStore((s) =>
    s.fullDineInOrders.filter((o) => o.status === OrderStatus.InProgress),
  );
  const loading = useDineInOrdersStore((s) => s.loading);
  return { activeDineInOrders, loading };
}
