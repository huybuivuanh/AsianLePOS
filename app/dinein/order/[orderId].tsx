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

  const toggleSelectionMode = () => {
    setSelectionMode((p) => !p);
    setSelectedItemIds(new Set());
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handlePrintAll = async () => {
    if (!order) return;
    try {
      await submitToPrintQueue(order);
    } catch (e) {
      console.error("❌ Error submitting to print queue:", e);
    }
  };

  const handlePrintSelected = async () => {
    if (!order) return;
    try {
      await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
      setSelectionMode(false);
      setSelectedItemIds(new Set());
    } catch (e) {
      console.error("❌ Error printing selected items:", e);
    }
  };

  const handleToggleLinePaid = useCallback(
    async (itemId: string, nextPaid: boolean) => {
      if (!order || !orderIdStr || !order.orderItems?.length) return;
      try {
        const nextItems = order.orderItems.map((it) =>
          it.id === itemId ? { ...it, paid: nextPaid } : it,
        );
        await updateDoc(doc(db, "dineInOrders", orderIdStr), {
          orderItems: nextItems,
          paid: orderPaidFromLineItems(nextItems),
        });
      } catch (e) {
        console.error("❌ Error updating line paid state:", e);
      }
    },
    [order, orderIdStr],
  );

  const handleMarkSelectedPaid = async () => {
    if (!order || !orderIdStr || selectedItemIds.size === 0) return;
    const items = order.orderItems ?? [];
    try {
      const nextItems = items.map((it) =>
        it.id && selectedItemIds.has(it.id) ? { ...it, paid: true } : it,
      );
      await updateDoc(doc(db, "dineInOrders", orderIdStr), {
        orderItems: nextItems,
        paid: orderPaidFromLineItems(nextItems),
      });
      setSelectionMode(false);
      setSelectedItemIds(new Set());
    } catch (e) {
      console.error("❌ Error marking selected items paid:", e);
    }
  };

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
        onBack={() => router.back()}
      />
      <ScrollView
        style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
        contentContainerStyle={{
          flexGrow: 1,
          alignSelf: "stretch",
          width: "100%",
          padding: 16,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="w-full bg-white border border-gray-200 rounded-2xl p-4"
          style={{ alignSelf: "stretch" }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-extrabold text-gray-900">
              Order Items
            </Text>

            <TouchableOpacity
              onPress={toggleSelectionMode}
              className={`px-3 py-2 rounded-md ${
                selectionMode ? "bg-gray-700" : "bg-purple-600"
              }`}
            >
              <Text className="text-white font-semibold text-sm">
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
              orderSubtotal={orderSubtotal(order)}
            />
          )}

          <View className="mt-3">
            {selectionMode ? (
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
                <TouchableOpacity
                  className="bg-gray-600 px-4 py-3 rounded-lg items-center justify-center mt-2"
                  onPress={toggleSelectionMode}
                >
                  <Text className="text-white font-semibold text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                className="bg-blue-600 px-4 py-3 rounded-lg items-center justify-center w-full"
                onPress={handlePrintAll}
              >
                <Text className="text-white font-semibold text-center">
                  Print
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaViewWrapper>
  );
}
