import SafeAreaViewWrapper from "@/components/layout/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import { OrderLinesList } from "@/features/order";
import { OrderFooter } from "@/features/takeout";
import { useAuth } from "@/providers/AuthProvider";
import { useOrderStore } from "@/stores/useOrderStore";
import { showAlert } from "@/utils/helpers";
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

export default function EditOrder() {
  const router = useRouter();
  const { updateOrderOnFirestore, clearOrder } = useOrderStore();
  const order = useOrderStore((state) => state.order);

  const { user } = useAuth();

  // Local UI states
  const [submitting, setSubmitting] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  // Handle order submission
  const handleSubmit = async () => {
    if (!user) {
      showAlert("Error", "You must be logged in to submit an order.");
      return;
    }

    try {
      setSubmitting(true);
      // Create a clean order object with only defined values
      // Use conditional spreading for ALL optional fields to avoid undefined values
      await updateOrderOnFirestore({ ...order });
      clearOrder();
      router.back();
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    router.push("/take-out-orders/add-item" as Href);
  };

  const isSubmitDisabled =
    submitting ||
    (order.orderItems?.length ?? 0) === 0 ||
    (!order.customerName?.trim() && !order.phoneNumber?.trim());

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      {/* Custom Header */}
      <Header
        title="Edit Order"
        onBack={() => {
          clearOrder();
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
          <OrderLinesList orderItems={order.orderItems} />
        </KeyboardAwareScrollView>

        {/* Toggle Footer */}
        {order.orderItems && order.orderItems.length > 0 && (
          <TouchableOpacity
            onPress={() => setFooterVisible(!footerVisible)}
            className="bg-orange-300 py-4 px-4 rounded-lg mx-4 mb-2 items-center"
          >
            <Text className="text-gray-800 font-medium">
              {footerVisible ? "Hide Submit Section" : "Show Submit Section"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer (customer info, time selectors, submit) */}
        {footerVisible && (
          <OrderFooter
            onSubmit={handleSubmit}
            submitting={submitting}
            disabled={isSubmitDisabled}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaViewWrapper>
  );
}
