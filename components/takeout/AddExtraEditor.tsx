import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function AddExtraEditor({
  extras,
  onChange,
}: {
  extras: AddExtra[];
  onChange: (updated: AddExtra[]) => void;
}) {
  const [newExtra, setNewExtra] = useState({ description: "", price: "" });

  const handleAdd = () => {
    if (newExtra.description.trim() === "") return;
    const price = parseFloat(newExtra.price) || 0;

    onChange([...extras, { description: newExtra.description.trim(), price }]);
    setNewExtra({ description: "", price: "" });
  };

  const handleRemove = (index: number) => {
    onChange(extras.filter((_, i) => i !== index));
  };

  const isAddDisabled = newExtra.description.trim() === "";

  return (
    <View className="mt-6 mb-4">
      <Text className="text-xl font-semibold mb-2">Add Extras</Text>

      {/* New Extra Input */}
      <View className="flex-row items-end mb-3 space-x-2">
        <View className="flex-1">
          <Text className="text-sm text-gray-600 mb-1">Description</Text>
          <TextInput
            className="border border-gray-300 rounded-xl p-3"
            placeholder="Extra description"
            value={newExtra.description}
            onChangeText={(text) =>
              setNewExtra((prev) => ({ ...prev, description: text }))
            }
          />
        </View>

        <View className="w-24">
          <Text className="text-sm text-gray-600 mb-1">Price</Text>
          <TextInput
            className="border border-gray-300 rounded-xl p-3 text-right"
            placeholder="0.00"
            keyboardType="numeric"
            value={newExtra.price}
            onChangeText={(text) =>
              setNewExtra((prev) => ({ ...prev, price: text }))
            }
          />
        </View>

        <TouchableOpacity
          className={`px-4 py-3 rounded-xl ${
            isAddDisabled ? "bg-gray-300" : "bg-blue-500"
          }`}
          onPress={handleAdd}
          disabled={isAddDisabled}
        >
          <Text className="text-white font-semibold">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Read-only List */}
      {extras.map((item, index) => (
        <View
          key={index}
          className="flex-row items-center mb-2 border border-gray-300 rounded-xl p-3 bg-gray-50"
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-700">Add</Text>
            <Text className="text-gray-800">{item.description}</Text>
          </View>

          <View className="w-24">
            <Text className="text-sm font-semibold text-gray-700">Price</Text>
            <Text className="text-gray-800 text-right">
              ${item.price.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            className="bg-red-500 px-3 py-1 rounded-full ml-2"
            onPress={() => handleRemove(index)}
          >
            <Text className="text-white text-sm font-bold">×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
