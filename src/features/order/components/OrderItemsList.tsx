import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import {
  groupOrderItemsByDisplaySection,
  sortOrderItemsForDisplay,
} from "../orderItemSections";
import OrderSectionHeader from "./OrderSectionHeader";

type Props = {
  orderItems?: OrderItem[];
  orderId: string;
  selectionMode: string | null;
  selectedItemIds: Set<string>;
  onToggleItemSelection: (itemId: string) => void;
  /** When false: sorted lines only (e.g. take-out orders tab). Default true (dine-in order views). */
  showSectionHeaders?: boolean;
};

export default function OrderItemsList({
  orderItems = [],
  orderId,
  selectionMode,
  selectedItemIds,
  onToggleItemSelection,
  showSectionHeaders = true,
}: Props) {
  const isSelectionMode = selectionMode === orderId;

  const sections = useMemo(
    () => groupOrderItemsByDisplaySection(orderItems),
    [orderItems],
  );

  const flatSorted = useMemo(
    () => sortOrderItemsForDisplay(orderItems),
    [orderItems],
  );

  const renderRow = (orderItem: OrderItem, index: number, keySuffix: string) => {
    const isSelected = orderItem.id
      ? selectedItemIds.has(orderItem.id)
      : false;
    const lineTotal = (orderItem.price * orderItem.quantity).toFixed(2);

    return (
      <Pressable
        key={`${orderItem.id ?? "item"}-${keySuffix}-${index}`}
        onPress={
          isSelectionMode && orderItem.id
            ? () => onToggleItemSelection(orderItem.id!)
            : undefined
        }
        disabled={!isSelectionMode || !orderItem.id}
        className={`mb-2.5 rounded-2xl border bg-white px-4 py-3.5 ${
          isSelectionMode
            ? isSelected
              ? "border-2 border-blue-500 bg-blue-50/70 shadow-sm"
              : "border border-dashed border-gray-300 bg-gray-50/80"
            : "border border-stone-200/90 shadow-sm shadow-stone-200/40"
        }`}
      >
        <View className="flex-row items-start">
          {isSelectionMode && (
            <View className="mr-3 mt-1">
              <View
                className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                  isSelected
                    ? "border-blue-600 bg-blue-600"
                    : "border-stone-300 bg-white"
                }`}
              >
                {isSelected && (
                  <Text className="text-xs font-bold text-white">✓</Text>
                )}
              </View>
            </View>
          )}
          <View className="min-w-0 flex-1">
            <View className="flex-row items-baseline justify-between gap-2">
              <Text
                className="flex-1 text-lg font-semibold text-stone-900"
                numberOfLines={3}
              >
                <Text className="font-bold text-stone-600">
                  {orderItem.quantity}
                </Text>
                <Text className="text-stone-400"> × </Text>
                {orderItem.name}
              </Text>
              <Text className="text-lg font-bold text-stone-900">
                ${lineTotal}
              </Text>
            </View>

            {orderItem.options && orderItem.options.length > 0 && (
              <View className="mt-2 border-t border-stone-100 pt-2">
                {orderItem.options.map((option, optIndex) => (
                  <Text
                    key={optIndex}
                    className="text-[15px] leading-5 text-stone-600"
                  >
                    <Text className="text-stone-400">· </Text>
                    {option.quantity > 1 ? `${option.quantity}× ` : ""}
                    {option.name}
                    {option.price > 0 &&
                      `  ·  $${(option.price * option.quantity).toFixed(2)}`}
                  </Text>
                ))}
              </View>
            )}

            {orderItem.extras && orderItem.extras.length > 0 && (
              <View className="mt-1.5">
                {orderItem.extras.map((extra, extraIndex) => (
                  <Text
                    key={extraIndex}
                    className="text-[15px] leading-5 text-stone-600"
                  >
                    <Text className="text-stone-400">· </Text>
                    Add {extra.description}
                    <Text className="text-stone-500">
                      {" "}
                      · ${extra.price.toFixed(2)}
                    </Text>
                  </Text>
                ))}
              </View>
            )}

            {orderItem.changes && orderItem.changes.length > 0 && (
              <View className="mt-1.5">
                {orderItem.changes.map((change, changeIndex) => (
                  <Text
                    key={changeIndex}
                    className="text-[15px] leading-5 text-stone-600"
                  >
                    <Text className="text-stone-400">· </Text>
                    {change.from} → {change.to}
                    <Text className="text-stone-500">
                      {" "}
                      · ${change.price.toFixed(2)}
                    </Text>
                  </Text>
                ))}
              </View>
            )}

            {orderItem.instructions ? (
              <View className="mt-2.5 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                <Text className="text-[15px] italic leading-5 text-stone-600">
                  {"\u201c"}
                  {orderItem.instructions}
                  {"\u201d"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  if (!showSectionHeaders) {
    return (
      <>
        {flatSorted.map((orderItem, index) =>
          renderRow(orderItem, index, "flat"),
        )}
      </>
    );
  }

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <View key={`section-${section.tier}`}>
          <OrderSectionHeader
            title={section.title}
            tier={section.tier}
            isFirst={sectionIndex === 0}
          />
          {section.items.map((orderItem, index) =>
            renderRow(orderItem, index, String(section.tier)),
          )}
        </View>
      ))}
    </>
  );
}
