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

  const lineTotal = (item.price * item.quantity).toFixed(2);

  return (
    <View className="mb-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <View className="flex-row gap-3">
        <View className="flex-1 min-w-0">
          <Text className="text-base font-bold text-gray-900" numberOfLines={3}>
            {item.quantity} × {item.name}
          </Text>
          <Text className="text-sm font-semibold text-gray-600 mt-0.5">
            ${lineTotal}
          </Text>

          {item.options && item.options.length > 0 && (
            <View className="mt-2">
              {item.options.map((option, index) => (
                <Text key={index} className="text-sm text-gray-600 leading-5">
                  • {option.quantity > 1 ? `${option.quantity}x ` : ""}
                  {option.name}
                  {option.price > 0 &&
                    ` · $${(option.price * option.quantity).toFixed(2)}`}
                </Text>
              ))}
            </View>
          )}

          {item.extras && item.extras.length > 0 && (
            <View className="mt-1.5">
              {item.extras.map((extra, index) => (
                <Text key={index} className="text-sm text-gray-600 leading-5">
                  • Add {extra.description} · ${extra.price.toFixed(2)}
                </Text>
              ))}
            </View>
          )}

          {item.changes && item.changes.length > 0 && (
            <View className="mt-1.5">
              {item.changes.map((change, index) => (
                <Text key={index} className="text-sm text-gray-600 leading-5">
                  • {change.from} → {change.to} · ${change.price.toFixed(2)}
                </Text>
              ))}
            </View>
          )}

          {item.instructions && (
            <Text className="text-sm text-gray-500 mt-2 italic leading-5">
              {`"${item.instructions}"`}
            </Text>
          )}
        </View>

        <View className="items-stretch justify-start">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 justify-center items-center active:bg-gray-200"
              onPress={() =>
                item.id &&
                updateQuantity(item.id, Math.max(item.quantity - 1, 0))
              }
            >
              <Text className="text-lg font-bold text-gray-700 pb-0.5">−</Text>
            </TouchableOpacity>

            <Text className="min-w-[28px] text-center text-base font-bold text-gray-900 mx-2">
              {item.quantity}
            </Text>

            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 justify-center items-center active:bg-gray-200"
              onPress={() =>
                item.id && updateQuantity(item.id, item.quantity + 1)
              }
            >
              <Text className="text-lg font-bold text-gray-700 pb-0.5">＋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="mt-2 py-2 px-3 rounded-lg bg-blue-600 active:bg-blue-700 items-center"
            onPress={() => {
              if (item.id) {
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
            <Text className="text-white font-semibold text-medium">Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {order.orderType === OrderType.DineIn && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <SpecialFlagsSelector
            selected={getSelectedFlag()}
            onChange={handleFlagChange}
          />
        </View>
      )}
    </View>
  );
}
