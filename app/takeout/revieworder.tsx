import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOrderStore } from "@/stores/useOrderStore";

// Components
import OrderFooter from "@/components/takeout/reviewOrder/OrderFooter";
import OrderItemCard from "@/components/takeout/reviewOrder/OrderItemCard";

export default function ReviewOrder() {
  const router = useRouter();
  const { order, updateQuantity, getTotalItems, getOrderTotal, submitOrder } =
    useOrderStore();

  // Local state
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [readyTime, setReadyTime] = useState(15);
  const [isPreorder, setIsPreorder] = useState(false);
  const [preorderDate, setPreorderDate] = useState(new Date());

  // Handle order submission
  const handleSubmit = async () => {
    if (order.orderItems.length === 0) {
      Alert.alert("Empty Order", "Please add some items before submitting.");
      return;
    }

    if (!customerName && !customerPhone) {
      Alert.alert("Missing Info", "Please enter a name or phone number.");
      return;
    }

    try {
      setSubmitting(true);

      const id = await submitOrder({
        staff: order.staff,
        orderType: order.orderType,
        name: customerName,
        phoneNumber: customerPhone,
        readyTime: isPreorder ? 0 : readyTime,
        // preOrder: isPreorder ? preorderDate : true,
      });

      Alert.alert("Success", `Order submitted successfully (ID: ${id})`);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting ||
    order.orderItems.length === 0 ||
    (!customerName && !customerPhone);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Stack.Screen
        options={{
          title: "Review Order",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"} // iOS padding, Android height
        keyboardVerticalOffset={90} // adjust if you have a header
      >
        {/* Scrollable content */}
        <KeyboardAwareScrollView
          className="flex-1 p-4"
          keyboardShouldPersistTaps="handled"
        >
          {order.orderItems.length === 0 ? (
            <Text className="text-gray-500 text-center mt-10">
              Your order is empty.
            </Text>
          ) : (
            order.orderItems.map((item, index) => (
              <OrderItemCard
                key={`${item.id}-${index}`}
                item={item}
                onChangeQuantity={updateQuantity}
              />
            ))
          )}
        </KeyboardAwareScrollView>

        {/* Footer (customer info, time selectors, submit) */}
        <OrderFooter
          onSubmit={handleSubmit}
          submitting={submitting}
          disabled={isSubmitDisabled}
          totalItems={getTotalItems()}
          totalPrice={getOrderTotal()}
          customerName={customerName}
          customerPhone={customerPhone}
          setCustomerName={setCustomerName}
          setCustomerPhone={setCustomerPhone}
          readyTime={readyTime}
          setReadyTime={setReadyTime}
          isPreorder={isPreorder}
          setIsPreorder={setIsPreorder}
          preorderDate={preorderDate}
          setPreorderDate={setPreorderDate}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
