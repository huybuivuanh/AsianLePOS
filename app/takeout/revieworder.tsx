import { useOrderStore } from "@/stores/useOrderStore";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReviewOrderScreen() {
  const router = useRouter();
  const {
    order,
    updateQuantity,
    removeItem,
    getTotalItems,
    getOrderTotal,
    submitOrder,
  } = useOrderStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (order.orderItems.length === 0) {
      Alert.alert("Empty Order", "Please add some items before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const id = await submitOrder({
        staff: order.staff,
        orderType: order.orderType,
      });
      Alert.alert("Success", `Order submitted successfully (ID: ${id})`);
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Custom header */}
      <Stack.Screen
        options={{
          title: "Review Order",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {order.orderItems.length === 0 ? (
          <Text className="text-gray-500 text-center mt-10">
            Your order is empty.
          </Text>
        ) : (
          order.orderItems.map((orderItem) => (
            <View
              key={orderItem.id}
              className="flex-row justify-between items-center mb-4"
            >
              <View className="flex-1">
                <Text className="text-lg font-semibold">
                  {orderItem.item.name}
                </Text>

                {orderItem.instructions ? (
                  <Text className="text-sm text-gray-500">
                    {orderItem.instructions}
                  </Text>
                ) : null}

                <Text className="text-sm text-gray-700">
                  ${orderItem.price.toFixed(2)} × {orderItem.quantity} ={" "}
                  <Text className="font-semibold">
                    ${(orderItem.price * orderItem.quantity).toFixed(2)}
                  </Text>
                </Text>
              </View>

              <View className="flex-row items-center space-x-2">
                <TouchableOpacity
                  onPress={() =>
                    updateQuantity(orderItem.id!, orderItem.quantity - 1)
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  <Text>-</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    updateQuantity(orderItem.id!, orderItem.quantity + 1)
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  <Text>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removeItem(orderItem.id!)}
                  className="px-2 py-1 bg-red-500 rounded"
                >
                  <Text className="text-white">Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      {order.orderItems.length > 0 && (
        <View className="p-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className={`py-3 rounded-lg items-center ${
              submitting ? "bg-gray-500" : "bg-gray-800"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                Submit {getTotalItems()} Items - ${getOrderTotal().toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
