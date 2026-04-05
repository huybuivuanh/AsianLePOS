import TableInfoCard from "@/features/dinein/TableInfoCard";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { DiscountType, OrderType } from "@/types/enums";
import Header from "@/ui/Header";
import { formatTimeOnly, showAlert } from "@/utils/helpers";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export default function TablePage() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );
  const [order, setOrder] = useState<Partial<DineInOrder> | null>(null);

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
      setOrder(null);
    } catch (error: any) {
      console.log("Failed to cancel order:", error);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    try {
      await completeOrder(order);
      setOrder(null);
      router.replace("/tables");
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

  const handleSeeOrder = () => {
    if (!order?.id) return;
    router.push({
      pathname: "/dinein/order/[orderId]",
      params: { orderId: order.id },
    } as unknown as Href);
  };

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title={`Table ${tableNumber}`}
        onBack={() => {
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
          <View className="mt-4 mx-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <View className="flex-row justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm text-gray-500">Staff</Text>
                <Text
                  className="text-lg font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {order!.staff ?? "Unknown"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm text-gray-500">Time</Text>
                <Text className="text-lg font-bold text-gray-900">
                  {formatTimeOnly(order!.createdAt)}
                </Text>
              </View>
            </View>

            {order!.taxBreakDown && (
              <View className="mt-4 pt-4 border-t border-gray-200">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-base text-gray-600">Subtotal</Text>
                  <Text className="text-base text-gray-800 font-medium">
                    ${order!.taxBreakDown.subTotal.toFixed(2)}
                  </Text>
                </View>
                {order!.taxBreakDown.discount &&
                  order!.taxBreakDown.discount.discountAmount > 0 && (
                    <View>
                      <View className="flex-row justify-between mb-2">
                        {order!.taxBreakDown.discount.discountType ===
                        DiscountType.Percent ? (
                          <Text className="text-base text-gray-600">
                            {`Discount (${order!.taxBreakDown.discount.discountValue}%)`}
                          </Text>
                        ) : (
                          <Text className="text-base text-gray-600">
                            {`Discount ($${order!.taxBreakDown.discount.discountValue.toFixed(2)})`}
                          </Text>
                        )}
                        <Text className="text-base text-gray-800 font-medium">
                          -$
                          {order!.taxBreakDown.discount.discountAmount.toFixed(
                            2,
                          )}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-base text-gray-600">
                          Taxable Subtotal
                        </Text>
                        <Text className="text-base text-gray-800 font-medium">
                          $
                          {order!.taxBreakDown.discount.taxableSubtotal.toFixed(
                            2,
                          )}
                        </Text>
                      </View>
                    </View>
                  )}
                <View className="flex-row justify-between mb-2">
                  <Text className="text-base text-gray-600">PST (6%)</Text>
                  <Text className="text-base text-gray-800 font-medium">
                    ${order!.taxBreakDown.pst.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-base text-gray-600">GST (5%)</Text>
                  <Text className="text-base text-gray-800 font-medium">
                    ${order!.taxBreakDown.gst.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between mt-2 pt-3 border-t border-gray-100">
                  <Text className="text-lg font-semibold text-gray-900">
                    Total
                  </Text>
                  <Text className="text-lg font-bold text-gray-900">
                    ${order!.taxBreakDown.total.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View className="mt-4 pt-4 border-t border-gray-200 flex-row justify-between items-center">
              <View
                className={`px-5 py-2.5 rounded-full ${
                  order!.paid ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    order!.paid ? "text-green-700" : "text-gray-700"
                  }`}
                >
                  {order!.paid ? "✓ Paid" : "Unpaid"}
                </Text>
              </View>
              <View
                className={`px-5 py-2.5 rounded-full ${
                  order!.printed ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    order!.printed ? "text-green-700" : "text-yellow-700"
                  }`}
                >
                  {order!.printed ? "Printed" : "Not Printed"}
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
              className="bg-orange-500 px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0"
            >
              <Text className="text-white text-sm font-semibold text-center">
                {order ? "Edit Order" : "Take Order"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSeeOrder}
              activeOpacity={0.7}
              disabled={!order?.id}
              className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${
                order?.id ? "bg-purple-600" : "bg-purple-300"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                See Order
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePrint}
              activeOpacity={0.7}
              disabled={!order}
              className={`px-2 py-3 rounded-lg items-center justify-center flex-1 min-w-0 ${
                order ? "bg-blue-500" : "bg-blue-300"
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
              disabled={!order}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order ? "bg-teal-500" : "bg-teal-300"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Change Table
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {}}
              activeOpacity={0.7}
              disabled={true}
              className="px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 bg-white border border-gray-200"
            >
              <Text className="text-gray-500 text-sm font-semibold text-center">
                Place Holder
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePrint}
              activeOpacity={0.7}
              disabled={!order}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order ? "bg-sky-500" : "bg-sky-300"
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
                order ? "bg-red-500" : "bg-red-300"
              } px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0`}
              disabled={!order}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMarkAsPaid(!order?.paid)}
              activeOpacity={0.7}
              disabled={!order}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order?.paid
                  ? "bg-gray-500"
                  : order
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
              disabled={!order}
              className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ${
                order ? "bg-green-500" : "bg-green-200"
              }`}
            >
              <Text className="text-white text-sm font-semibold text-center">
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaViewWrapper>
  );
}
