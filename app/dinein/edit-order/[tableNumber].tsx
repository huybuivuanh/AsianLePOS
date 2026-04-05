import { OrderLinesList } from "@/features/order";
import DiscountButtonModalAndSummary from "@/features/order/components/DiscountButtonModalAndSummary";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useAuth } from "@/providers/AuthProvider";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderStatus } from "@/types/enums";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import { convertOrderTimestamps, showAlert } from "@/utils/helpers";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function EditDinInOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const order = useOrderStore((s) => s.order);
  const updateOrderOnFirestore = useOrderStore((s) => s.updateOrderOnFirestore);
  const clearOrder = useOrderStore((s) => s.clearOrder);
  const setOrder = useOrderStore((s) => s.setOrder);

  const { user } = useAuth();

  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );

  const { activeDineInOrders } = useActiveDineInOrdersStore();

  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return activeDineInOrders.find(
      (o) =>
        o.id === table.currentOrderId && o.status === OrderStatus.InProgress,
    );
  }, [activeDineInOrders, table]);

  useEffect(() => {
    if (!currentOrder?.id) return;
    setOrder(convertOrderTimestamps(currentOrder));
    // Only re-hydrate when this table’s order id changes — not on every live snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.id]);

  const [submitting, setSubmitting] = useState(false);

  const taxBreakDown = order.taxBreakDown;

  const handleSubmit = async () => {
    if (!user || !order.id) {
      showAlert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      setSubmitting(true);
      await updateOrderOnFirestore(order);
      clearOrder();
      router.replace({
        pathname: "/dinein/table/[tableNumber]",
        params: { tableNumber },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit order.";
      showAlert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    if (!order.id) return;
    router.push("/take-out-orders/add-item" as Href);
  };

  const isSubmitDisabled = submitting || (order.orderItems?.length ?? 0) === 0;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header
        title="Edit Order"
        onBack={() => {
          if (submitting) return;
          clearOrder();
          router.back();
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <View className="flex-row justify-center items-center p-4">
          <TouchableOpacity
            className="bg-orange-400 px-4 py-3 rounded-md w-80 mb-4 items-center"
            onPress={handleAddItem}
            disabled={submitting}
          >
            <Text className="text-white font-semibold">Add Item</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
        >
          <OrderLinesList orderItems={order.orderItems} />
          <DiscountButtonModalAndSummary />
        </KeyboardAwareScrollView>

        <View className="flex-row justify-between items-center px-4 mb-2">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            className={`flex-1 bg-gray-800 py-4 rounded-md items-center ${
              isSubmitDisabled ? "opacity-50" : ""
            }`}
          >
            <Text className="text-white font-bold text-base">
              {submitting
                ? "Saving…"
                : `Submit Update - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <FullScreenLoadingOverlay visible={submitting} title="Saving order…" />
    </SafeAreaViewWrapper>
  );
}
