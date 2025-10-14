import React from "react";
import { Text, TextInput, View } from "react-native";

interface Props {
  name: string;
  phone: string;
  onChangeName: (text: string) => void;
  onChangePhone: (text: string) => void;
}

export default function CustomerInfoForm({
  name,
  phone,
  onChangeName,
  onChangePhone,
}: Props) {
  return (
    <View className="space-y-4 mb-4">
      <View className="flex-row items-center">
        <Text className="w-32 text-gray-700 font-medium">Customer Name</Text>
        <TextInput
          placeholder="Enter name"
          value={name}
          onChangeText={onChangeName}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base bg-white"
        />
      </View>

      <View className="flex-row items-center">
        <Text className="w-32 text-gray-700 font-medium">Phone Number</Text>
        <TextInput
          placeholder="Enter phone"
          value={phone}
          onChangeText={onChangePhone}
          keyboardType="phone-pad"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base bg-white"
        />
      </View>
    </View>
  );
}
