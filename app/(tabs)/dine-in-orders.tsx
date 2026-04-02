import OrderItemsList from "@/features/order/components/OrderItemsList";
import OrderTaxBreakdown from "@/features/order/components/OrderTaxBreakdown";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useDineInOrdersStore } from "@/stores/useDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderStatus } from "@/types/enums";
import {
  calculateTaxBreakdown,
  formatDate,
  orderSubtotal,
  resolveTaxBreakdown,
} from "@/utils/helpers";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DineInOrdersTab() {
  const {
    dineInOrders,
    loading,
    loadingMore,
    hasMore,
    loadDineInOrders,
    loadMoreOrders,
    refreshDineInOrders,
  } = useDineInOrdersStore();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    orderIdParam || null,
  );
  const [selectionMode, setSelectionMode] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );

  const {
    markOrderAsPaid,
    submitToPrintQueue,
    submitSelectedItemsToPrintQueue,
  } = useOrderStore();

  useEffect(() => {
    loadDineInOrders();
  }, [loadDineInOrders]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const handlePrint = async (order: DineInOrder) => {
    try {
      await submitToPrintQueue(order);
    } catch (error) {
      console.error("❌ Error submitting to print queue:", error);
    }
  };

  const handleToggleSelectionMode = (orderId: string) => {
    if (selectionMode === orderId) {
      setSelectionMode(null);
      setSelectedItemIds(new Set());
    } else {
      setSelectionMode(orderId);
      setSelectedItemIds(new Set());
    }
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

  const handlePrintSelected = async (order: DineInOrder) => {
    try {
      await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
      setSelectionMode(null);
      setSelectedItemIds(new Set());
    } catch (error) {
      console.error("❌ Error printing selected items:", error);
    }
  };

  const handleMarkAsPaid = async (order: DineInOrder, paid: boolean) => {
    try {
      await markOrderAsPaid(order, paid);
    } catch (error) {
      console.error("❌ Error marking order as paid:", error);
    }
  };
  const renderOrder = ({ item }: { item: DineInOrder }) => {
    // Use taxBreakDown from order, or calculate it if missing
    const taxBreakDown = resolveTaxBreakdown(item);
    const expanded = expandedOrderId === item.id;
    const isSelectionMode = selectionMode === item.id;

    // Calculate selected items total and tax breakdown when in selection mode
    const selectedItemsTotal =
      !isSelectionMode || !item.orderItems || selectedItemIds.size === 0
        ? 0
        : item.orderItems
            .filter(
              (orderItem) => orderItem.id && selectedItemIds.has(orderItem.id),
            )
            .reduce(
              (sum, orderItem) => sum + orderItem.price * orderItem.quantity,
              0,
            );

    const selectedItemsTaxBreakDown =
      selectedItemsTotal === 0
        ? { subTotal: 0, pst: 0, gst: 0, total: 0 }
        : calculateTaxBreakdown(selectedItemsTotal);

    return (
      <View
        className={`${item.status === OrderStatus.Completed ? "bg-green-100 border-green-200" : "bg-amber-100 border-amber-200"} p-4 mb-3 rounded-xl shadow-sm border `}
      >
        <TouchableOpacity
          className="flex-row justify-between items-center"
          onPress={() => toggleExpand(item.id!)}
        >
          <View>
            <Text className="font-semibold text-gray-800 text-base">
              Table: {item.tableNumber}
            </Text>
            <Text className="font-semibold text-gray-800 text-base">
              Guests: {item.guests ?? 0}
            </Text>
            <Text className="font-semibold text-gray-800 text-base">
              Staff: {item.staff ?? "—"}
            </Text>
            <Text className="font-semibold text-gray-800 text-base">
              Time: {formatDate(item.createdAt)}
            </Text>
          </View>

          <View>
            <View className="items-end space-y-2">
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
              {!(item.status === OrderStatus.Completed && !item.paid) &&
                item.status !== OrderStatus.Cancelled && (
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
                )}
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
                {item.status === OrderStatus.InProgress
                  ? "In Progress"
                  : item.status === OrderStatus.Completed
                    ? "Completed"
                    : "Cancelled"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View className="mt-3 border-t border-gray-200 pt-2">
            <OrderItemsList
              orderItems={item.orderItems}
              orderId={item.id!}
              selectionMode={selectionMode}
              selectedItemIds={selectedItemIds}
              onToggleItemSelection={handleToggleItemSelection}
            />

            {/* Tax breakdown */}
            {taxBreakDown && (
              <OrderTaxBreakdown
                taxBreakDown={taxBreakDown}
                isSelectionMode={isSelectionMode}
                selectedItemsTotal={selectedItemsTotal}
                selectedItemsTaxBreakDown={selectedItemsTaxBreakDown}
                orderSubtotal={orderSubtotal(item)}
              />
            )}

            {/* Buttons */}

            {selectionMode === item.id ? (
              <View className="mt-3">
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    className="bg-green-500 px-4 py-3 rounded-full flex-1 mr-2"
                    onPress={() => handlePrintSelected(item)}
                    disabled={selectedItemIds.size === 0}
                    style={{
                      opacity: selectedItemIds.size === 0 ? 0.5 : 1,
                    }}
                  >
                    <Text className="text-white font-semibold text-center">
                      Print Selected ({selectedItemIds.size})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-500 px-4 py-3 rounded-full flex-1 ml-2"
                    onPress={() => handleToggleSelectionMode(item.id!)}
                  >
                    <Text className="text-white font-semibold text-center">
                      Cancel Selection
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Row 1: Paid | Select Items | Print */}
                <View className="flex-row justify-between mt-3">
                  <TouchableOpacity
                    className={`px-3 py-3 rounded-full flex-1 mx-1 ${
                      item.paid ? "bg-gray-500" : "bg-pink-500"
                    }`}
                    onPress={() => handleMarkAsPaid(item, !item.paid)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      {item.paid ? "Unpaid" : "Paid"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-purple-500 px-3 py-3 rounded-full flex-1 mx-1"
                    onPress={() => handleToggleSelectionMode(item.id!)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Select Items
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-blue-500 px-3 py-3 rounded-full flex-1 ml-2"
                    onPress={() => handlePrint(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Print
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
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
        <Text className="mt-2 text-gray-600">Loading dine in orders...</Text>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 p-4">
      {dineInOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No dine in orders yet.</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, width: "100%", alignSelf: "stretch" }}
          contentContainerStyle={{
            flexGrow: 1,
            alignSelf: "stretch",
            width: "100%",
          }}
          keyboardShouldPersistTaps="always"
          data={dineInOrders}
          keyExtractor={(item) => item.id!}
          renderItem={renderOrder}
          removeClippedSubviews={Platform.OS !== "web"}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          refreshing={loading}
          onRefresh={refreshDineInOrders}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              loadMoreOrders();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaViewWrapper>
  );
}
