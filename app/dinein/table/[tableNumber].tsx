import TableInfoCard from "@/components/dinein/TableInfoCard";
import Header from "@/components/ui/Header";
import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TablePage() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();

  const { getTable, updateTable } = useTableStore();
  const table = getTable(tableNumber!);

  const { dineInOrders, loading: ordersLoading } = useLiveOrdersStore();
  const {
    order,
    setOrder,
    clearOrder,
    setEditingOrder,
    cancelOrder,
    completeOrder,
    isActive,
  } = useOrderStore();

  // ✅ Find the current order using table.currentOrderId
  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return dineInOrders.find(
      (o) => o.id === table.currentOrderId && o.status !== "completed"
    );
  }, [dineInOrders, table]);

  // ✅ Sync order store with live data
  useEffect(() => {
    if (currentOrder) setOrder(currentOrder);
    else clearOrder();
  }, [currentOrder, setOrder, clearOrder]);

  // ✅ Loading or table not found
  if (!table || ordersLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  const handleCancelOrder = async () => {
    if (!order.id) return;

    try {
      await cancelOrder(order);
      await updateTable(tableNumber!, {
        status: TableStatus.Open,
        currentOrderId: null,
        guests: 0,
      });
      clearOrder();
    } catch (error: any) {
      console.log("Failed to cancel order:", error);
    }
  };

  const handleCompleteOrder = async (order: Partial<Order>) => {
    if (!order) return;
    try {
      await updateTable(tableNumber!, {
        status: TableStatus.Open,
        currentOrderId: null,
        guests: 0,
      });
      clearOrder();
      await completeOrder(order);
    } catch (err) {
      console.error("Failed to complete order:", err);
    }
  };

  // Determine if there is a "real" active order
  const hasActiveOrder = Boolean(isActive && order.id);

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <Header
        title={`Table ${tableNumber}`}
        onBack={() => {
          clearOrder();
          router.replace("/dinein");
        }}
      />

      <View className="flex-1 justify-between">
        <TableInfoCard tableNumber={tableNumber} />

        {/* Order Items */}
        {!hasActiveOrder ||
        !order.orderItems ||
        order.orderItems.length === 0 ? (
          <Text className="text-gray-500 text-center mt-10">
            No active order for this table.
          </Text>
        ) : (
          <FlatList
            data={order.orderItems}
            keyExtractor={(item, index) => item.id ?? index.toString()}
            renderItem={({ item }) => (
              <View
                key={item.id}
                className="flex-row justify-between items-center mb-1 p-4"
              >
                <View className="flex-1">
                  <Text className="text-lg font-semibold">
                    {item.quantity} x {item.name} - $
                    {(item.price * item.quantity).toFixed(2)}
                  </Text>

                  {/* Options */}
                  {item.options && item.options.length > 0 && (
                    <View className="mt-1 space-y-1">
                      {item.options.map((option) => (
                        <Text
                          key={option.id}
                          className="text-base text-gray-600"
                        >
                          • {option.name}
                          {option.price > 0 && ` - $${option.price.toFixed(2)}`}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Special Instructions */}
                  {item.instructions && (
                    <Text className="text-base text-gray-500 mt-2 italic">
                      {`"${item.instructions}"`}
                    </Text>
                  )}
                </View>
              </View>
            )}
            className="mt-4"
          />
        )}

        {/* Footer Actions */}
        <View className="m-4">
          {/* Row 1: Reset + Print */}
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity
              onPress={handleCancelOrder}
              activeOpacity={0.7}
              className={`${
                hasActiveOrder ? "bg-red-500" : "bg-red-300"
              } px-5 py-3 rounded-lg items-center justify-center`}
              style={{ flex: 1, marginRight: 8 }}
              disabled={!hasActiveOrder}
            >
              <Text className="text-white text-base font-semibold">
                Cancel Order
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!order?.id) return;
                console.log("🖨 Printing order:", order.id);
              }}
              activeOpacity={0.7}
              disabled={!hasActiveOrder}
              className={`px-5 py-3 rounded-lg items-center justify-center ${
                hasActiveOrder ? "bg-blue-500" : "bg-blue-300"
              }`}
              style={{ flex: 1, marginLeft: 8 }}
            >
              <Text className="text-white text-base font-semibold">
                Print Order
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Take/Edit + Complete */}
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={() => {
                if (hasActiveOrder) {
                  router.push({
                    pathname: "/dinein/editdineinorder/[tableNumber]",
                    params: { tableNumber },
                  });
                  setEditingOrder(true);
                } else {
                  router.push({
                    pathname: "/dinein/takeorder/[tableNumber]",
                    params: { tableNumber },
                  });
                }
              }}
              activeOpacity={0.7}
              className="bg-orange-500 px-5 py-3 rounded-lg items-center justify-center"
              style={{ flex: 1, marginRight: 8 }}
            >
              <Text className="text-white text-base font-semibold">
                {hasActiveOrder ? "Edit Order" : "Take Order"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                handleCompleteOrder(order);
              }}
              activeOpacity={0.7}
              disabled={!hasActiveOrder}
              className={`px-5 py-3 rounded-lg items-center justify-center ${
                hasActiveOrder ? "bg-green-500" : "bg-gray-400"
              }`}
              style={{ flex: 1, marginLeft: 8 }}
            >
              <Text className="text-white text-base font-semibold">
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
