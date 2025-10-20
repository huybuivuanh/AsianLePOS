import SpecialFlagsSelector from "@/components/takeout/SpecialFlagsSelector";
import { useOrderStore } from "@/stores/useOrderStore";
import { KitchenType, OrderType } from "@/types/enum";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  item: OrderItem;
}

export default function OrderItemCard({ item }: Props) {
  const { updateQuantity, updateOrderItem, order } = useOrderStore();

  // Map the item's current flags to the FlagType for SpecialFlagsSelector
  const getSelectedFlag = (): "appetizer" | "toGo" | null => {
    if (item.togo) return "toGo";
    if (item.kitchenType === KitchenType.Appetizer) return "appetizer";
    return null;
  };

  const handleFlagChange = (newFlag: "appetizer" | "toGo" | null) => {
    if (!item.id) return;

    const updates: Partial<OrderItem> = {};
    updates.togo = newFlag === "toGo";
    updates.kitchenType =
      newFlag === "appetizer" ? KitchenType.Appetizer : item.kitchenType;

    updateOrderItem(item.id, updates);
  };

  return (
    <View className="flex-row justify-between items-start mb-4 bg-gray-100 p-4 rounded-lg">
      <View className="flex-1">
        {/* Main item info */}
        <Text className="text-lg font-semibold">
          {item.quantity} x {item.name} - $
          {(item.price * item.quantity).toFixed(2)}
        </Text>

        {/* Options */}
        {item.options && item.options.length > 0 && (
          <View className="mt-2 space-y-1">
            {item.options.map((option) => (
              <Text key={option.id} className="text-base text-gray-600">
                • {option.name}
                {option.price > 0 && ` - $${option.price.toFixed(2)}`}
              </Text>
            ))}
          </View>
        )}

        {/* Add Extras */}
        {item.extras && item.extras.length > 0 && (
          <View>
            {item.extras.map((extra, index) => (
              <Text key={index} className="text-base text-gray-600">
                • Add: {extra.description}- ${extra.price.toFixed(2)}
              </Text>
            ))}
          </View>
        )}

        {/* Item Changes */}
        {item.changes && item.changes.length > 0 && (
          <View>
            {item.changes.map((change, index) => (
              <Text key={index} className="text-base text-gray-600">
                • Change: {change.from} → {change.to} - $
                {change.price.toFixed(2)}
              </Text>
            ))}
          </View>
        )}

        {/* Special Instructions */}
        {item.instructions && (
          <Text className="text-base text-gray-500 mt-2 italic">
            {`"${item.instructions}"`}
          </Text>
        )}

        {/* Flags */}
        {order.orderType === OrderType.DineIn && (
          <SpecialFlagsSelector
            selected={getSelectedFlag()}
            onChange={handleFlagChange}
          />
        )}
      </View>

      {/* Quantity Stepper */}
      <View className="flex-row items-center mt-1">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-gray-200 justify-center items-center mr-4"
          onPress={() =>
            item.id && updateQuantity(item.id, Math.max(item.quantity - 1, 0))
          }
        >
          <Text className="text-2xl font-bold">−</Text>
        </TouchableOpacity>

        <Text className="text-xl font-semibold">{item.quantity}</Text>

        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-gray-200 justify-center items-center ml-4"
          onPress={() => item.id && updateQuantity(item.id, item.quantity + 1)}
        >
          <Text className="text-2xl font-bold">＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
