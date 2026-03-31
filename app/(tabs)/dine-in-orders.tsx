import SafeAreaViewWrapper from "@/components/layout/SafeAreaViewWrapper";
import { useDineInOrdersStore } from "@/stores/useDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderStatus } from "@/types/enums";
import {
  calculateTaxBreakdown,
  convertOrderTimestamps,
  formatDate,
  orderSubtotal,
  resolveTaxBreakdown,
} from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
    orderIdParam || null
  );
  const [selectionMode, setSelectionMode] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();
  const {
    setOrder,
    cancelOrder,
    completeOrder,
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

  const handleComplete = async (order: DineInOrder) => {
    try {
      await completeOrder(order);
    } catch (error) {
      console.error("❌ Error completing order:", error);
    }
  };

  const handleCancel = async (order: DineInOrder) => {
    try {
      await cancelOrder(order);
    } catch (error) {
      console.error("❌ Error canceling order:", error);
    }
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

  function handleEditOrder(order: DineInOrder) {
    const convertedOrder = convertOrderTimestamps(order);
    setOrder(convertedOrder);
    router.push({
      pathname: "/dinein/edit-order/[tableNumber]",
      params: { tableNumber: order.tableNumber! },
    });
  }

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
              (orderItem) => orderItem.id && selectedItemIds.has(orderItem.id)
            )
            .reduce(
              (sum, orderItem) => sum + orderItem.price * orderItem.quantity,
              0
            );

    const selectedItemsTaxBreakDown =
      selectedItemsTotal === 0
        ? { subTotal: 0, pst: 0, gst: 0, total: 0 }
        : calculateTaxBreakdown(selectedItemsTotal);

    return (
      <View className="bg-amber-100 p-4 mb-3 rounded-xl shadow-sm border border-amber-200">
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
                  {item.status === OrderStatus.InProgress
                    ? "In Progress"
                    : item.status === OrderStatus.Completed
                      ? "Completed"
                      : "Canceled"}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View className="mt-3 border-t border-gray-200 pt-2">
            {item.orderItems.map((orderItem, index) => {
              const isSelected = orderItem.id
                ? selectedItemIds.has(orderItem.id)
                : false;
              const isSelectionMode = selectionMode === item.id;

              return (
                <View
                  key={`${orderItem.id} ${index}`}
                  className={`flex-row justify-between items-center mb-3 p-2 rounded-lg ${
                    isSelectionMode
                      ? isSelected
                        ? "bg-blue-100 border-2 border-blue-500"
                        : "bg-gray-200 border-2 border-transparent"
                      : "bg-gray-200"
                  }`}
                >
                  {isSelectionMode && (
                    <TouchableOpacity
                      onPress={() =>
                        orderItem.id && handleToggleItemSelection(orderItem.id)
                      }
                      className="mr-3"
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
                  <View className="flex-row justify-between items-start p-1 rounded-lg flex-1">
                    <View className="flex-1">
                      <Text className="text-xl font-semibold">
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
                              •{" "}
                              {option.quantity > 1
                                ? `${option.quantity}x `
                                : ""}
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
                            <Text
                              key={index}
                              className="text-base text-gray-600"
                            >
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
                            <Text
                              key={index}
                              className="text-base text-gray-600"
                            >
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
              );
            })}

            {/* Tax breakdown */}
            {taxBreakDown && (
              <View className="mt-2 p-2 border-t border-gray-200">
                {isSelectionMode ? (
                  // Selection Mode: Show selected items total
                  <>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-base text-gray-700">
                        Selected Items Subtotal
                      </Text>
                      <Text className="text-base text-gray-700">
                        ${selectedItemsTotal.toFixed(2)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-1">
                      <Text className="text-base text-gray-700">PST (6%)</Text>
                      <Text className="text-base text-gray-700">
                        ${selectedItemsTaxBreakDown.pst.toFixed(2)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-1">
                      <Text className="text-base text-gray-700">GST (5%)</Text>
                      <Text className="text-base text-gray-700">
                        ${selectedItemsTaxBreakDown.gst.toFixed(2)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mt-1 pt-1 border-t border-gray-200">
                      <Text className="text-base font-semibold text-gray-800">
                        Selected Total
                      </Text>
                      <Text className="text-base font-bold text-gray-900">
                        ${selectedItemsTaxBreakDown.total.toFixed(2)}
                      </Text>
                    </View>
                  </>
                ) : (
                  // Normal Mode: Show full order total
                  <>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-base text-gray-700">Subtotal</Text>
                      <Text className="text-base text-gray-700">
                        ${orderSubtotal(item).toFixed(2)}
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
                        ${taxBreakDown.total.toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
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
                {/* Row 1: Print All | Select Items | Edit */}
                <View className="flex-row justify-between mt-3">
                  <TouchableOpacity
                    className="bg-orange-500 px-3 py-3 rounded-full flex-1 mr-2"
                    onPress={() => handleEditOrder(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Edit
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

                {/* Row 2: Done | Mark Paid | Cancel */}
                <View className="flex-row justify-between mt-3">
                  <TouchableOpacity
                    className="bg-red-500 px-3 py-3 rounded-full flex-1 mr-2"
                    onPress={() => handleCancel(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Cancel
                    </Text>
                  </TouchableOpacity>
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
                    className="bg-green-500 px-3 py-3 rounded-full flex-1 ml-2"
                    onPress={() => handleComplete(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Done
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
          keyboardShouldPersistTaps="always"
          data={dineInOrders}
          keyExtractor={(item) => item.id!}
          renderItem={renderOrder}
          removeClippedSubviews={true}
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
          getItemLayout={(data, index) => ({
            length: 200, // Approximate item height
            offset: 200 * index,
            index,
          })}
        />
      )}
    </SafeAreaViewWrapper>
  );
}
