import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import { useOrderHistoryStore } from "@/stores/useOrderHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderStatus, OrderType } from "@/types/enum";
import { calculateTaxBreakdown, formatDate } from "@/utils/utils";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OrderHistory() {
  const { orderHistory, loading } = useOrderHistoryStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { submitToPrintQueue } = useOrderStore();

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const handlePrint = async (order: Order) => {
    try {
      await submitToPrintQueue(order);
    } catch (error) {
      console.error("❌ Error submitting to print queue:", error);
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
    // Use taxBreakDown from order, or calculate it if missing
    const taxBreakDown = item.taxBreakDown || (item.total !== undefined
      ? calculateTaxBreakdown(item.total)
      : undefined);
    const expanded = expandedOrderId === item.id;

    return (
      <View
        className={`${item.orderType === OrderType.TakeOut ? "bg-blue-100" : "bg-yellow-100"} p-4 mb-3 rounded-xl shadow-sm`}
      >
        <View></View>
        <TouchableOpacity
          className="flex-row justify-between items-center"
          onPress={() => toggleExpand(item.id!)}
        >
          {item.orderType === OrderType.TakeOut ? (
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
          ) : (
            <View>
              <Text className="font-semibold text-gray-800 text-base">
                Table Number: {item.tableNumber}
              </Text>
              <Text className="font-semibold text-gray-800 text-base">
                Guest: {item.guests}
              </Text>
              <Text className="font-semibold text-gray-800 text-base">
                Time: {formatDate(item.createdAt)}
              </Text>
            </View>
          )}

          <View className="items-end space-y-1">
            <View
              className={`px-3 py-1 rounded-full ${
                item.paid ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  item.paid ? "text-green-700" : "text-gray-700"
                }`}
              >
                {item.paid ? "Paid" : "Unpaid"}
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
          </View>
          <TouchableOpacity
            className="bg-blue-500 px-5 py-3 rounded-full"
            onPress={() => handlePrint(item)}
          >
            <Text className="text-white font-semibold">Print</Text>
          </TouchableOpacity>
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
                      {orderItem.quantity} x {orderItem.name} - $
                      {(orderItem.price * orderItem.quantity).toFixed(2)}
                    </Text>

                    {/* Options */}
                    {orderItem.options && orderItem.options.length > 0 && (
                      <View className="mt-1 space-y-1">
                        {orderItem.options.map((option, index) => (
                          <Text
                            key={index}
                            className="text-base text-gray-600"
                          >
                            • {option.quantity > 1 ? `${option.quantity}x ` : ""}
                            {option.name}
                            {option.price > 0 &&
                              ` - $${(option.price * option.quantity).toFixed(2)}`}
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
            {taxBreakDown && (
              <View className="mt-2 p-2 border-t border-gray-200">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-base text-gray-700">Subtotal</Text>
                  <Text className="text-base text-gray-700">
                    ${item.total.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-1">
                  <Text className="text-base text-gray-700">PST (6%)</Text>
                  <Text className="text-base text-gray-700">
                    ${taxBreakDown.pst.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-1">
                  <Text className="text-base text-gray-700">GST (5%)</Text>
                  <Text className="text-base text-gray-700">
                    ${taxBreakDown.gst.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row justify-between mt-1 pt-1 border-t border-gray-200">
                  <Text className="text-base font-semibold text-gray-800">
                    Total
                  </Text>
                  <Text className="text-base font-bold text-gray-900">
                    ${taxBreakDown.grandTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
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
    <SafeAreaViewWrapper className="p-4">
      {orderHistory.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="always"
          data={orderHistory}
          keyExtractor={(item) => item.id!}
          renderItem={renderOrder}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
