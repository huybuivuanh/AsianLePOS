import { OrderLinesList } from "@/features/order";
import DiscountButtonModalAndSummary from "@/features/order/components/DiscountButtonModalAndSummary";
import StaffPickerModal from "@/features/order/components/StaffPickerModal";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useAuth } from "@/providers/AuthProvider";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { useTableStore } from "@/stores/useTableStore";
import Header from "@/ui/Header";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import { generateFirestoreId, showAlert } from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
  const { clearOrder, getTotalItems, getTaxBreakdown } = useCartStore();
  const order = useCartStore((state) => state.order);
  const { submitOrder } = useOrderStore();
  const taxBreakDown = getTaxBreakdown();

  const { user } = useAuth();
  const sharedDeskMode = useStaffStore((s) => s.sharedDeskMode);
  const [submitting, setSubmitting] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const { getTable } = useTableStore();

  const handleSubmit = async (overrideStaffName?: string) => {
    if (!user) {
      showAlert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      setSubmitting(true);

      const staffName =
        overrideStaffName ||
        user.displayName?.trim() ||
        user.email?.trim() ||
        "Unknown";

      const newOrder = {
        ...order,
        id: generateFirestoreId(),
        staff: staffName,
        tableNumber: tableNumber as string,
        guests: getTable(tableNumber as string)?.guests ?? 0,
      };

      const { merged } = await submitOrder(newOrder);

      if (merged) {
        showAlert(
          "Order Updated",
          "This table already had an order in progress — your items were added to it.",
        );
      }

      router.dismiss(2);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPress = () => {
    if (sharedDeskMode) {
      setShowStaffModal(true);
    } else {
      void handleSubmit();
    }
  };

  const isSubmitDisabled = submitting || (order.orderItems?.length ?? 0) === 0;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      {/* Header */}
      <View className="pb-4">
        <Header
          title="Review Order"
          onBack={() => {
            if (!submitting) router.back();
          }}
        />
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
          {order.orderItems && order.orderItems.length > 0 && (
            <DiscountButtonModalAndSummary />
          )}
          <OrderLinesList orderItems={order.orderItems} />
        </KeyboardAwareScrollView>

        {/* Clear + Submit */}
        {order.orderItems && order.orderItems.length > 0 && (
          <View className="flex-row justify-between items-center px-4 mb-2">
            <TouchableOpacity
              onPress={clearOrder}
              disabled={submitting}
              className={`flex-1 mr-2 bg-orange-400 py-4 rounded-lg items-center ${
                submitting ? "opacity-50" : ""
              }`}
            >
              <Text className="text-white font-bold text-base">
                Clear Order
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmitPress}
              disabled={isSubmitDisabled}
              className={`flex-1 bg-gray-800 py-4 rounded-lg items-center ${
                isSubmitDisabled ? "opacity-50" : ""
              }`}
            >
              <Text className="text-white font-bold text-base">
                {submitting
                  ? "Submitting…"
                  : `Submit ${getTotalItems()} Item(s) - $${taxBreakDown?.total.toFixed(2) ?? "0.00"}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <FullScreenLoadingOverlay
        visible={submitting}
        title="Submitting order…"
      />

      <StaffPickerModal
        visible={showStaffModal}
        submitting={submitting}
        onConfirm={(staffName) => {
          setShowStaffModal(false);
          void handleSubmit(staffName);
        }}
        onCancel={() => setShowStaffModal(false)}
      />
    </SafeAreaViewWrapper>
  );
}
