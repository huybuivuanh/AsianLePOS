import { useOrderStore } from "@/stores/useOrderStore";
import React from "react";
import { Text, TextInput, View } from "react-native";

export default function CustomerInfoForm() {
  const { order, updateOrder } = useOrderStore();

  return (
    <View className="space-y-4 mb-4">
      <View className="flex-row items-center">
        <Text className="w-32 text-gray-700 font-medium">Customer Name</Text>
        <TextInput
          placeholder="Enter name"
          value={order.name || ""}
          onChangeText={(text) => updateOrder({ name: text })}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base bg-white"
        />
      </View>

      <View className="flex-row items-center">
        <Text className="w-32 text-gray-700 font-medium">Phone Number</Text>
        <TextInput
          placeholder="Enter phone"
          value={order.phoneNumber || ""}
          onChangeText={(text) => updateOrder({ phoneNumber: text })}
          keyboardType="phone-pad"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base bg-white"
        />
      </View>
    </View>
  );
}
