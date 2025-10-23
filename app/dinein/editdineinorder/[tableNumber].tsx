import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import OrderItemCard from "@/components/takeout/reviewOrder/OrderItemCard";
import Header from "@/components/ui/Header";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const { setOrder, clearOrder, updateOrder } = useOrderStore();
  const { updateOrderOnFirestore } = useOrderStore();
  const order = useOrderStore((state) => state.order);

  const { user } = useAuth();

  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber)
  );

  const { dineInOrders } = useLiveOrdersStore();

  // ✅ Find the current order using table.currentOrderId
  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return dineInOrders.find(
      (o) => o.id === table.currentOrderId && o.status !== "completed"
    );
  }, [dineInOrders, table]);

  // ✅ Sync order store with live data
  useEffect(() => {
    if (currentOrder) setOrder(currentOrder);
    else clearOrder();
  }, [currentOrder, table, clearOrder, setOrder]);

  // Local UI states
  const [submitting, setSubmitting] = useState(false);

  // Handle order submission
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      const staff: User = {
        id: user.uid,
        name: user.displayName || "Unknown",
        email: user.email || undefined,
      };
      updateOrder({
        staff: staff,
      });
      setSubmitting(true);
      await updateOrderOnFirestore(order);
      router.replace({
        pathname: "/dinein/table/[tableNumber]",
        params: { tableNumber },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    router.push("/liveorders/additempage");
  };

  const isSubmitDisabled = submitting || (order.orderItems?.length ?? 0) === 0;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      {/* Custom Header */}
      <Header
        title="Edit Order"
        onBack={() => {
          router.back();
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Add Item Button */}
        <View className="flex-row justify-center items-center p-4">
          <TouchableOpacity
            className="bg-orange-400 px-4 py-3 rounded-full w-80 mb-4 items-center"
            onPress={handleAddItem}
          >
            <Text className="text-white font-semibold">Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Items */}
        <KeyboardAwareScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
        >
          {!order.orderItems || order.orderItems.length === 0 ? (
            <Text className="text-gray-500 text-center mt-10">
              Your order is empty.
            </Text>
          ) : (
            order.orderItems.map((item, index) => (
              <OrderItemCard key={`${item.id}-${index}`} item={item} />
            ))
          )}
        </KeyboardAwareScrollView>

        <View className="flex-row justify-between items-center px-4 mb-2">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            className={`flex-1 bg-gray-800 py-4 rounded-lg items-center ${
              isSubmitDisabled ? "opacity-50" : ""
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Submit Update
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
}
