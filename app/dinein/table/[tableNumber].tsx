import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import TableInfoCard from "@/features/dinein/TableInfoCard";
import { useDineInTableActions } from "@/features/dinein/hooks/useDineInTableActions";
import { useLinePaidDebounce } from "@/features/dinein/hooks/useLinePaidDebounce";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useCartStore } from "@/stores/useCartStore";
import { DiscountType, OrderType } from "@/types/enums";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import {
  calculateTaxBreakdown,
  EMPTY_TAX_BREAKDOWN,
  formatTimeOnly,
  orderPaidFromLineItems,
  showAlert,
} from "@/utils/helpers";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTableStore } from "@/stores/useTableStore";

const scrollContentStyle = { flexGrow: 1, paddingBottom: 12 };

export default function TablePage() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );

  const [order, setOrder] = useState<Partial<DineInOrder> | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());

  const { activeDineInOrders, loading: ordersLoading } = useActiveDineInOrdersStore();
  const { clearOrder, updateOrder } = useCartStore();

  const {
    actionOverlay,
    actionBusy,
    cashModal,
    handleCancelOrder,
    handleCompleteOrder,
    handlePrint,
    handleMarkAsPaid,
    handlePrintSelected,
    handleMarkSelectedPaid,
  } = useDineInTableActions();

  const { handleToggleLinePaid, flushPendingToggle, cancelPendingToggle } =
    useLinePaidDebounce();

  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return activeDineInOrders.find((o) => o.id === table.currentOrderId);
  }, [activeDineInOrders, table]);

  useEffect(() => {
    setOrder(currentOrder ?? null);
  }, [currentOrder]);

  useEffect(() => {
    if (!selectionMode) cashModal.close();
  }, [selectionMode, cashModal]);

  const hasActiveOrderItems = Boolean(order?.orderItems && order.orderItems.length > 0);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((p) => !p);
    setSelectedItemIds(new Set());
  }, []);

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectedItemsTotal = useMemo(() => {
    if (!selectionMode || !order?.orderItems || selectedItemIds.size === 0) return 0;
    return order.orderItems
      .filter((it) => it.id && selectedItemIds.has(it.id))
      .reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [order?.orderItems, selectedItemIds, selectionMode]);

  const selectedItemsTaxBreakDown = useMemo(
    () => selectedItemsTotal === 0 ? EMPTY_TAX_BREAKDOWN : calculateTaxBreakdown(selectedItemsTotal, DiscountType.None, 0),
    [selectedItemsTotal],
  );

  const isOrderPaid = useMemo(
    () => orderPaidFromLineItems(order?.orderItems ?? []),
    [order?.orderItems],
  );

  const onToggleLinePaid = useCallback(
    (itemId: string, nextPaid: boolean) => {
      if (!order?.id || !order.orderItems?.length) return;
      handleToggleLinePaid(itemId, nextPaid, order.id, order.orderItems, (nextItems) => {
        setOrder((prev) => (prev ? { ...prev, orderItems: nextItems } : prev));
      });
    },
    [order?.id, order?.orderItems, handleToggleLinePaid],
  );

  if (!table || ordersLoading) {
    return (
      <SafeAreaViewWrapper className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title={`Table ${tableNumber}`}
        onBack={() => { if (!actionBusy) router.back(); }}
      />

      <View className="flex-1 justify-between">
        <TableInfoCard tableNumber={tableNumber} />

        {!hasActiveOrderItems ? (
          <Text className="text-gray-500 text-center mt-10 text-lg">
            No active order for this table.
          </Text>
        ) : (
          <View className="mx-4 mt-3 min-h-0 flex-1">
            <ScrollView
              className="mt-3 flex-1"
              style={{ alignSelf: "stretch" }}
              contentContainerStyle={scrollContentStyle}
              keyboardShouldPersistTaps="handled"
            >
              <View className="rounded-2xl border border-gray-200 bg-white p-4" style={{ alignSelf: "stretch" }}>
                <OrderItemsList
                  orderItems={order!.orderItems}
                  orderId={order!.id!}
                  selectionMode={selectionMode ? order!.id! : null}
                  selectedItemIds={selectedItemIds}
                  onToggleItemSelection={toggleItemSelection}
                  linePaidToggleEnabled
                  onToggleLinePaid={onToggleLinePaid}
                />
              </View>
            </ScrollView>

            {/* Order summary bar */}
            {selectionMode ? (
              <View className="flex-row items-stretch rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                <View className="flex-1" />
                <View className="shrink-0 justify-center pl-2">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</Text>
                  <Text className="mt-0.5 text-base font-bold text-gray-900">
                    ${selectedItemsTaxBreakDown.total.toFixed(2)}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-stretch rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                <View className="min-w-0 flex-1 justify-center pr-2">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Staff</Text>
                  <Text className="mt-0.5 text-base font-semibold text-gray-900" numberOfLines={1}>
                    {order!.staff ?? "—"}
                  </Text>
                </View>
                <View className="my-0.5 w-px self-stretch bg-gray-200" />
                <View className="shrink-0 justify-center px-3">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Paid</Text>
                  <Text className={`mt-0.5 text-base font-semibold ${isOrderPaid ? "text-emerald-700" : "text-rose-700"}`}>
                    {isOrderPaid ? "Paid" : "Unpaid"}
                  </Text>
                </View>
                <View className="my-0.5 w-px self-stretch bg-gray-200" />
                <View className="shrink-0 justify-center px-3">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Ordered At</Text>
                  <Text className="mt-0.5 text-base font-semibold text-gray-900">
                    {formatTimeOnly(order!.createdAt)}
                  </Text>
                </View>
                <View className="my-0.5 w-px self-stretch bg-gray-200" />
                <View className="shrink-0 justify-center pl-2">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</Text>
                  <Text className="mt-0.5 text-base font-bold text-gray-900">
                    ${(order!.taxBreakDown?.total ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Footer Actions */}
        <View className="m-4">
          {selectionMode ? (
            <View>
              <View className="flex-row">
                <TouchableOpacity
                  className={`bg-green-600 px-3 py-3 rounded-lg items-center justify-center flex-1 mr-1.5 ${selectedItemIds.size === 0 ? "opacity-50" : "opacity-100"}`}
                  onPress={() => handlePrintSelected(order!, selectedItemIds, () => {
                    setSelectionMode(false);
                    setSelectedItemIds(new Set());
                  })}
                  disabled={selectedItemIds.size === 0 || actionBusy}
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    Print Selected ({selectedItemIds.size})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`bg-emerald-700 px-3 py-3 rounded-lg items-center justify-center flex-1 ml-1.5 ${selectedItemIds.size === 0 ? "opacity-50" : "opacity-100"}`}
                  onPress={() => handleMarkSelectedPaid(order!, selectedItemIds, cancelPendingToggle, (nextItems) => {
                    setOrder((prev) => (prev ? { ...prev, orderItems: nextItems } : prev));
                    setSelectionMode(false);
                    setSelectedItemIds(new Set());
                  })}
                  disabled={selectedItemIds.size === 0 || actionBusy}
                >
                  <Text className="text-white font-semibold text-center text-sm">Mark Paid</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row mt-2">
                <TouchableOpacity
                  className="bg-red-600 px-3 py-3 rounded-lg items-center justify-center flex-1 mr-1.5"
                  onPress={toggleSelectionMode}
                  disabled={actionBusy}
                >
                  <Text className="text-white font-semibold text-center text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`bg-yellow-600 px-3 py-3 rounded-lg items-center justify-center flex-1 ml-1.5 ${selectedItemIds.size === 0 ? "opacity-50" : "opacity-100"}`}
                  onPress={cashModal.open}
                  disabled={selectedItemIds.size === 0 || actionBusy}
                >
                  <Text className="text-white font-semibold text-center text-sm">Cash payment (selected)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row mb-3 gap-2">
                <TouchableOpacity
                  onPress={() => {
                    if (!order) {
                      if (table.guests === 0) { showAlert("Please Enter Number of Guests"); return; }
                      clearOrder();
                      updateOrder({ orderType: OrderType.DineIn });
                      router.push({ pathname: "/dinein/take-order/[tableNumber]", params: { tableNumber } });
                    } else {
                      updateOrder({ orderType: OrderType.DineIn });
                      router.push({ pathname: "/dinein/edit-order/[tableNumber]", params: { tableNumber } });
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={actionBusy}
                  className={`bg-orange-500 px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${actionBusy ? "opacity-50" : ""}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    {order ? "Edit Order" : "Take Order"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={toggleSelectionMode}
                  activeOpacity={0.7}
                  disabled={!order?.id || actionBusy}
                  className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${order?.id && !actionBusy ? "bg-purple-600" : "bg-purple-300"}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">Select Items</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePrint(order!)}
                  activeOpacity={0.7}
                  disabled={!order || actionBusy}
                  className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${order && !actionBusy ? "bg-blue-500" : "bg-blue-300"}`}
                >
                  <View className="flex-row items-center justify-center">
                    <Text className="text-white text-sm font-semibold">Print</Text>
                    {order?.printed && <Check size={14} color="orange" style={{ marginLeft: 4 }} />}
                  </View>
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-3 gap-2">
                <TouchableOpacity
                  onPress={() => {
                    if (!order?.id) return;
                    router.push({ pathname: "/dinein/change-table/[tableNumber]", params: { tableNumber, orderId: order.id } } as Href);
                  }}
                  activeOpacity={0.7}
                  disabled={!order || actionBusy}
                  className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${order && !actionBusy ? "bg-teal-500" : "bg-teal-200"}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">Change Table</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cashModal.open}
                  activeOpacity={0.7}
                  disabled={!order || actionBusy}
                  className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${order && !actionBusy ? "bg-yellow-600" : "bg-yellow-300"}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">Cash Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!order?.id) return;
                    router.push({ pathname: "/dinein/change-to-takeout/[tableNumber]", params: { tableNumber } } as Href);
                  }}
                  activeOpacity={0.7}
                  disabled={!order || actionBusy}
                  className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${order && !actionBusy ? "bg-sky-500" : "bg-sky-300"}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">Change Type</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-4 gap-2">
                <TouchableOpacity
                  onPress={() => handleCancelOrder(order!, () => setOrder(null))}
                  activeOpacity={0.7}
                  className={`${order && !actionBusy ? "bg-red-500" : "bg-red-300"} px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0`}
                  disabled={!order || actionBusy}
                >
                  <Text className="text-white text-sm font-semibold text-center">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { cancelPendingToggle(); handleMarkAsPaid(order!, !isOrderPaid); }}
                  activeOpacity={0.7}
                  disabled={!order || actionBusy}
                  className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${isOrderPaid ? "bg-gray-500" : order && !actionBusy ? "bg-pink-500" : "bg-gray-300"}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">
                    {isOrderPaid ? "Unpaid" : "Paid"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCompleteOrder(order!, flushPendingToggle, () => setOrder(null))}
                  activeOpacity={0.7}
                  disabled={!order || actionBusy}
                  className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${order && !actionBusy ? "bg-green-500" : "bg-green-200"}`}
                >
                  <Text className="text-white text-sm font-semibold text-center">Complete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {cashModal.isOpen && (
        <CashPaymentModal
          onClose={cashModal.close}
          orderTotal={selectionMode ? selectedItemsTaxBreakDown.total : (order?.taxBreakDown?.total ?? 0)}
        />
      )}

      <FullScreenLoadingOverlay
        visible={Boolean(actionOverlay)}
        title={actionOverlay?.title ?? "Please wait…"}
      />
    </SafeAreaViewWrapper>
  );
}
