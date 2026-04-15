import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import OrderTaxBreakdown from "@/features/order/components/OrderTaxBreakdown";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import { DiscountType, OrderStatus } from "@/types/enums";
import {
  calculateTaxBreakdown,
  convertOrderTimestamps,
  EMPTY_TAX_BREAKDOWN,
  formatDate,
  formatPhone,
  orderSubtotal,
  resolveTaxBreakdown,
  takeoutFulfillmentIsScheduled,
  takeoutScheduledAt,
} from "@/utils/helpers";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function TakeOutOrdersTab() {
  const {
    takeOutOrders,
    loading,
    loadingMore,
    hasMore,
    loadTakeOutOrders,
    loadMoreOrders,
    refreshTakeOutOrders,
  } = useTakeOutOrdersStore();
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
  const [cashPaymentOrderId, setCashPaymentOrderId] = useState<string | null>(
    null,
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
    loadTakeOutOrders();
  }, [loadTakeOutOrders]);

  useEffect(() => {
    if (!orderIdParam) return;
    setExpandedOrderId(orderIdParam);
    void refreshTakeOutOrders();
  }, [orderIdParam, refreshTakeOutOrders]);

  const cashPaymentModalTotal = useMemo(() => {
    if (!cashPaymentOrderId) return 0;
    const o = takeOutOrders.find((x) => x.id === cashPaymentOrderId);
    if (!o) return 0;
    return resolveTaxBreakdown(o)?.total ?? 0;
  }, [cashPaymentOrderId, takeOutOrders]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  }, []);

  const handleComplete = useCallback(async (order: TakeOutOrder) => {
    try {
      await completeOrder(order);
    } catch (error) {
      console.error("❌ Error completing order:", error);
    }
  }, [completeOrder]);

  const handleCancel = useCallback(async (order: TakeOutOrder) => {
    try {
      await cancelOrder(order);
    } catch (error) {
      console.error("❌ Error canceling order:", error);
    }
  }, [cancelOrder]);

  const handlePrint = useCallback(async (order: TakeOutOrder) => {
    try {
      await submitToPrintQueue(order);
    } catch (error) {
      console.error("❌ Error submitting to print queue:", error);
    }
  }, [submitToPrintQueue]);

  const handleToggleSelectionMode = useCallback((orderId: string) => {
    if (selectionMode === orderId) {
      setSelectionMode(null);
      setSelectedItemIds(new Set());
    } else {
      setCashPaymentOrderId(null);
      setSelectionMode(orderId);
      setSelectedItemIds(new Set());
    }
  }, [selectionMode]);

  const handleToggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handlePrintSelected = useCallback(async (order: TakeOutOrder) => {
    try {
      await submitSelectedItemsToPrintQueue(order, Array.from(selectedItemIds));
      setSelectionMode(null);
      setSelectedItemIds(new Set());
    } catch (error) {
      console.error("❌ Error printing selected items:", error);
    }
  }, [submitSelectedItemsToPrintQueue, selectedItemIds]);

  const handleMarkAsPaid = useCallback(async (order: TakeOutOrder, paid: boolean) => {
    try {
      await markOrderAsPaid(order, paid);
    } catch (error) {
      console.error("❌ Error marking order as paid:", error);
    }
  }, [markOrderAsPaid]);

  const handleEditOrder = useCallback((order: TakeOutOrder) => {
    const convertedOrder = convertOrderTimestamps(order);
    setOrder(convertedOrder);
    router.push("/take-out-orders/edit-order" as Href);
  }, [setOrder, router]);

  const extraData = useMemo(
    () => ({ expandedOrderId, selectionMode, selectedItemIdsSize: selectedItemIds.size }),
    [expandedOrderId, selectionMode, selectedItemIds.size],
  );

  const renderOrder = useCallback(({ item }: { item: TakeOutOrder }) => {
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
        ? EMPTY_TAX_BREAKDOWN
        : calculateTaxBreakdown(selectedItemsTotal, DiscountType.None, 0);

    return (
      <View
        className={`${
          item.status === OrderStatus.Cancelled
            ? "bg-red-100 border-red-200"
            : item.status === OrderStatus.Completed
              ? "bg-green-100 border-green-200"
              : takeoutFulfillmentIsScheduled(item)
                ? "bg-orange-100 border-orange-200"
                : "bg-blue-100 border-blue-200"
        } p-4 mb-3 rounded-xl shadow-sm border `}
      >
        <TouchableOpacity
          className="flex-row justify-between items-center"
          onPress={() => toggleExpand(item.id!)}
        >
          <View>
            {item.customerName ? (
              <>
                <Text className="font-semibold text-gray-800 text-base">
                  Name: {item.customerName}
                </Text>
              </>
            ) : null}
            {item.phoneNumber ? (
              <Text className="font-semibold text-gray-800 text-base">
                Phone #: {formatPhone(item.phoneNumber)}
              </Text>
            ) : null}
            <Text className="font-semibold text-gray-800 text-base">
              Staff: {item.staff ?? "—"}
            </Text>
            <Text className="font-semibold text-gray-800 text-base">
              Time: {formatDate(item.createdAt)}
            </Text>
            {takeoutFulfillmentIsScheduled(item) && (
              <Text className="font-semibold text-gray-800 text-base">
                Preorder: {formatDate(takeoutScheduledAt(item)!)}
              </Text>
            )}
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
              showSectionHeaders={false}
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
                    className="bg-green-500 px-4 py-3 rounded-md flex-1 mr-2"
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
                    className="bg-gray-700 px-4 py-3 rounded-md flex-1 ml-2"
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
                    className="bg-orange-500 px-3 py-3 rounded-md flex-1 mr-2"
                    onPress={() => handleEditOrder(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-purple-500 px-3 py-3 rounded-md flex-1 mx-1"
                    onPress={() => handleToggleSelectionMode(item.id!)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Select Items
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-blue-500 px-3 py-3 rounded-md flex-1 ml-2"
                    onPress={() => handlePrint(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Print
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between mt-3">
                  <TouchableOpacity
                    className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 bg-sky-500 mr-2 ${
                      item.status !== OrderStatus.InProgress ? "opacity-50" : ""
                    }`}
                    disabled={
                      item.status !== OrderStatus.InProgress || !item.id
                    }
                    onPress={() => {
                      if (!item.id) return;
                      router.push({
                        pathname: "/take-out-orders/change-to-dinein/[orderId]",
                        params: { orderId: item.id },
                      } as Href);
                    }}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Change Type
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-yellow-600 px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ml-2"
                    onPress={() => {
                      if (!item.id) return;
                      setCashPaymentOrderId(item.id);
                    }}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Cash payment
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Row 3: Done | Mark Paid | Cancel */}
                <View className="flex-row justify-between mt-3">
                  <TouchableOpacity
                    className="bg-red-500 px-3 py-3 rounded-md flex-1 mr-2"
                    onPress={() => handleCancel(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`px-3 py-3 rounded-md flex-1 mx-1 ${
                      item.paid ? "bg-gray-500" : "bg-pink-500"
                    }`}
                    onPress={() => handleMarkAsPaid(item, !item.paid)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      {item.paid ? "Unpaid" : "Paid"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-green-500 px-3 py-3 rounded-md flex-1 ml-2"
                    onPress={() => handleComplete(item)}
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      Complete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  }, [
    expandedOrderId,
    selectionMode,
    selectedItemIds,
    toggleExpand,
    handleComplete,
    handleCancel,
    handlePrint,
    handleToggleSelectionMode,
    handleToggleItemSelection,
    handlePrintSelected,
    handleMarkAsPaid,
    handleEditOrder,
    router,
  ]);

  if (loading) {
    return (
      <SafeAreaViewWrapper
        className="flex-1 justify-center items-center bg-white"
        includeBottomInset={false}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-600">Loading take out orders...</Text>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 p-4" includeBottomInset={false}>
      {takeOutOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">No takeout orders yet.</Text>
        </View>
      ) : (
        <FlashList
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            alignSelf: "stretch",
            paddingTop: 6,
          }}
          contentContainerStyle={{
            flexGrow: 1,
            alignSelf: "stretch",
            width: "100%",
          }}
          keyboardShouldPersistTaps="always"
          data={takeOutOrders}
          keyExtractor={(item, index) => item.id ?? `order-${index}`}
          renderItem={renderOrder}
          extraData={extraData}
          refreshing={loading}
          onRefresh={refreshTakeOutOrders}
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

      <CashPaymentModal
        visible={cashPaymentOrderId !== null}
        onClose={() => setCashPaymentOrderId(null)}
        orderTotal={cashPaymentModalTotal}
      />
    </SafeAreaViewWrapper>
  );
}
