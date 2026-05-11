import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import OrderTaxBreakdown from "@/features/order/components/OrderTaxBreakdown";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTakeOutOrdersStore } from "@/stores/useTakeOutOrdersStore";
import { DiscountType, OrderStatus } from "@/types/enums";
import {
  calculateTaxBreakdown,
  convertOrderTimestamps,
  EMPTY_TAX_BREAKDOWN,
  formatDate,
  formatPhone,
  orderPaidFromLineItems,
  orderSubtotal,
  resolveTaxBreakdown,
  takeoutFulfillmentIsScheduled,
  takeoutScheduledAt,
} from "@/utils/helpers";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

// ─── Module-level constants ───────────────────────────────────────────────────

const EMPTY_SELECTED_IDS = new Set<string>();

const FLASH_LIST_STYLE = {
  flex: 1,
  minHeight: 0,
  width: "100%" as const,
  alignSelf: "stretch" as const,
  paddingTop: 6,
};

const FLASH_LIST_CONTENT_STYLE = {
  flexGrow: 1,
  alignSelf: "stretch" as const,
  width: "100%" as const,
};

// ─── TakeOutOrderCard ─────────────────────────────────────────────────────────

type TakeOutOrderCardProps = {
  item: TakeOutOrder;
  expanded: boolean;
  isSelectionMode: boolean;
  selectedItemIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onComplete: (order: TakeOutOrder) => void;
  onCancel: (order: TakeOutOrder) => void;
  onPrint: (order: TakeOutOrder) => void;
  onToggleSelectionMode: (orderId: string) => void;
  onToggleItemSelection: (itemId: string) => void;
  onPrintSelected: (order: TakeOutOrder) => void;
  onMarkAsPaid: (order: TakeOutOrder, paid: boolean) => void;
  onEditOrder: (order: TakeOutOrder) => void;
  onOpenCashPayment: (orderId: string) => void;
  onChangeToDineIn: (orderId: string) => void;
};

const TakeOutOrderCard = memo(function TakeOutOrderCard({
  item,
  expanded,
  isSelectionMode,
  selectedItemIds,
  onToggleExpand,
  onComplete,
  onCancel,
  onPrint,
  onToggleSelectionMode,
  onToggleItemSelection,
  onPrintSelected,
  onMarkAsPaid,
  onEditOrder,
  onOpenCashPayment,
  onChangeToDineIn,
}: TakeOutOrderCardProps) {
  const taxBreakDown = useMemo(() => resolveTaxBreakdown(item), [item]);
  const isPaid = useMemo(
    () => orderPaidFromLineItems(item.orderItems ?? []),
    [item.orderItems],
  );

  const selectedItemsTotal = useMemo(() => {
    if (!isSelectionMode || !item.orderItems || selectedItemIds.size === 0)
      return 0;
    return item.orderItems
      .filter((oi) => oi.id && selectedItemIds.has(oi.id))
      .reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
  }, [isSelectionMode, item.orderItems, selectedItemIds]);

  const selectedItemsTaxBreakDown = useMemo(
    () =>
      selectedItemsTotal === 0
        ? EMPTY_TAX_BREAKDOWN
        : calculateTaxBreakdown(selectedItemsTotal, DiscountType.None, 0),
    [selectedItemsTotal],
  );

  const orderSubtotalMemo = useMemo(() => orderSubtotal(item), [item]);

  const cardBg =
    item.status === OrderStatus.Cancelled
      ? "bg-red-100 border-red-200"
      : item.status === OrderStatus.Completed
        ? "bg-green-100 border-green-200"
        : takeoutFulfillmentIsScheduled(item)
          ? "bg-orange-100 border-orange-200"
          : "bg-blue-100 border-blue-200";

  return (
    <View className={`${cardBg} p-4 mb-3 rounded-xl shadow-sm border`}>
      <TouchableOpacity
        className="flex-row justify-between items-center"
        onPress={() => onToggleExpand(item.id!)}
      >
        <View>
          {item.customerName ? (
            <Text className="font-semibold text-gray-800 text-base">
              Name: {item.customerName}
            </Text>
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
            Ordered At: {formatDate(item.createdAt)}
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
            {!(item.status === OrderStatus.Completed && !isPaid) &&
              item.status !== OrderStatus.Cancelled && (
                <View
                  className={`px-3 py-1 rounded-full ${
                    isPaid ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isPaid ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </Text>
                </View>
              )}

            <TouchableOpacity
              className="bg-green-500 px-4 py-2 rounded-lg"
              onPress={() => onComplete(item)}
            >
              <Text className="text-sm font-bold text-white">Complete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-3 border-t border-gray-200 pt-2">
          <OrderItemsList
            orderItems={item.orderItems}
            orderId={item.id!}
            selectionMode={isSelectionMode ? item.id! : null}
            selectedItemIds={selectedItemIds}
            onToggleItemSelection={onToggleItemSelection}
            showSectionHeaders={false}
          />

          {taxBreakDown && (
            <OrderTaxBreakdown
              taxBreakDown={taxBreakDown}
              isSelectionMode={isSelectionMode}
              selectedItemsTotal={selectedItemsTotal}
              selectedItemsTaxBreakDown={selectedItemsTaxBreakDown}
              orderSubtotal={orderSubtotalMemo}
            />
          )}

          {isSelectionMode ? (
            <View className="mt-3">
              <View className="flex-row justify-between">
                <TouchableOpacity
                  className="bg-green-500 px-4 py-3 rounded-md flex-1 mr-2"
                  onPress={() => onPrintSelected(item)}
                  disabled={selectedItemIds.size === 0}
                  style={{ opacity: selectedItemIds.size === 0 ? 0.5 : 1 }}
                >
                  <Text className="text-white font-semibold text-center">
                    Print Selected ({selectedItemIds.size})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-gray-700 px-4 py-3 rounded-md flex-1 ml-2"
                  onPress={() => onToggleSelectionMode(item.id!)}
                >
                  <Text className="text-white font-semibold text-center">
                    Cancel Selection
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Row 1: Edit | Select Items | Print */}
              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  className="bg-orange-500 px-3 py-3 rounded-md flex-1 mr-2"
                  onPress={() => onEditOrder(item)}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-purple-500 px-3 py-3 rounded-md flex-1 mx-1"
                  onPress={() => onToggleSelectionMode(item.id!)}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Select Items
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-blue-500 px-3 py-3 rounded-md flex-1 ml-2"
                  onPress={() => onPrint(item)}
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
                  disabled={item.status !== OrderStatus.InProgress || !item.id}
                  onPress={() => onChangeToDineIn(item.id!)}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Change Type
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-yellow-600 px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ml-2"
                  onPress={() => onOpenCashPayment(item.id!)}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Cash payment
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 3: Cancel | Paid | Complete */}
              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  className="bg-red-500 px-3 py-3 rounded-md flex-1 mr-2"
                  onPress={() => onCancel(item)}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-3 rounded-md flex-1 mx-1 ${
                    isPaid ? "bg-gray-500" : "bg-pink-500"
                  }`}
                  onPress={() => onMarkAsPaid(item, !isPaid)}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    {isPaid ? "Unpaid" : "Paid"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-green-500 px-3 py-3 rounded-md flex-1 ml-2"
                  onPress={() => onComplete(item)}
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
});

// ─── TakeOutOrdersTab ─────────────────────────────────────────────────────────

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
  const { setOrder } = useCartStore();
  const {
    cancelOrder,
    completeOrder,
    markOrderAsPaid,
    submitToPrintQueue,
    submitSelectedItemsToPrintQueue,
  } = useOrderStore();

  // Keep a ref so handlePrintSelected doesn't need selectedItemIds as a dep.
  const selectedItemIdsRef = useRef(selectedItemIds);
  useEffect(() => {
    selectedItemIdsRef.current = selectedItemIds;
  }, [selectedItemIds]);

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
    return resolveTaxBreakdown(o!)?.total ?? 0;
  }, [cashPaymentOrderId, takeOutOrders]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  }, []);

  const handleComplete = useCallback(
    async (order: TakeOutOrder) => {
      try {
        await completeOrder(order);
      } catch (error) {
        console.error("❌ Error completing order:", error);
      }
    },
    [completeOrder],
  );

  const handleCancel = useCallback(
    async (order: TakeOutOrder) => {
      try {
        await cancelOrder(order);
      } catch (error) {
        console.error("❌ Error canceling order:", error);
      }
    },
    [cancelOrder],
  );

  const handlePrint = useCallback(
    async (order: TakeOutOrder) => {
      try {
        await submitToPrintQueue(order);
      } catch (error) {
        console.error("❌ Error submitting to print queue:", error);
      }
    },
    [submitToPrintQueue],
  );

  // Functional updater removes the selectionMode dep — keeps this stable.
  const handleToggleSelectionMode = useCallback((orderId: string) => {
    setSelectionMode((prev) => {
      if (prev === orderId) {
        setSelectedItemIds(new Set());
        return null;
      }
      setCashPaymentOrderId(null);
      setSelectedItemIds(new Set());
      return orderId;
    });
  }, []);

  const handleToggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  // Reads selectedItemIds via ref so this stays stable across selections.
  const handlePrintSelected = useCallback(
    async (order: TakeOutOrder) => {
      try {
        await submitSelectedItemsToPrintQueue(
          order,
          Array.from(selectedItemIdsRef.current),
        );
        setSelectionMode(null);
        setSelectedItemIds(new Set());
      } catch (error) {
        console.error("❌ Error printing selected items:", error);
      }
    },
    [submitSelectedItemsToPrintQueue],
  );

  const handleMarkAsPaid = useCallback(
    async (order: TakeOutOrder, paid: boolean) => {
      try {
        await markOrderAsPaid(order, paid);
      } catch (error) {
        console.error("❌ Error marking order as paid:", error);
      }
    },
    [markOrderAsPaid],
  );

  const handleEditOrder = useCallback(
    (order: TakeOutOrder) => {
      setOrder(convertOrderTimestamps(order));
      router.push("/take-out-orders/edit-order" as Href);
    },
    [setOrder, router],
  );

  const handleOpenCashPayment = useCallback((orderId: string) => {
    setCashPaymentOrderId(orderId);
  }, []);

  const handleCloseCashPayment = useCallback(() => {
    setCashPaymentOrderId(null);
  }, []);

  const handleChangeToDineIn = useCallback(
    (orderId: string) => {
      router.push({
        pathname: "/take-out-orders/change-to-dinein/[orderId]",
        params: { orderId },
      } as Href);
    },
    [router],
  );

  const extraData = useMemo(
    () => ({
      expandedOrderId,
      selectionMode,
      selectedItemIdsSize: selectedItemIds.size,
    }),
    [expandedOrderId, selectionMode, selectedItemIds.size],
  );

  const renderOrder = useCallback(
    ({ item }: { item: TakeOutOrder }) => {
      const isSelectionMode = selectionMode === item.id;
      return (
        <TakeOutOrderCard
          item={item}
          expanded={expandedOrderId === item.id}
          isSelectionMode={isSelectionMode}
          // Only pass live selectedItemIds to the card currently in selection
          // mode — all others get the stable empty set so their memo holds.
          selectedItemIds={
            isSelectionMode ? selectedItemIds : EMPTY_SELECTED_IDS
          }
          onToggleExpand={toggleExpand}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onPrint={handlePrint}
          onToggleSelectionMode={handleToggleSelectionMode}
          onToggleItemSelection={handleToggleItemSelection}
          onPrintSelected={handlePrintSelected}
          onMarkAsPaid={handleMarkAsPaid}
          onEditOrder={handleEditOrder}
          onOpenCashPayment={handleOpenCashPayment}
          onChangeToDineIn={handleChangeToDineIn}
        />
      );
    },
    [
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
      handleOpenCashPayment,
      handleChangeToDineIn,
    ],
  );

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
          style={FLASH_LIST_STYLE}
          contentContainerStyle={FLASH_LIST_CONTENT_STYLE}
          keyboardShouldPersistTaps="always"
          data={takeOutOrders}
          keyExtractor={(item, index) => item.id ?? `order-${index}`}
          renderItem={renderOrder}
          extraData={extraData}
          refreshing={loading}
          onRefresh={refreshTakeOutOrders}
          onEndReached={() => {
            if (hasMore && !loadingMore) loadMoreOrders();
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
        onClose={handleCloseCashPayment}
        orderTotal={cashPaymentModalTotal}
      />
    </SafeAreaViewWrapper>
  );
}
