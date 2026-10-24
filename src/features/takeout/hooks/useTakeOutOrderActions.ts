import {
  createCustomerDisplayChannel,
  type CustomerDisplayMessage,
} from "@/lib/customerDisplay";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { DiscountType } from "@/types/enums";
import {
  calculateTaxBreakdown,
  convertOrderTimestamps,
  EMPTY_TAX_BREAKDOWN,
  resolveTaxBreakdown,
} from "@/utils/helpers";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
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
    () => ({ expandedOrderIds, selectionMode, selectedItemIdsSize: selectedItemIds.size }),
    [expandedOrderIds, selectionMode, selectedItemIds.size],
  );

  // Tracks whichever order was most recently expanded, so the customer
  // display knows which one to show if more than one card happens to be
  // expanded at once.
  const [lastExpandedId, setLastExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    let collapsed = false;
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        collapsed = true;
      } else {
        next.add(id);
        setLastExpandedId(id);
      }
      return next;
    });
    // Collapsing the order currently being split-billed should exit
    // selection mode too — otherwise it lingers invisibly until the card is
    // re-expanded, and the customer display would keep showing its selected
    // items total after the card closes.
    if (collapsed) {
      setSelectionMode((prev) => {
        if (prev !== id) return prev;
        setSelectedItemIds(new Set());
        return null;
      });
    }
  }, []);

  const expandOrder = useCallback((id: string) => {
    setExpandedOrderIds((prev) => {
      if (prev.has(id)) return prev;
      setLastExpandedId(id);
      return new Set(prev).add(id);
    });
  }, []);

  // Collapse every card when navigating away from this screen — another
  // tab, or a sub-screen (edit-order, change-to-dinein) pushed on top.
  // Tabs stay mounted on blur rather than unmounting, so a plain useEffect
  // cleanup wouldn't fire here; this also exits selection mode and clears
  // the active order, which sends the customer display back to idle
  // instead of leaving it mid-review for an order nobody's looking at.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setExpandedOrderIds(new Set());
        setSelectionMode(null);
        setSelectedItemIds(new Set());
        setLastExpandedId(null);
      };
    }, []),
  );

  // The order currently "on display" at the counter: whichever one is in
  // selection mode, else whichever was most recently expanded (if it's
  // still expanded) — mirrors the dine-in table screen's "navigate to a
  // table" trigger, just scoped to a list of cards instead of one screen.
  const activeOrderId = useMemo(() => {
    if (selectionMode) return selectionMode;
    return lastExpandedId && expandedOrderIds.has(lastExpandedId)
      ? lastExpandedId
      : null;
  }, [selectionMode, expandedOrderIds, lastExpandedId]);

  const activeOrder = useMemo(
    () =>
      activeOrderId ? takeOutOrders.find((o) => o.id === activeOrderId) : undefined,
    [activeOrderId, takeOutOrders],
  );

  const activeSelectedItemsTotal = useMemo(() => {
    if (!selectionMode || !activeOrder?.orderItems || selectedItemIds.size === 0) {
      return 0;
    }
    return activeOrder.orderItems
      .filter((oi) => oi.id && selectedItemIds.has(oi.id))
      .reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
  }, [selectionMode, activeOrder, selectedItemIds]);

  const activeSelectedItemsTaxBreakDown = useMemo(
    () =>
      activeSelectedItemsTotal === 0
        ? EMPTY_TAX_BREAKDOWN
        : calculateTaxBreakdown(activeSelectedItemsTotal, DiscountType.None, 0),
    [activeSelectedItemsTotal],
  );

  // Mirror whichever order is "on display" onto the customer-facing counter
  // screen. Cleared back to idle the moment nothing is active (collapsed,
  // or selection mode cancelled) rather than leaving a stale bill up.
  const lastBillMessageRef = useRef<CustomerDisplayMessage | null>(null);
  const displayChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const channel = createCustomerDisplayChannel();
    if (!channel) return;
    displayChannelRef.current = channel;

    channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      if (event.data?.type === "hello" && lastBillMessageRef.current) {
        channel.postMessage(lastBillMessageRef.current);
      }
    };

    return () => {
      const clearMessage: CustomerDisplayMessage = { type: "clear" };
      channel.postMessage(clearMessage);
      channel.close();
      displayChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const channel = displayChannelRef.current;
    if (!channel) return;

    if (!activeOrder?.orderItems?.length) {
      lastBillMessageRef.current = null;
      const clearMessage: CustomerDisplayMessage = { type: "clear" };
      channel.postMessage(clearMessage);
      return;
    }

    const message: CustomerDisplayMessage = selectionMode
      ? {
          type: "bill",
          items: activeOrder.orderItems.filter(
            (oi) => oi.id && selectedItemIds.has(oi.id),
          ),
          taxBreakDown: activeSelectedItemsTaxBreakDown,
          customerName: activeOrder.customerName,
          phoneNumber: activeOrder.phoneNumber,
          staff: activeOrder.staff,
        }
      : {
          type: "bill",
          items: activeOrder.orderItems,
          taxBreakDown: resolveTaxBreakdown(activeOrder),
          customerName: activeOrder.customerName,
          phoneNumber: activeOrder.phoneNumber,
          staff: activeOrder.staff,
        };
    lastBillMessageRef.current = message;
    channel.postMessage(message);
  }, [activeOrder, selectionMode, selectedItemIds, activeSelectedItemsTaxBreakDown]);

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
    expandedOrderIds,
    expandOrder,
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
