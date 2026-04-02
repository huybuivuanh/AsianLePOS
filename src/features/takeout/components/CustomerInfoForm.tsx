import { useOrderStore } from "@/stores/useOrderStore";
import React, { useEffect, useRef } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";

type Props = {
  autoFocusPhone?: boolean;
};

export default function CustomerInfoForm({ autoFocusPhone }: Props) {
  const { order, updateOrder } = useOrderStore();
  const phoneInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!autoFocusPhone) return;
    // Let the screen finish mounting before focusing to ensure keyboard opens.
    const t = setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [autoFocusPhone]);

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
          ref={phoneInputRef}
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
