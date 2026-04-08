import { OrderLinesList } from "@/features/order";
import DiscountButtonModalAndSummary from "@/features/order/components/DiscountButtonModalAndSummary";
import { OrderFooter } from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useAuth } from "@/providers/AuthProvider";
import { useCustomersStore } from "@/stores/useCustomersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import { generateFirestoreId, showAlert } from "@/utils/helpers";
import { useRouter, type Href } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function ReviewOrder() {
  const router = useRouter();
  const { submitOrder, clearOrder } = useOrderStore();
  const order = useOrderStore((state) => state.order);

  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [footerVisible, setFooterVisible] = useState(true);

  const handleSubmit = async () => {
    if (!user) {
      showAlert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      const staffName =
        user.displayName?.trim() || user.email?.trim() || "Unknown";

      const orderId = generateFirestoreId();

      const newOrder = {
        ...order,
        id: orderId,
        staff: staffName,
      };

      setSubmitting(true);
      await useCustomersStore.getState().syncTakeOutCustomerFromCart();
      await submitOrder(newOrder);
      router.push({
        pathname: "/(tabs)/take-out-orders",
        params: { orderId },
      } as unknown as Href);
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting ||
    (order.orderItems?.length ?? 0) === 0 ||
    (!order.customerName?.trim() && !order.phoneNumber?.trim());

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

        {/* Clear + Toggle Footer */}
        {order.orderItems && order.orderItems.length > 0 && (
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => setFooterVisible(!footerVisible)}
              disabled={submitting}
              className={`bg-orange-300 py-4 px-4 rounded-md mx-4 mb-2 items-center flex-1 ml-2 ${
                submitting ? "opacity-50" : ""
              }`}
            >
              <Text className="text-gray-800 font-medium">
                {footerVisible ? "Hide Submit Section" : "Show Submit Section"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearOrder}
              disabled={submitting}
              className={`bg-orange-300 py-4 px-4 rounded-md mx-4 mb-2 items-center flex-1 mr-2 ${
                submitting ? "opacity-50" : ""
              }`}
            >
              <Text className="text-gray-800 font-medium">Clear Order</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer (customer info, time selectors, submit) */}
        {footerVisible && order.orderItems && order.orderItems.length > 0 && (
          <OrderFooter
            onSubmit={handleSubmit}
            submitting={submitting}
            disabled={isSubmitDisabled}
          />
        )}
      </KeyboardAvoidingView>

      <FullScreenLoadingOverlay
        visible={submitting}
        title="Submitting order…"
      />
    </SafeAreaViewWrapper>
  );
}
