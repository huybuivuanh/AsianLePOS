import OrderItemsList from "@/features/order/components/OrderItemsList";
import OrderTaxBreakdown from "@/features/order/components/OrderTaxBreakdown";
import { DiscountType, OrderStatus } from "@/types/enums";
import {
  calculateTaxBreakdown,
  EMPTY_TAX_BREAKDOWN,
  formatDate,
  formatPhone,
  orderPaidFromLineItems,
  orderSubtotal,
  resolveTaxBreakdown,
  takeoutFulfillmentIsScheduled,
  takeoutScheduledAt,
} from "@/utils/helpers";
import React, { memo, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export type TakeOutOrderCardProps = {
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

export const TakeOutOrderCard = memo(function TakeOutOrderCard({
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
    if (!isSelectionMode || !item.orderItems || selectedItemIds.size === 0) return 0;
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
              className={`px-3 py-1 rounded-full ${item.printed ? "bg-green-100" : "bg-yellow-100"}`}
            >
              <Text
                className={`text-xs font-semibold ${item.printed ? "text-green-700" : "text-yellow-700"}`}
              >
                {item.printed ? "Printed" : "Not Printed"}
              </Text>
            </View>
            {!(item.status === OrderStatus.Completed && !isPaid) &&
              item.status !== OrderStatus.Cancelled && (
                <View
                  className={`px-3 py-1 rounded-full ${isPaid ? "bg-green-100" : "bg-gray-100"}`}
                >
                  <Text
                    className={`text-xs font-semibold ${isPaid ? "text-green-700" : "text-gray-700"}`}
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
              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  className="bg-orange-500 px-3 py-3 rounded-md flex-1 mr-2"
                  onPress={() => onEditOrder(item)}
                >
                  <Text className="text-white font-semibold text-center text-sm">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-purple-500 px-3 py-3 rounded-md flex-1 mx-1"
                  onPress={() => onToggleSelectionMode(item.id!)}
                >
                  <Text className="text-white font-semibold text-center text-sm">Select Items</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-blue-500 px-3 py-3 rounded-md flex-1 ml-2"
                  onPress={() => onPrint(item)}
                >
                  <Text className="text-white font-semibold text-center text-sm">Print</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  className={`px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 bg-sky-500 mr-2 ${item.status !== OrderStatus.InProgress ? "opacity-50" : ""}`}
                  disabled={item.status !== OrderStatus.InProgress || !item.id}
                  onPress={() => onChangeToDineIn(item.id!)}
                >
                  <Text className="text-white font-semibold text-center text-sm">Change Type</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-yellow-600 px-2 py-3 rounded-md items-center justify-center flex-1 min-w-0 ml-2"
                  onPress={() => onOpenCashPayment(item.id!)}
                >
                  <Text className="text-white font-semibold text-center text-sm">Cash payment</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  className="bg-red-500 px-3 py-3 rounded-md flex-1 mr-2"
                  onPress={() => onCancel(item)}
                >
                  <Text className="text-white font-semibold text-center text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-3 rounded-md flex-1 mx-1 ${isPaid ? "bg-gray-500" : "bg-pink-500"}`}
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
                  <Text className="text-white font-semibold text-center text-sm">Complete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
});
