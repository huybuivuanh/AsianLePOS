import CashPaymentModal from "@/features/dinein/CashPaymentModal";
import TableInfoCard from "@/features/dinein/TableInfoCard";
import OrderItemsList from "@/features/order/components/OrderItemsList";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { OrderType } from "@/types/enums";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import { groupSimpleOrderItems } from "@/utils/groupOrderItems";
import { formatTimeOnly, showAlert } from "@/utils/helpers";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const NO_ITEM_SELECTION = new Set<string>();

export default function TablePage() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );
  const [order, setOrder] = useState<Partial<DineInOrder> | null>(null);
  const [actionOverlay, setActionOverlay] = useState<{
    title: string;
  } | null>(null);
  const [cashPaymentModalVisible, setCashPaymentModalVisible] = useState(false);

  const { activeDineInOrders, loading: ordersLoading } =
    useActiveDineInOrdersStore();
  const {
    clearOrder,
    cancelOrder,
    completeOrder,
    markOrderAsPaid,
    updateOrder,
    submitToPrintQueue,
  } = useOrderStore();

  // ✅ Find the current order using table.currentOrderId
  const currentOrder = useMemo(() => {
    if (!table?.currentOrderId) return undefined;
    return activeDineInOrders.find((o) => o.id === table.currentOrderId);
  }, [activeDineInOrders, table]);

  // ✅ Sync order store with live data
  useEffect(() => {
    if (currentOrder) setOrder(currentOrder);
    else setOrder(null);
  }, [currentOrder, table]);

  const hasActiveOrderItems = Boolean(
    order?.orderItems && order.orderItems.length > 0,
  );

  /** Merged lines for table summary only; Firestore order is unchanged. */
  const displayOrderItems = useMemo(() => {
    if (!order?.orderItems?.length) return [];
    return groupSimpleOrderItems(order.orderItems);
  }, [order?.orderItems]);

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
      setActionOverlay({ title: "Cancelling order…" });
      await cancelOrder(order);
      setOrder(null);
    } catch (error: any) {
      console.log("Failed to cancel order:", error);
    } finally {
      router.replace("/tables");
      setActionOverlay(null);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    try {
      setActionOverlay({ title: "Completing order…" });
      await completeOrder(order);
      setOrder(null);
      router.replace("/tables");
    } catch (err) {
      console.error("Failed to complete order:", err);
    } finally {
      setActionOverlay(null);
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    try {
      setActionOverlay({ title: "Sending to printer…" });
      await submitToPrintQueue(order);
    } catch (error) {
      console.error("❌ Error submitting to print queue:", error);
    } finally {
      setActionOverlay(null);
    }
  };

  const handleMarkAsPaid = async (paid: boolean) => {
    if (!order) return;
    try {
      setActionOverlay({
        title: paid ? "Marking as paid…" : "Updating payment…",
      });
      await markOrderAsPaid(order, paid);
    } catch (error) {
      console.error("❌ Error marking order as paid:", error);
    } finally {
      setActionOverlay(null);
    }
  };

  const handleSplitBill = () => {
    if (!order?.id) return;
    router.push({
      pathname: "/dinein/order/[orderId]",
      params: { orderId: order.id },
    } as unknown as Href);
  };

  const actionBusy = Boolean(actionOverlay);

  const openCashPaymentModal = () => setCashPaymentModalVisible(true);
  const closeCashPaymentModal = () => setCashPaymentModalVisible(false);

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title={`Table ${tableNumber}`}
        onBack={() => {
          if (actionBusy) return;
          router.replace("/tables");
        }}
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
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: 12,
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                className="rounded-2xl border border-gray-200 bg-white p-4"
                style={{ alignSelf: "stretch" }}
              >
                <OrderItemsList
                  orderItems={displayOrderItems}
                  orderId={order!.id!}
                  selectionMode={null}
                  selectedItemIds={NO_ITEM_SELECTION}
                  onToggleItemSelection={() => {}}
                />
              </View>
            </ScrollView>
            <View className="flex-row items-stretch rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
              <View className="min-w-0 flex-1 justify-center pr-2">
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Staff
                </Text>
                <Text
                  className="mt-0.5 text-base font-semibold text-gray-900"
                  numberOfLines={1}
                >
                  {order!.staff ?? "—"}
                </Text>
              </View>
              <View className="my-0.5 w-px self-stretch bg-gray-200" />
              <View className="shrink-0 justify-center px-3">
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Paid
                </Text>
                <Text
                  className={`mt-0.5 text-base font-semibold ${
                    order?.paid ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {order?.paid ? "Paid" : "Unpaid"}
                </Text>
              </View>
              <View className="my-0.5 w-px self-stretch bg-gray-200" />
              <View className="shrink-0 justify-center px-3">
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Ordered At
                </Text>
                <Text className="mt-0.5 text-base font-semibold text-gray-900">
                  {formatTimeOnly(order!.createdAt)}
                </Text>
              </View>
              <View className="my-0.5 w-px self-stretch bg-gray-200" />
              <View className="shrink-0 justify-center pl-2">
                <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Total
                </Text>
                <Text className="mt-0.5 text-base font-bold text-gray-900">
                  ${(order!.taxBreakDown?.total ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer Actions */}
        <View className="m-4">
          {/* Buttons */}
          <View className="flex-row mb-3 gap-2">
            <TouchableOpacity
              onPress={() => {
                if (!order) {
                  if (table.guests === 0) {
                    showAlert("Please Enter Number of Guests");
                    return;
                  }
                  clearOrder();
                  updateOrder({ orderType: OrderType.DineIn });
                  router.push({
                    pathname: "/dinein/take-order/[tableNumber]",
                    params: { tableNumber },
                  });
                } else {
                  updateOrder({ orderType: OrderType.DineIn });
                  router.push({
                    pathname: "/dinein/edit-order/[tableNumber]",
                    params: { tableNumber },
                  });
                }
              }}
              activeOpacity={0.7}
              disabled={actionBusy}
              className={`bg-orange-500 px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${
                actionBusy ? "opacity-50" : ""
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                {order ? "Edit Order" : "Take Order"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSplitBill}
              activeOpacity={0.7}
              disabled={!order?.id || actionBusy}
              className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${
                order?.id && !actionBusy ? "bg-purple-600" : "bg-purple-300"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Split Bill
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePrint}
              activeOpacity={0.7}
              disabled={!order || actionBusy}
              className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${
                order && !actionBusy ? "bg-blue-500" : "bg-blue-300"
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-white text-sm font-semibold">Print</Text>
                {order?.printed && (
                  <Check size={14} color="orange" style={{ marginLeft: 4 }} />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-3 gap-2">
            <TouchableOpacity
              onPress={() => {
                if (!order?.id) return;
                router.push({
                  pathname: "/dinein/change-table/[tableNumber]",
                  params: { tableNumber, orderId: order.id },
                } as Href);
              }}
              activeOpacity={0.7}
              disabled={!order || actionBusy}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order && !actionBusy ? "bg-teal-500" : "bg-teal-200"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Change Table
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openCashPaymentModal}
              activeOpacity={0.7}
              disabled={!order || actionBusy}
              className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${
                order && !actionBusy ? "bg-yellow-600" : "bg-yellow-300"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Cash Payment
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!order?.id) return;
                router.push({
                  pathname: "/dinein/change-to-takeout/[tableNumber]",
                  params: { tableNumber },
                } as Href);
              }}
              activeOpacity={0.7}
              disabled={!order || actionBusy}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order && !actionBusy ? "bg-sky-500" : "bg-sky-300"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Change Type
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-4 gap-2">
            <TouchableOpacity
              onPress={handleCancelOrder}
              activeOpacity={0.7}
              className={`${
                order && !actionBusy ? "bg-red-500" : "bg-red-300"
              } px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0`}
              disabled={!order || actionBusy}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMarkAsPaid(!order?.paid)}
              activeOpacity={0.7}
              disabled={!order || actionBusy}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order?.paid
                  ? "bg-gray-500"
                  : order && !actionBusy
                    ? "bg-pink-500"
                    : "bg-gray-300"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                {order?.paid ? "Unpaid" : "Paid"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCompleteOrder}
              activeOpacity={0.7}
              disabled={!order || actionBusy}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order && !actionBusy ? "bg-green-500" : "bg-green-200"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CashPaymentModal
        visible={cashPaymentModalVisible}
        onClose={closeCashPaymentModal}
        orderTotal={order?.taxBreakDown?.total ?? 0}
      />

      <FullScreenLoadingOverlay
        visible={Boolean(actionOverlay)}
        title={actionOverlay?.title ?? "Please wait…"}
      />
    </SafeAreaViewWrapper>
  );
}
