import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import OrderTaxBreakdown from "@/features/order/components/OrderTaxBreakdown";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { db } from "@/lib/firebaseConfig";
import { useOrderStore } from "@/stores/useOrderStore";
import { DiscountType } from "@/types/enums";
import Header from "@/ui/Header";
import {
  calculateTaxBreakdown,
  EMPTY_TAX_BREAKDOWN,
  orderPaidFromLineItems,
  orderSubtotal,
  resolveTaxBreakdown,
} from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const scrollViewStyle = { flex: 1, width: "100%" as const, alignSelf: "stretch" as const };
const scrollContentStyle = {
  flexGrow: 1,
  alignSelf: "stretch" as const,
  width: "100%" as const,
  padding: 16,
  paddingBottom: 24,
};

export default function DineInOrderDetails() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DineInOrder | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [cashPaymentModalVisible, setCashPaymentModalVisible] = useState(false);

  const { submitToPrintQueue, submitSelectedItemsToPrintQueue } =
    useOrderStore();

  useEffect(() => {
    if (!orderIdStr) return;

    setLoading(true);
    const ref = doc(db, "dineInOrders", orderIdStr);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setOrder(null);
          setLoading(false);
          return;
        }
        setOrder({ id: snap.id, ...(snap.data() as DineInOrder) });
        setLoading(false);
      },
      (err) => {
        console.error("❌ Dine-in order snapshot error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [orderIdStr]);

  const taxBreakDown = useMemo(
    () => (order ? resolveTaxBreakdown(order) : undefined),
    [order],
  );

  const selectedItemsTotal = useMemo(() => {
    if (!selectionMode || !order?.orderItems || selectedItemIds.size === 0) {
      return 0;
    }
    return order.orderItems
      .filter((it) => it.id && selectedItemIds.has(it.id))
      .reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [selectionMode, order?.orderItems, selectedItemIds]);

  const selectedItemsTaxBreakDown = useMemo(() => {
    if (selectedItemsTotal === 0) {
      return EMPTY_TAX_BREAKDOWN;
    }
    return calculateTaxBreakdown(selectedItemsTotal, DiscountType.None, 0);
  }, [selectedItemsTotal]);

  useEffect(() => {
    if (!selectionMode) setCashPaymentModalVisible(false);
  }, [selectionMode]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((p) => !p);
    setSelectedItemIds(new Set());
  }, []);

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handlePrintAll = useCallback(async () => {
    if (!order) return;
    try {
      await submitToPrintQueue(order);
    } catch (e) {
      console.error("❌ Error submitting to print queue:", e);
    }
  }, [order, submitToPrintQueue]);

  const handlePrintSelected = useCallback(async () => {
    if (!order) return;
    try {
      await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
      setSelectionMode(false);
      setSelectedItemIds(new Set());
    } catch (e) {
      console.error("❌ Error printing selected items:", e);
    }
  }, [order, selectedItemIds, submitSelectedItemsToPrintQueue]);

  const handleToggleLinePaid = useCallback(
    async (itemId: string, nextPaid: boolean) => {
      if (!order || !orderIdStr || !order.orderItems?.length) return;
      try {
        const nextItems = order.orderItems.map((it) =>
          it.id === itemId ? { ...it, paid: nextPaid } : it,
        );
        await updateDoc(doc(db, "dineInOrders", orderIdStr), {
          orderItems: nextItems,
        });
      } catch (e) {
        console.error("❌ Error updating line paid state:", e);
      }
    },
    [order, orderIdStr],
  );

  const handleMarkSelectedPaid = useCallback(async () => {
    if (!order || !orderIdStr || selectedItemIds.size === 0) return;
    const items = order.orderItems ?? [];
    try {
      const nextItems = items.map((it) =>
        it.id && selectedItemIds.has(it.id) ? { ...it, paid: true } : it,
      );
      await updateDoc(doc(db, "dineInOrders", orderIdStr), {
        orderItems: nextItems,
      });
      setSelectionMode(false);
      setSelectedItemIds(new Set());
    } catch (e) {
      console.error("❌ Error marking selected items paid:", e);
    }
  }, [order, orderIdStr, selectedItemIds]);

  const orderSubtotalMemo = useMemo(() => (order ? orderSubtotal(order) : 0), [order]);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleCloseCashModal = useCallback(
    () => setCashPaymentModalVisible(false),
    [],
  );

  if (loading) {
    return (
      <SafeAreaViewWrapper className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading order...</Text>
      </SafeAreaViewWrapper>
    );
  }

  if (!order) {
    return (
      <SafeAreaViewWrapper className="flex-1 bg-gray-100">
        <Header title="Order" onBack={() => router.back()} />
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-gray-600">Order not found.</Text>
        </View>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title={`Table ${order.tableNumber}`}
        onBack={handleBack}
      />
      <ScrollView
        style={scrollViewStyle}
        contentContainerStyle={scrollContentStyle}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="w-full bg-white border border-gray-200 rounded-2xl p-4"
          style={{ alignSelf: "stretch" }}
        >
          <View className="flex-row items-stretch gap-2 mb-3 w-full">
            <View className="flex-1 justify-center min-w-0">
              <Text className="text-lg font-extrabold text-gray-900">
                Order Items
              </Text>
            </View>
            <TouchableOpacity
              className="flex-1 min-w-0 bg-blue-600 px-2 py-3 rounded-md items-center justify-center"
              onPress={handlePrintAll}
            >
              <Text
                className="text-white font-semibold text-center"
                numberOfLines={2}
              >
                Print
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleSelectionMode}
              className={`flex-1 min-w-0 px-2 py-3 rounded-md items-center justify-center ${
                selectionMode ? "bg-gray-700" : "bg-purple-600"
              }`}
            >
              <Text
                className="text-white font-semibold text-sm text-center"
                numberOfLines={2}
              >
                {selectionMode ? "Cancel Selection" : "Select Items"}
              </Text>
            </TouchableOpacity>
          </View>

          <OrderItemsList
            orderItems={order.orderItems}
            orderId={order.id!}
            selectionMode={selectionMode ? order.id! : null}
            selectedItemIds={selectedItemIds}
            onToggleItemSelection={toggleItemSelection}
            linePaidToggleEnabled
            onToggleLinePaid={handleToggleLinePaid}
          />

          {taxBreakDown && (
            <OrderTaxBreakdown
              taxBreakDown={taxBreakDown}
              isSelectionMode={selectionMode}
              selectedItemsTotal={selectedItemsTotal}
              selectedItemsTaxBreakDown={selectedItemsTaxBreakDown}
              orderSubtotal={orderSubtotalMemo}
            />
          )}

          <View className="mt-3">
            {selectionMode && (
              <>
                <View className="flex-row">
                  <TouchableOpacity
                    className={`bg-green-600 px-3 py-3 rounded-lg items-center justify-center flex-1 mr-1.5 ${
                      selectedItemIds.size === 0 ? "opacity-50" : "opacity-100"
                    }`}
                    onPress={handlePrintSelected}
                    disabled={selectedItemIds.size === 0}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Print Selected ({selectedItemIds.size})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`bg-emerald-700 px-3 py-3 rounded-lg items-center justify-center flex-1 ml-1.5 ${
                      selectedItemIds.size === 0 ? "opacity-50" : "opacity-100"
                    }`}
                    onPress={handleMarkSelectedPaid}
                    disabled={selectedItemIds.size === 0}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Mark Paid
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row mt-2">
                  <TouchableOpacity
                    className="bg-red-600 px-3 py-3 rounded-lg items-center justify-center flex-1 mr-1.5"
                    onPress={toggleSelectionMode}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`bg-yellow-600 px-3 py-3 rounded-lg items-center justify-center flex-1 ml-1.5 ${
                      selectedItemIds.size === 0 ? "opacity-50" : "opacity-100"
                    }`}
                    onPress={() => setCashPaymentModalVisible(true)}
                    disabled={selectedItemIds.size === 0}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Cash payment (selected)
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <CashPaymentModal
        visible={cashPaymentModalVisible}
        onClose={handleCloseCashModal}
        orderTotal={selectedItemsTaxBreakDown.total}
      />
    </SafeAreaViewWrapper>
  );
}
