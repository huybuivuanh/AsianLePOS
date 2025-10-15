import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderStatus } from "@/types/enum";
import { formatDate } from "@/utils/utils";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LiveOrders() {
  const { takeOutOrders, loading } = useLiveOrdersStore();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const router = useRouter();
  const { setOrder } = useOrderStore();

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const handleComplete = (order: Order) => {
    // TODO: integrate with updateOrder Firestore call
    console.log("✅ Complete order:", order.id);
  };

  const handleCancel = (order: Order) => {
    // TODO: integrate with updateOrder Firestore call
    console.log("❌ Cancel order:", order.id);
  };

  const handlePrint = (order: Order, withNumber: boolean) => {
    // TODO: trigger your printer logic here
    console.log(
      withNumber ? "🖨 Print With Number" : "🖨 Print Without Number",
      order.id
    );
  };

  function handleEditOrder(order: Order) {
    setOrder(order);
    router.push("/liveorders/editorder");
  }

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
              item.status === OrderStatus.Pending
                ? "bg-yellow-100"
                : item.status === OrderStatus.InProgress
                  ? "bg-blue-100"
                  : item.status === OrderStatus.Completed
                    ? "bg-green-100"
                    : "bg-gray-200"
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
                      : "text-gray-700"
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
                <View className="flex-row justify-between items-start mb-4 p-4 rounded-lg">
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

            {/* Buttons */}

            <View className="flex-row justify-between mt-3">
              <TouchableOpacity
                className="bg-blue-500 px-5 py-3 rounded-full"
                onPress={() => handlePrint(item, true)}
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
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading live orders...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100 p-4">
      {takeOutOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={takeOutOrders}
          keyExtractor={(item) => item.id!}
          renderItem={renderOrder}
        />
      )}
    </SafeAreaView>
  );
}
