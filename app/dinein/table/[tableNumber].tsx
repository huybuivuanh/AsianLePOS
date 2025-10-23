import TableInfoCard from "@/components/dinein/TableInfoCard";
import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderType, TableStatus } from "@/types/enum";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TablePage() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const updateTable = useTableStore((state) => state.updateTable);
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber)
  );
  const [order, setOrder] = useState<Partial<Order> | null>(null);

  const { dineInOrders, loading: ordersLoading } = useLiveOrdersStore();
  const {
    setEditingOrder,
    cancelOrder,
    completeOrder,
    updateOrder,
    submitToPrintQueue,
  } = useOrderStore();

  const orderTotal = useOrderStore((state) => state.getOrderTotal());

  // ✅ Find the current order using table.currentOrderId
  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return dineInOrders.find(
      (o) => o.id === table.currentOrderId && o.status !== "completed"
    );
  }, [dineInOrders, table]);

  const pst = orderTotal * 0.06;
  const gst = orderTotal * 0.05;
  const grandTotal = orderTotal + pst + gst;

  // ✅ Sync order store with live data
  useEffect(() => {
    if (currentOrder) setOrder(currentOrder);
    else setOrder(null);
  }, [currentOrder, table]);

  // ✅ Loading or table not found
  if (!table || ordersLoading) {
    return (
      <SafeAreaViewWrapper className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaViewWrapper>
    );
  }

  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      await cancelOrder(order);
      await updateTable(tableNumber!, {
        status: TableStatus.Open,
        currentOrderId: null,
        guests: 0,
      });
      setOrder(null);
    } catch (error: any) {
      console.log("Failed to cancel order:", error);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    try {
      await updateTable(tableNumber!, {
        status: TableStatus.Open,
        currentOrderId: null,
        guests: 0,
      });
      setOrder(null);
      await completeOrder(order);
    } catch (err) {
      console.error("Failed to complete order:", err);
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    try {
      await submitToPrintQueue(order);
    } catch (error) {
      console.error("❌ Error submitting to print queue:", error);
    }
  };

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title={`Table ${tableNumber}`}
        onBack={() => {
          router.replace("/dinein");
        }}
      />

      <View className="flex-1 justify-between">
        <TableInfoCard tableNumber={tableNumber} />

        {/* Order Items */}
        {!order || !order.orderItems || order.orderItems.length === 0 ? (
          <Text className="text-gray-500 text-center mt-10">
            No active order for this table.
          </Text>
        ) : (
          <FlatList
            keyboardShouldPersistTaps="always"
            data={order.orderItems}
            keyExtractor={(item, index) => item.id ?? index.toString()}
            renderItem={({ item }) => (
              <View className="flex-1 bg-white m-2 p-4 rounded-lg">
                {/* Main item info */}
                <Text className="text-lg font-semibold">
                  {item.quantity} x {item.name} - $
                  {(item.price * item.quantity).toFixed(2)}
                  {item.togo && " - (To Go)"}
                  {item.appetizer && " - (Appetizer)"}
                </Text>

                {/* Options */}
                {item.options && item.options.length > 0 && (
                  <View className="mt-2 space-y-1">
                    {item.options.map((option) => (
                      <Text key={option.id} className="text-base text-gray-600">
                        • {option.name}
                        {option.price > 0 && ` - $${option.price.toFixed(2)}`}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Add Extras */}
                {item.extras && item.extras.length > 0 && (
                  <View>
                    {item.extras.map((extra, index) => (
                      <Text key={index} className="text-base text-gray-600">
                        • Add: {extra.description}- ${extra.price.toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Item Changes */}
                {item.changes && item.changes.length > 0 && (
                  <View>
                    {item.changes.map((change, index) => (
                      <Text key={index} className="text-base text-gray-600">
                        • Change: {change.from} → {change.to} - $
                        {change.price.toFixed(2)}
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
            )}
            className="mt-4"
          />
        )}

        {/* Footer Actions */}
        <View className="m-4">
          {order && (
            <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
              <View className="flex-row justify-between mb-1">
                <Text className="text-base text-gray-700">Subtotal</Text>
                <Text className="text-base text-gray-700">
                  ${orderTotal.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-1">
                <Text className="text-base text-gray-700">PST (6%)</Text>
                <Text className="text-base text-gray-700">
                  ${pst.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-base text-gray-700">GST (5%)</Text>
                <Text className="text-base text-gray-700">
                  ${gst.toFixed(2)}
                </Text>
              </View>

              <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-gray-800">
                  Total
                </Text>
                <Text className="text-xl font-bold text-gray-900">
                  ${grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Row 1: Reset + Print */}
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity
              onPress={handleCancelOrder}
              activeOpacity={0.7}
              className={`${
                order ? "bg-red-500" : "bg-red-300"
              } px-5 py-3 rounded-lg items-center justify-center`}
              style={{ flex: 1, marginRight: 8 }}
              disabled={!order}
            >
              <Text className="text-white text-base font-semibold">
                Cancel Order
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePrint}
              activeOpacity={0.7}
              disabled={!order}
              className={`px-5 py-3 rounded-lg items-center justify-center ${
                order ? "bg-blue-500" : "bg-blue-300"
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
                updateOrder({ orderType: OrderType.DineIn });
                if (order) {
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
                {order ? "Edit Order" : "Take Order"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCompleteOrder}
              activeOpacity={0.7}
              disabled={!order}
              className={`px-5 py-3 rounded-lg items-center justify-center ${
                order ? "bg-green-500" : "bg-green-200"
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
    </SafeAreaViewWrapper>
  );
}
