import { useOrderStore } from "@/stores/useOrderStore";
import { useDisclosure } from "@/hooks/useDisclosure";
import { showAlert } from "@/utils/helpers";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

const OPERATION_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Operation timed out. Please check your connection and try again.")),
        OPERATION_TIMEOUT_MS,
      ),
    ),
  ]);
}

type ActionOverlay = { title: string } | null;

type UseDineInTableActionsResult = {
  actionOverlay: ActionOverlay;
  actionBusy: boolean;
  cashModal: ReturnType<typeof useDisclosure>;
  handleCancelOrder: (order: Partial<DineInOrder>, onSuccess: () => void) => Promise<void>;
  handleCompleteOrder: (order: Partial<DineInOrder>, flush: () => Promise<void>, onSuccess: () => void) => Promise<void>;
  handlePrint: (order: Partial<DineInOrder>) => Promise<void>;
  handleMarkAsPaid: (order: Partial<DineInOrder>, paid: boolean) => Promise<void>;
  handlePrintSelected: (order: Partial<DineInOrder>, selectedItemIds: Set<string>, onSuccess: () => void) => Promise<void>;
  handleMarkSelectedPaid: (order: Partial<DineInOrder>, selectedItemIds: Set<string>, cancelDebounce: () => void, onSuccess: (items: OrderItem[]) => void) => Promise<void>;
};

export function useDineInTableActions(): UseDineInTableActionsResult {
  const router = useRouter();
  const [actionOverlay, setActionOverlay] = useState<ActionOverlay>(null);
  const cashModal = useDisclosure();
  const {
    cancelOrder,
    completeOrder,
    markOrderAsPaid,
    submitToPrintQueue,
    submitSelectedItemsToPrintQueue,
  } = useOrderStore();

  const handleCancelOrder = useCallback(
    async (order: Partial<DineInOrder>, onSuccess: () => void) => {
      try {
        setActionOverlay({ title: "Cancelling order…" });
        await withTimeout(cancelOrder(order));
        onSuccess();
        router.back();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to cancel order. Please try again.";
        showAlert("Error", msg);
      } finally {
        setActionOverlay(null);
      }
    },
    [cancelOrder, router],
  );

  const handleCompleteOrder = useCallback(
    async (order: Partial<DineInOrder>, flush: () => Promise<void>, onSuccess: () => void) => {
      try {
        setActionOverlay({ title: "Completing order…" });
        await withTimeout(flush());
        await withTimeout(completeOrder(order));
        onSuccess();
        router.back();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to complete order. Please try again.";
        showAlert("Error", msg);
      } finally {
        setActionOverlay(null);
      }
    },
    [completeOrder, router],
  );

  const handlePrint = useCallback(
    async (order: Partial<DineInOrder>) => {
      try {
        setActionOverlay({ title: "Sending to printer…" });
        await submitToPrintQueue(order);
      } catch (e) {
        console.error("❌ Error submitting to print queue:", e);
      } finally {
        setActionOverlay(null);
      }
    },
    [submitToPrintQueue],
  );

  const handleMarkAsPaid = useCallback(
    async (order: Partial<DineInOrder>, paid: boolean) => {
      try {
        setActionOverlay({ title: paid ? "Marking as paid…" : "Updating payment…" });
        await markOrderAsPaid(order, paid);
      } catch (e) {
        console.error("❌ Error marking order as paid:", e);
      } finally {
        setActionOverlay(null);
      }
    },
    [markOrderAsPaid],
  );

  const handlePrintSelected = useCallback(
    async (order: Partial<DineInOrder>, selectedItemIds: Set<string>, onSuccess: () => void) => {
      if (!order?.id || selectedItemIds.size === 0) return;
      try {
        setActionOverlay({ title: "Sending to printer…" });
        await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
        onSuccess();
      } catch (e) {
        console.error("❌ Error printing selected items:", e);
      } finally {
        setActionOverlay(null);
      }
    },
    [submitSelectedItemsToPrintQueue],
  );

  const handleMarkSelectedPaid = useCallback(
    async (
      order: Partial<DineInOrder>,
      selectedItemIds: Set<string>,
      cancelDebounce: () => void,
      onSuccess: (items: OrderItem[]) => void,
    ) => {
      if (!order?.id || selectedItemIds.size === 0) return;
      const items = order.orderItems ?? [];
      const nextItems = items.map((it) =>
        it.id && selectedItemIds.has(it.id) ? { ...it, paid: true } : it,
      );
      onSuccess(nextItems);
      cancelDebounce();
      try {
        const { updateLineItemsPaid } = await import("@/services/orderService");
        await updateLineItemsPaid(order.id, nextItems);
      } catch (e) {
        console.error("❌ Error marking selected items paid:", e);
      }
    },
    [],
  );

  return {
    actionOverlay,
    actionBusy: Boolean(actionOverlay),
    cashModal,
    handleCancelOrder,
    handleCompleteOrder,
    handlePrint,
    handleMarkAsPaid,
    handlePrintSelected,
    handleMarkSelectedPaid,
  };
}
