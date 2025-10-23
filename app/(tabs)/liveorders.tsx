import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderStatus } from "@/types/enum";
import { formatDate } from "@/utils/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SafeAreaViewWrapper from "../../components/SafeAreaViewWrapper";

export default function LiveOrders() {
  const { takeOutOrders, loading } = useLiveOrdersStore();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    orderIdParam || null
  );
  const router = useRouter();
  const {
    setOrder,
    setEditingOrder,
    cancelOrder,
    completeOrder,
    submitToPrintQueue,
  } = useOrderStore();

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const handleComplete = async (order: Order) => {
    try {
      await completeOrder(order);
    } catch (error) {
      console.error("❌ Error completing order:", error);
    }
  };

  const handleCancel = async (order: Order) => {
    try {
      await cancelOrder(order);
    } catch (error) {
      console.error("❌ Error canceling order:", error);
    }
  };

  const handlePrint = async (order: Order) => {
    try {
      await submitToPrintQueue(order);
    } catch (error) {
      console.error("❌ Error submitting to print queue:", error);
    }
  };

  function handleEditOrder(order: Order) {
    setEditingOrder(true);
    setOrder(order);
    router.push("/liveorders/editorder");
  }

  const renderOrder = ({ item }: { item: Order }) => {
    const subtotal = item.total;
    const pst = subtotal * 0.06;
    const gst = subtotal * 0.05;
    const total = subtotal + pst + gst;
    const expanded = expandedOrderId === item.id;

    return (
      <View className="bg-gray-100 p-4 mb-3 rounded-xl shadow-sm">
        <TouchableOpacity
          className="flex-row justify-between items-center"
          onPress={() => toggleExpand(item.id!)}
        >
          <View>
            <Text className="font-semibold text-gray-800 text-base">
              Name: {item.name || ""}
            </Text>
            <Text className="font-semibold text-gray-800 text-base">
              Phone #: {item.phoneNumber || ""}
            </Text>
            <Text className="font-semibold text-gray-800 text-base">
              Time: {formatDate(item.createdAt)}
            </Text>
          </View>

          <View
            className={`px-3 py-1 rounded-full ${
              item.printed ? "bg-green-100" : "bg-yellow-100"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                item.printed ? "text-green-700" : "text-yellow-700"
              }`}
            >
              {item.printed ? "Printed" : "Not Printed"}
            </Text>
          </View>

          <View
            className={`px-3 py-1 rounded-full ${
              item.status === OrderStatus.InProgress
                ? "bg-blue-100"
                : item.status === OrderStatus.Completed
                  ? "bg-green-100"
                  : "bg-red-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                item.status === OrderStatus.InProgress
                  ? "text-blue-700"
                  : item.status === OrderStatus.Completed
                    ? "text-green-700"
                    : "text-red-700"
              }`}
            >
              {item.status}
            </Text>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View className="mt-3 border-t border-gray-200 pt-2">
            {item.orderItems.map((orderItem, index) => (
              <View
                key={`${orderItem.id} ${index}`}
                className="flex-row justify-between items-center mb-3 bg-gray-200 p-2 rounded-lg"
              >
                <View className="flex-row justify-between items-start p-1 rounded-lg">
                  <View className="flex-1">
                    <Text className="text-xl font-semibold">
                      {orderItem.quantity} x {orderItem.name} - $
                      {(orderItem.price * orderItem.quantity).toFixed(2)}
                    </Text>

                    {/* Options */}
                    {orderItem.options && orderItem.options.length > 0 && (
                      <View className="mt-1 space-y-1">
                        {orderItem.options.map((option) => (
                          <Text
                            key={option.id}
                            className="text-base text-gray-600"
                          >
                            • {option.name}
                            {option.price > 0 &&
                              ` - $${option.price.toFixed(2)}`}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Add Extras */}
                    {orderItem.extras && orderItem.extras.length > 0 && (
                      <View>
                        {orderItem.extras.map((extra, index) => (
                          <Text key={index} className="text-base text-gray-600">
                            • Add: {extra.description}- $
                            {extra.price.toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Item Changes */}
                    {orderItem.changes && orderItem.changes.length > 0 && (
                      <View>
                        {orderItem.changes.map((change, index) => (
                          <Text key={index} className="text-base text-gray-600">
                            • Change: {change.from} → {change.to} - $
                            {change.price.toFixed(2)}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Special Instructions */}
                    {orderItem.instructions && (
                      <Text className="text-base text-gray-500 mt-2 italic">
                        {`"${orderItem.instructions}"`}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {/* Tax breakdown */}
            <View className="mt-2 p-2 border-t border-gray-200">
              <View className="flex-row justify-between mb-1">
                <Text className="text-base text-gray-700">Subtotal</Text>
                <Text className="text-base text-gray-700">
                  ${subtotal.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-1">
                <Text className="text-base text-gray-700">PST (6%)</Text>
                <Text className="text-base text-gray-700">
                  ${pst.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-1">
                <Text className="text-base text-gray-700">GST (5%)</Text>
                <Text className="text-base text-gray-700">
                  ${gst.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mt-1 pt-1 border-t border-gray-200">
                <Text className="text-base font-semibold text-gray-800">
                  Total
                </Text>
                <Text className="text-base font-bold text-gray-900">
                  ${total.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Buttons */}

            <View className="flex-row justify-between mt-3">
              <TouchableOpacity
                className="bg-blue-500 px-5 py-3 rounded-full"
                onPress={() => handlePrint(item)}
              >
                <Text className="text-white font-semibold">Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-orange-500 px-5 py-3 rounded-full"
                onPress={() => handleEditOrder(item)}
              >
                <Text className="text-white font-semibold">Edit</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="bg-green-500 px-5 py-3 rounded-full"
                onPress={() => handleComplete(item)}
              >
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-red-500 px-5 py-3 rounded-full"
                onPress={() => handleCancel(item)}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaViewWrapper className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading live orders...</Text>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 p-4">
      {takeOutOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="always"
          data={takeOutOrders}
          keyExtractor={(item) => item.id!}
          renderItem={renderOrder}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
