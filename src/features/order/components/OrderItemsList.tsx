import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  orderItems: OrderItem[];
  orderId: string;
  selectionMode: string | null;
  selectedItemIds: Set<string>;
  onToggleItemSelection: (itemId: string) => void;
};

export default function OrderItemsList({
  orderItems,
  orderId,
  selectionMode,
  selectedItemIds,
  onToggleItemSelection,
}: Props) {
  const isSelectionMode = selectionMode === orderId;

  return (
    <>
      {orderItems.map((orderItem, index) => {
        const isSelected = orderItem.id ? selectedItemIds.has(orderItem.id) : false;

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
                onPress={() => orderItem.id && onToggleItemSelection(orderItem.id)}
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
                    <Text className="text-white text-xs font-bold">✓</Text>
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

                {orderItem.options && orderItem.options.length > 0 && (
                  <View className="mt-1 space-y-1">
                    {orderItem.options.map((option, optIndex) => (
                      <Text key={optIndex} className="text-base text-gray-600">
                        •{" "}
                        {option.quantity > 1 ? `${option.quantity}x ` : ""}
                        {option.name}
                        {option.price > 0 &&
                          ` - $${(option.price * option.quantity).toFixed(2)}`}
                      </Text>
                    ))}
                  </View>
                )}

                {orderItem.extras && orderItem.extras.length > 0 && (
                  <View>
                    {orderItem.extras.map((extra, extraIndex) => (
                      <Text
                        key={extraIndex}
                        className="text-base text-gray-600"
                      >
                        • Add: {extra.description}- ${extra.price.toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}

                {orderItem.changes && orderItem.changes.length > 0 && (
                  <View>
                    {orderItem.changes.map((change, changeIndex) => (
                      <Text
                        key={changeIndex}
                        className="text-base text-gray-600"
                      >
                        • Change: {change.from} → {change.to} - $
                        {change.price.toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}

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
    </>
  );
}

