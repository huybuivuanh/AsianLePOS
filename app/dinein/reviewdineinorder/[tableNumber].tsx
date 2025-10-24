import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import OrderItemCard from "@/components/takeout/reviewOrder/OrderItemCard";
import Header from "@/components/ui/Header";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/providers/AuthProvider";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderStatus, OrderType, TableStatus } from "@/types/enum";
import { generateFirestoreId } from "@/utils/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, Timestamp, writeBatch } from "firebase/firestore";
import React, { useState } from "react";
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

export default function ReviewDineInOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const { submitOrder, clearOrder, getTotalItems, getOrderTotal } =
    useOrderStore();
  const order = useOrderStore((state) => state.order);

  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { updateTable, getTable } = useTableStore();

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      setSubmitting(true);

      const staff: User = {
        id: user.uid,
        name: user.displayName || "Unknown",
        email: user.email || undefined,
      };

      const orderId = generateFirestoreId();

      const newOrder = {
        ...order,
        id: orderId,
        staff: staff,
        orderType: OrderType.DineIn,
        tableNumber: tableNumber,
        guests: getTable(tableNumber)?.guests || 0,
      };

      // Use batch write for all operations to improve performance
      const batch = writeBatch(db);

      // Update table
      const tableRef = doc(db, "tables", tableNumber);
      batch.update(tableRef, {
        currentOrderId: orderId,
        status: TableStatus.Occupied,
      });

      // Calculate total
      const total = (newOrder.orderItems ?? []).reduce(
        (acc, i) => acc + i.price * i.quantity,
        0
      );

      const orderToSubmit = {
        ...newOrder,
        total,
        status: OrderStatus.InProgress,
        printed: false,
        createdAt: Timestamp.fromDate(new Date()),
      };

      // Add order to dineInOrders
      batch.set(doc(db, "dineInOrders", orderId), orderToSubmit);

      // Add order to orderHistory
      batch.set(doc(db, "orderHistory", orderId), orderToSubmit);

      // Execute all operations atomically
      await batch.commit();

      // Clear order from store
      clearOrder();

      router.push({
        pathname: "/dinein/table/[tableNumber]",
        params: { tableNumber },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || (order.orderItems?.length ?? 0) === 0;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      {/* Header */}
      <View className="pb-4">
        <Header title="Review Order" onBack={() => router.back()} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
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

        {/* Clear + Toggle Footer */}
        {order.orderItems && order.orderItems.length > 0 && (
          <View className="flex-row justify-between items-center px-4 mb-2">
            <TouchableOpacity
              onPress={clearOrder}
              className="flex-1 mr-2 bg-orange-400 py-4 rounded-lg items-center"
            >
              <Text className="text-white font-bold text-base">
                Clear Order
              </Text>
            </TouchableOpacity>

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
                  {`Submit ${getTotalItems()} Item(s) - $${getOrderTotal().toFixed(2)}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
}
