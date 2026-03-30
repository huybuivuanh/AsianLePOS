import { buildItemScreenParams } from "@/features/takeout";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enums";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import SpecialFlagsSelector from "./SpecialFlagsSelector";

interface Props {
  item: OrderItem;
}

export default function OrderItemCard({ item }: Props) {
  const { updateQuantity, updateOrderItem, order } = useOrderStore();
  const { menuItems } = useMenuStore();
  const router = useRouter();

  // Map the item's current flags to the FlagType for SpecialFlagsSelector
  const getSelectedFlag = (): "appetizer" | "toGo" | null => {
    if (item.togo) return "toGo";
    if (item.appetizer) return "appetizer";
    return null;
  };

  const handleFlagChange = (newFlag: "appetizer" | "toGo" | null) => {
    if (!item.id) return;

    const updates: Partial<OrderItem> = {};
    updates.togo = newFlag === "toGo";
    updates.appetizer = newFlag === "appetizer";

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
            {item.options.map((option, index) => (
              <Text key={index} className="text-base text-gray-600">
                • {option.quantity > 1 ? `${option.quantity}x ` : ""}
                {option.name}
                {option.price > 0 &&
                  ` - $${(option.price * option.quantity).toFixed(2)}`}
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

      {/* Quantity Stepper and Edit Button */}
      <View className="items-end">
        <View className="flex-row items-center mt-1 mb-2">
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
            onPress={() =>
              item.id && updateQuantity(item.id, item.quantity + 1)
            }
          >
            <Text className="text-2xl font-bold">＋</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Item Button */}
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => {
            if (item.id) {
              // Find menu item by name
              const menuItem = menuItems.find((mi) => mi.name === item.name);
              if (menuItem?.id) {
                router.push({
                  pathname: "/item/[itemId]",
                  params: buildItemScreenParams(menuItem, {
                    orderType: order.orderType ?? OrderType.TakeOut,
                    orderItemId: item.id,
                  }),
                });
              }
            }
          }}
        >
          <Text className="text-white font-semibold text-sm">Edit Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
