import { updateLineItemsPaid } from "@/services/orderService";
import { useCallback, useEffect, useRef } from "react";

type PendingToggle = {
  orderId: string;
  items: OrderItem[];
  timer: ReturnType<typeof setTimeout>;
};

type UseLinePaidDebounceResult = {
  handleToggleLinePaid: (
    itemId: string,
    nextPaid: boolean,
    orderId: string,
    orderItems: OrderItem[],
    onOptimisticUpdate: (items: OrderItem[]) => void,
  ) => void;
  flushPendingToggle: () => Promise<void>;
  cancelPendingToggle: () => void;
};

/**
 * Debounces rapid paid-toggle taps into a single Firestore write.
 * Each tap updates local state immediately (optimistic); the write fires
 * 400ms after the last tap in a sequence.
 */
export function useLinePaidDebounce(): UseLinePaidDebounceResult {
  const pendingRef = useRef<PendingToggle | null>(null);

  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    };
  }, []);

  const cancelPendingToggle = useCallback(() => {
    if (!pendingRef.current) return;
    clearTimeout(pendingRef.current.timer);
    pendingRef.current = null;
  }, []);

  const flushPendingToggle = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    await updateLineItemsPaid(pending.orderId, pending.items);
  }, []);

  const handleToggleLinePaid = useCallback(
    (
      itemId: string,
      nextPaid: boolean,
      orderId: string,
      orderItems: OrderItem[],
      onOptimisticUpdate: (items: OrderItem[]) => void,
    ) => {
      const base =
        pendingRef.current?.orderId === orderId
          ? pendingRef.current.items
          : orderItems;

      const nextItems = base.map((it) =>
        it.id === itemId ? { ...it, paid: nextPaid } : it,
      );

      onOptimisticUpdate(nextItems);

      if (pendingRef.current?.timer) clearTimeout(pendingRef.current.timer);

      const timer = setTimeout(() => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (!pending) return;
        updateLineItemsPaid(pending.orderId, pending.items).catch((e) => {
          console.error("❌ Error updating line paid state:", e);
        });
      }, 400);

      pendingRef.current = { orderId, items: nextItems, timer };
    },
    [],
  );

  return { handleToggleLinePaid, flushPendingToggle, cancelPendingToggle };
}
