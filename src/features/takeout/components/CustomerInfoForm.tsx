import { useOrderStore } from "@/stores/useOrderStore";
import React from "react";
import { Keyboard, Text, TextInput, View } from "react-native";

export default function CustomerInfoForm() {
  const { order, updateOrder } = useOrderStore();

  return (
    <View className="space-y-4 mb-4">
      <View className="flex-row items-center">
        <Text className="w-32 text-gray-700 font-medium">Customer Name</Text>
        <TextInput
          placeholder="Enter name"
          value={order.customerName || ""}
          onChangeText={(text) =>
            updateOrder({ customerName: text.toUpperCase() })
          }
          onSubmitEditing={() => Keyboard.dismiss()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
      </View>

      <View className="flex-row items-center">
        <Text className="w-32 text-gray-700 font-medium">Phone Number</Text>
        <TextInput
          placeholder="Enter phone"
          keyboardType="phone-pad"
          value={order.phoneNumber || ""}
          onChangeText={(text) => updateOrder({ phoneNumber: text })}
          onSubmitEditing={() => Keyboard.dismiss()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
        />
      </View>
    </View>
  );
}
