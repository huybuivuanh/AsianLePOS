import { useMemo } from "react";
import { OrderStatus } from "@/types/enums";
import { useDineInOrdersStore } from "./useDineInOrdersStore";

/**
 * Derives active (InProgress) dine-in orders directly from the already-running
 * useDineInOrdersStore subscription instead of opening a second Firestore listener.
 *
 * Subscribes to the array reference (not a .filter() selector) so Zustand's
 * Object.is check is stable. The filter runs only when fullDineInOrders changes.
 */
export function useActiveDineInOrdersStore() {
  const fullDineInOrders = useDineInOrdersStore((s) => s.fullDineInOrders);
  const loading = useDineInOrdersStore((s) => s.loading);

  const activeDineInOrders = useMemo(
    () => fullDineInOrders.filter((o) => o.status === OrderStatus.InProgress),
    [fullDineInOrders],
  );

  return { activeDineInOrders, loading };
}
