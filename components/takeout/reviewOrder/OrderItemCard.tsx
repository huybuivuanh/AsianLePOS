import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  item: OrderItem;
  onChangeQuantity: (id: string, newQuantity: number) => void;
}

export default function OrderItemCard({ item, onChangeQuantity }: Props) {
  return (
    <View className="flex-row justify-between items-start mb-4 bg-gray-100 p-4 rounded-lg">
      <View className="flex-1">
        <Text className="text-lg font-semibold">
          {item.quantity} x {item.item.name} - $
          {(item.price * item.quantity).toFixed(2)}
        </Text>

        {/* Options */}
        {item.options && item.options.length > 0 && (
          <View className="mt-1 space-y-1">
            {item.options.map((option) => (
              <Text key={option.id} className="text-base text-gray-600">
                • {option.name}
                {option.price > 0 && ` - $${option.price.toFixed(2)}`}
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
      </View>

      {/* Quantity Stepper */}
      <View className="flex-row items-center mt-1">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-gray-200 justify-center items-center mr-4"
          onPress={() =>
            item.id && onChangeQuantity(item.id, Math.max(item.quantity - 1, 1))
          }
        >
          <Text className="text-2xl font-bold">−</Text>
        </TouchableOpacity>

        <Text className="text-xl font-semibold">{item.quantity}</Text>

        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-gray-200 justify-center items-center ml-4"
          onPress={() =>
            item.id && onChangeQuantity(item.id, item.quantity + 1)
          }
        >
          <Text className="text-2xl font-bold">＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
