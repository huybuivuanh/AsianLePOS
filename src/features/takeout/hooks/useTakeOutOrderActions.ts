import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { convertOrderTimestamps, resolveTaxBreakdown } from "@/utils/helpers";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useTakeOutOrderActions(takeOutOrders: TakeOutOrder[]) {
  const router = useRouter();
  const { setOrder } = useCartStore();
  const {
    cancelOrder,
    completeOrder,
    markOrderAsPaid,
    submitToPrintQueue,
    submitSelectedItemsToPrintQueue,
  } = useOrderStore();

  const [actionOverlay, setActionOverlay] = useState<{ title: string } | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [cashPaymentOrderId, setCashPaymentOrderId] = useState<string | null>(null);

  const selectedItemIdsRef = useRef(selectedItemIds);
  useEffect(() => {
    selectedItemIdsRef.current = selectedItemIds;
  }, [selectedItemIds]);

  const cashPaymentModalTotal = useMemo(() => {
    if (!cashPaymentOrderId) return 0;
    const o = takeOutOrders.find((x) => x.id === cashPaymentOrderId);
    if (!o) return 0;
    return resolveTaxBreakdown(o)?.total ?? 0;
  }, [cashPaymentOrderId, takeOutOrders]);

  useEffect(() => {
    if (cashPaymentOrderId && !takeOutOrders.some((x) => x.id === cashPaymentOrderId)) {
      setCashPaymentOrderId(null);
    }
  }, [cashPaymentOrderId, takeOutOrders]);

  useEffect(() => {
    if (selectionMode && !takeOutOrders.some((x) => x.id === selectionMode)) {
      setSelectionMode(null);
      setSelectedItemIds(new Set());
    }
  }, [selectionMode, takeOutOrders]);

  const extraData = useMemo(
    () => ({ expandedOrderId, selectionMode, selectedItemIdsSize: selectedItemIds.size }),
    [expandedOrderId, selectionMode, selectedItemIds.size],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  }, []);

  const handleComplete = useCallback(
    async (order: TakeOutOrder) => {
      try { await completeOrder(order); } catch (e) { console.error("❌ Error completing order:", e); }
    },
    [completeOrder],
  );

  const handleCancel = useCallback(
    async (order: TakeOutOrder) => {
      try { await cancelOrder(order); } catch (e) { console.error("❌ Error canceling order:", e); }
    },
    [cancelOrder],
  );

  const handlePrint = useCallback(
    async (order: TakeOutOrder) => {
      try {
        setActionOverlay({ title: "Sending to printer…" });
        await submitToPrintQueue(order);
      } catch (e) { console.error("❌ Error printing:", e); } finally { setActionOverlay(null); }
    },
    [submitToPrintQueue],
  );

  const handleToggleSelectionMode = useCallback((orderId: string) => {
    setSelectionMode((prev) => {
      if (prev === orderId) {
        setSelectedItemIds(new Set());
        return null;
      }
      setCashPaymentOrderId(null);
      setSelectedItemIds(new Set());
      return orderId;
    });
  }, []);

  const handleToggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handlePrintSelected = useCallback(
    async (order: TakeOutOrder) => {
      try {
        setActionOverlay({ title: "Sending to printer…" });
        await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIdsRef.current));
        setSelectionMode(null);
        setSelectedItemIds(new Set());
      } catch (e) { console.error("❌ Error printing selected:", e); } finally { setActionOverlay(null); }
    },
    [submitSelectedItemsToPrintQueue],
  );

  const handleMarkAsPaid = useCallback(
    async (order: TakeOutOrder, paid: boolean) => {
      try { await markOrderAsPaid(order, paid); } catch (e) { console.error("❌ Error marking paid:", e); }
    },
    [markOrderAsPaid],
  );

  const handleEditOrder = useCallback(
    (order: TakeOutOrder) => {
      setOrder(convertOrderTimestamps(order));
      router.push("/take-out-orders/edit-order" as Href);
    },
    [setOrder, router],
  );

  const handleOpenCashPayment = useCallback((orderId: string) => {
    setCashPaymentOrderId(orderId);
  }, []);

  const handleCloseCashPayment = useCallback(() => {
    setCashPaymentOrderId(null);
  }, []);

  const handleChangeToDineIn = useCallback(
    (orderId: string) => {
      router.push({
        pathname: "/take-out-orders/change-to-dinein/[orderId]",
        params: { orderId },
      } as Href);
    },
    [router],
  );

  return {
    actionOverlay,
    expandedOrderId,
    setExpandedOrderId,
    selectionMode,
    selectedItemIds,
    cashPaymentOrderId,
    cashPaymentModalTotal,
    extraData,
    toggleExpand,
    handleComplete,
    handleCancel,
    handlePrint,
    handleToggleSelectionMode,
    handleToggleItemSelection,
    handlePrintSelected,
    handleMarkAsPaid,
    handleEditOrder,
    handleOpenCashPayment,
    handleCloseCashPayment,
    handleChangeToDineIn,
  };
}
