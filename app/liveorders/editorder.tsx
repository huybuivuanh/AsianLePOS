import OrderFooter from "@/components/takeout/reviewOrder/OrderFooter";
import OrderItemCard from "@/components/takeout/reviewOrder/OrderItemCard";
import Header from "@/components/ui/Header";
import { useAuth } from "@/providers/AuthProvider";
import { useOrderStore } from "@/stores/useOrderStore";
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
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditOrder() {
  const router = useRouter();
  const {
    orderItems,
    submitOrder,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    readyTime,
    setReadyTime,
    isPreorder,
    setIsPreorder,
    preorderDate,
    setPreorderDate,
    orderType,
    setOrderType,
    table,
    setTable,
    getTotalItems,
    getOrderTotal,
    updateQuantity,
  } = useOrderStore();

  // Local state
  const [submitting, setSubmitting] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const { user } = useAuth();
  const { clearOrder } = useOrderStore();

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
      setSubmitting(true);
      await submitOrder(staff);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    router.push("/liveorders/additempage");
  };

  const isSubmitDisabled =
    submitting || orderItems.length === 0 || (!customerName && !customerPhone);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
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
        <View className="flex-row justify-center items-center p-4">
          <TouchableOpacity
            className="bg-orange-400 px-4 py-3 rounded-full w-80 mb-4 items-center "
            onPress={() => handleAddItem()}
          >
            <Text className="text-white font-semibold">Add Item</Text>
          </TouchableOpacity>
        </View>
        {/* Scrollable content */}
        <KeyboardAwareScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
        >
          {orderItems.length === 0 ? (
            <Text className="text-gray-500 text-center mt-10">
              Your order is empty.
            </Text>
          ) : (
            orderItems.map((item, index) => (
              <OrderItemCard
                key={`${item.id}-${index}`}
                item={item}
                onChangeQuantity={updateQuantity}
              />
            ))
          )}
        </KeyboardAwareScrollView>

        {orderItems.length > 0 && (
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
            orderType={orderType}
            setOrderType={setOrderType}
            table={table}
            setTable={setTable}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
