import { OrderLinesList } from "@/features/order";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/providers/AuthProvider";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderStatus, OrderType, TableStatus } from "@/types/enums";
import Header from "@/ui/Header";
import {
  calculateTaxBreakdown,
  generateFirestoreId,
  showAlert,
} from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, Timestamp, writeBatch } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
  const { clearOrder, getTotalItems, getTaxBreakdown } = useOrderStore();
  const order = useOrderStore((state) => state.order);
  const taxBreakDown = getTaxBreakdown();

  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { getTable } = useTableStore();

  const handleSubmit = async () => {
    if (!user) {
      showAlert("Error", "You must be logged in to submit an order.");
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

      // Use batch write for all operations to improve performance
      const batch = writeBatch(db);

      // Update table
      const tableRef = doc(db, "tables", tableNumber);
      batch.update(tableRef, {
        currentOrderId: orderId,
        status: TableStatus.Occupied,
      });

      const subtotal = (order.orderItems ?? []).reduce(
        (acc, i) => acc + i.price * i.quantity,
        0,
      );
      const computedTax = calculateTaxBreakdown(subtotal);

      const orderToSubmit = {
        id: orderId,
        staff,
        orderType: OrderType.DineIn,
        tableNumber,
        guests: getTable(tableNumber)?.guests || 0,
        orderItems: order.orderItems,
        taxBreakDown: computedTax,
        status: OrderStatus.InProgress,
        paid: false,
        printed: false,
        createdAt: Timestamp.fromDate(new Date()),
      };

      // Add order to dineInOrders
      batch.set(doc(db, "dineInOrders", orderId), orderToSubmit);

      // Execute all operations atomically
      await batch.commit();

      // Clear order from store
      clearOrder();

      router.push({
        pathname: "/dinein/table/[tableNumber]",
        params: { tableNumber },
      });
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to submit order.");
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
          <OrderLinesList orderItems={order.orderItems} />
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
                  {`Submit ${getTotalItems()} Item(s) - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
}
