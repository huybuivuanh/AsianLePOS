import { OrderLinesList } from "@/features/order";
import DiscountButtonModalAndSummary from "@/features/order/components/DiscountButtonModalAndSummary";
import StaffPickerModal from "@/features/order/components/StaffPickerModal";
import { OrderFooter } from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useAuth } from "@/providers/AuthProvider";
import { useCustomersStore } from "@/stores/useCustomersStore";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useStaffStore } from "@/stores/useStaffStore";
import { OrderType } from "@/types/enums";
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
  const { clearOrder } = useCartStore();
  const order = useCartStore((state) => state.order);
  const { submitOrder } = useOrderStore();

  const { user } = useAuth();
  const sharedDeskMode = useStaffStore((s) => s.sharedDeskMode);
  const [submitting, setSubmitting] = useState(false);
  const [footerVisible, setFooterVisible] = useState(true);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const handleSubmit = async (overrideStaffName?: string) => {
    if (!user) {
      showAlert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      const staffName =
        overrideStaffName ||
        user.displayName?.trim() ||
        user.email?.trim() ||
        "Unknown";

      const orderId = generateFirestoreId();

      const newOrder = {
        ...order,
        orderType: OrderType.TakeOut,
        id: orderId,
        staff: staffName,
      };

      setSubmitting(true);
      await useCustomersStore.getState().syncTakeOutCustomerFromCart(order);
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

  const handleSubmitPress = () => {
    if (sharedDeskMode) {
      setShowStaffModal(true);
    } else {
      void handleSubmit();
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
            onSubmit={handleSubmitPress}
            submitting={submitting}
            disabled={isSubmitDisabled}
          />
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
