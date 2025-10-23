import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import OrderFooter from "@/components/takeout/reviewOrder/OrderFooter";
import OrderItemCard from "@/components/takeout/reviewOrder/OrderItemCard";
import Header from "@/components/ui/Header";
import { useAuth } from "@/providers/AuthProvider";
import { useOrderStore } from "@/stores/useOrderStore";
import { generateFirestoreId } from "@/utils/utils";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
  const [footerVisible, setFooterVisible] = useState(false);

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

      const orderId = generateFirestoreId();

      const newOrder = {
        ...order,
        id: orderId,
        staff: staff,
      };

      setSubmitting(true);
      await submitOrder(newOrder);
      router.push({
        pathname: "/liveorders",
        params: { orderId: orderId },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting ||
    (order.orderItems?.length ?? 0) === 0 ||
    (!order.name && !order.phoneNumber);

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
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={() => setFooterVisible(!footerVisible)}
              className="bg-orange-300 py-4 px-4 rounded-lg mx-4 mb-2 items-center flex-1 ml-2"
            >
              <Text className="text-gray-800 font-medium">
                {footerVisible ? "Hide Submit Section" : "Show Submit Section"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearOrder}
              className="bg-orange-300 py-4 px-4 rounded-lg mx-4 mb-2 items-center flex-1 mr-2"
            >
              <Text className="text-gray-800 font-medium">Clear Order</Text>
            </TouchableOpacity>
          </View>
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
