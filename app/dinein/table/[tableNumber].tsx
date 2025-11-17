import TableInfoCard from "@/components/dinein/TableInfoCard";
import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderType, TableStatus } from "@/types/enum";
import { calculateTaxBreakdown } from "@/utils/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set()
  );

  const { dineInOrders, loading: ordersLoading } = useLiveOrdersStore();
  const {
    setEditingOrder,
    cancelOrder,
    completeOrder,
    markOrderAsPaid,
    updateOrder,
    submitToPrintQueue,
    submitSelectedItemsToPrintQueue,
  } = useOrderStore();

  // ✅ Find the current order using table.currentOrderId
  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return dineInOrders.find((o) => o.id === table.currentOrderId);
  }, [dineInOrders, table]);

  // Use taxBreakDown from order, or calculate it if missing
  const taxBreakDown =
    order?.taxBreakDown ||
    (order?.total !== undefined
      ? calculateTaxBreakdown(order.total)
      : undefined);

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
      router.replace("/dinein");
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

  const handleMarkAsPaid = async (paid: boolean) => {
    if (!order) return;
    try {
      await markOrderAsPaid(order, paid);
    } catch (error) {
      console.error("❌ Error marking order as paid:", error);
    }
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedItemIds(new Set());
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handlePrintSelected = async () => {
    if (!order) return;
    try {
      await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
      setSelectionMode(false);
      setSelectedItemIds(new Set());
    } catch (error) {
      console.error("❌ Error printing selected items:", error);
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
            renderItem={({ item }) => {
              const isSelected = item.id ? selectedItemIds.has(item.id) : false;

              return (
                <View
                  className={`flex-1 m-2 p-4 rounded-lg ${
                    selectionMode
                      ? isSelected
                        ? "bg-blue-100 border-2 border-blue-500"
                        : "bg-white border-2 border-transparent"
                      : "bg-white"
                  }`}
                >
                  {selectionMode && (
                    <TouchableOpacity
                      onPress={() =>
                        item.id && handleToggleItemSelection(item.id)
                      }
                      className="absolute top-2 right-2 z-10"
                    >
                      <View
                        className={`w-6 h-6 rounded border-2 items-center justify-center ${
                          isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "bg-white border-gray-400"
                        }`}
                      >
                        {isSelected && (
                          <Text className="text-white text-xs font-bold">
                            ✓
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
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
                      {item.options.map((option, index) => (
                        <Text key={index} className="text-base text-gray-600">
                          • {option.quantity > 1 ? `${option.quantity}x ` : ""}
                          {option.name}
                          {option.price > 0 &&
                            ` - $${(option.price * option.quantity).toFixed(2)}`}
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
              );
            }}
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
                  ${(order?.total ?? 0).toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-1">
                <Text className="text-base text-gray-700">PST (6%)</Text>
                <Text className="text-base text-gray-700">
                  ${(taxBreakDown?.pst ?? 0).toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-base text-gray-700">GST (5%)</Text>
                <Text className="text-base text-gray-700">
                  ${(taxBreakDown?.gst ?? 0).toFixed(2)}
                </Text>
              </View>

              <View className="border-t border-gray-200 mt-2 pt-2 flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-gray-800">
                  Total
                </Text>
                {/* Paid Status Badge */}

                <View
                  className={`px-4 py-2 rounded-full ${
                    order.paid ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      order.paid ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {order.paid ? "✓ Paid" : "Unpaid"}
                  </Text>
                </View>
                <Text className="text-xl font-bold text-gray-900">
                  ${(taxBreakDown?.grandTotal ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Normal Mode Buttons */}
          {!selectionMode && (
            <>
              {/* Row 1: Take/Edit | Print All | Select Items */}
              <View className="flex-row justify-between mb-3">
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
                  className="bg-orange-500 px-3 py-3 rounded-lg items-center justify-center"
                  style={{ flex: 1, marginRight: 4 }}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    {order ? "Edit Order" : "Take Order"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePrint}
                  activeOpacity={0.7}
                  disabled={!order}
                  className={`px-3 py-3 rounded-lg items-center justify-center ${
                    order ? "bg-blue-500" : "bg-blue-300"
                  }`}
                  style={{ flex: 1, marginHorizontal: 4 }}
                >
                  <View className="flex-row items-center justify-center">
                    <Text className="text-white text-sm font-semibold">
                      Print
                    </Text>
                    {order?.printed && (
                      <Check
                        size={14}
                        color="orange"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleSelectionMode}
                  activeOpacity={0.7}
                  disabled={!order}
                  className={`px-3 py-3 rounded-lg items-center justify-center ${
                    order ? "bg-purple-500" : "bg-purple-300"
                  }`}
                  style={{ flex: 1, marginLeft: 4 }}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    Select Items
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: Complete | Paid | Cancel */}
              <View className="flex-row justify-between mb-4">
                <TouchableOpacity
                  onPress={handleCompleteOrder}
                  activeOpacity={0.7}
                  disabled={!order}
                  className={`px-3 py-3 rounded-lg items-center justify-center ${
                    order ? "bg-green-500" : "bg-green-200"
                  }`}
                  style={{ flex: 1, marginRight: 4 }}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    Complete
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleMarkAsPaid(!order?.paid)}
                  activeOpacity={0.7}
                  disabled={!order}
                  className={`px-3 py-3 rounded-lg items-center justify-center ${
                    order?.paid
                      ? "bg-gray-500"
                      : order
                        ? "bg-purple-500"
                        : "bg-gray-300"
                  }`}
                  style={{ flex: 1, marginHorizontal: 4 }}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    {order?.paid ? "Unpaid" : "Paid"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCancelOrder}
                  activeOpacity={0.7}
                  className={`${
                    order ? "bg-red-500" : "bg-red-300"
                  } px-3 py-3 rounded-lg items-center justify-center`}
                  style={{ flex: 1, marginLeft: 4 }}
                  disabled={!order}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Selection Mode Buttons */}
          {selectionMode && (
            <View className="mb-4">
              <View className="flex-row justify-between mb-3">
                <TouchableOpacity
                  className="bg-green-500 px-4 py-3 rounded-lg items-center justify-center flex-1 mr-2"
                  onPress={handlePrintSelected}
                  disabled={selectedItemIds.size === 0}
                  style={{
                    opacity: selectedItemIds.size === 0 ? 0.5 : 1,
                  }}
                >
                  <Text className="text-white text-base font-semibold text-center">
                    Print Selected ({selectedItemIds.size})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-gray-500 px-4 py-3 rounded-lg items-center justify-center flex-1 ml-2"
                  onPress={handleToggleSelectionMode}
                >
                  <Text className="text-white text-base font-semibold text-center">
                    Cancel Selection
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaViewWrapper>
  );
}
