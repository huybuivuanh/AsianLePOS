import { useOrderHistoryStore } from "@/stores/useOrderHistoryStore";
import { OrderStatus } from "@/types/enum";
import { formatDate } from "@/utils/utils";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrderHistory() {
  const { orderHistory, loading } = useOrderHistoryStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const expanded = expandedOrderId === item.id;

    return (
      <View className="bg-white p-4 mb-3 rounded-xl shadow-sm">
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
              item.status === OrderStatus.Pending
                ? "bg-yellow-100"
                : item.status === OrderStatus.InProgress
                  ? "bg-blue-100"
                  : item.status === OrderStatus.Completed
                    ? "bg-green-100"
                    : "bg-red-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                item.status === OrderStatus.Pending
                  ? "text-yellow-700"
                  : item.status === OrderStatus.InProgress
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
                className="flex-row justify-between items-center mb-1"
              >
                <View className="flex-row justify-between items-start p-1 rounded-lg">
                  <View className="flex-1">
                    <Text className="text-m font-semibold">
                      {orderItem.quantity} x {orderItem.item.name} - $
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

            <Text className="text-right font-semibold text-base mt-2">
              Total: ${item.total.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading live orders...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100 p-4">
      {orderHistory.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orderHistory}
          keyExtractor={(item) => item.id!}
          renderItem={renderOrder}
        />
      )}
    </SafeAreaView>
  );
}
