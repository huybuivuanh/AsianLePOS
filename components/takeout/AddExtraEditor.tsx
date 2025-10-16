import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export const AddExtraEditor = ({
  extras,
  onChange,
}: {
  extras: AddExtra[];
  onChange: (updated: AddExtra[]) => void;
}) => {
  const [newExtra, setNewExtra] = useState({ description: "", price: "0" });

  const handleAdd = () => {
    if (newExtra.description.trim() === "") return;

    onChange([
      ...extras,
      {
        description: newExtra.description.trim(),
        price: parseFloat(newExtra.price) || 0,
      },
    ]);

    setNewExtra({ description: "", price: "0" });
  };

  const handleUpdate = (
    index: number,
    key: "description" | "price",
    value: string
  ) => {
    const updated = [...extras];
    updated[index] = {
      ...updated[index],
      [key]: key === "price" ? parseFloat(value) || 0 : value,
    };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(extras.filter((_, i) => i !== index));
  };

  // Disable Add if description is empty
  const isAddDisabled = newExtra.description.trim() === "";

  return (
    <View className="mt-6 mb-4">
      <Text className="text-xl font-semibold mb-2">Add Extras</Text>

      {/* New Extra Input */}
      <View className="flex-row items-end mb-3">
        <View className="flex-1 mr-2">
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

        <View className="w-24 mr-2">
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

      {/* Editable List */}
      {extras.map((item, index) => (
        <View
          key={index}
          className="flex-row items-center mb-3 border border-gray-300 rounded-xl p-2"
        >
          <View className="flex-1 mr-2">
            <Text className="text-sm text-gray-600 mb-1">Description</Text>
            <TextInput
              value={item.description}
              onChangeText={(text) => handleUpdate(index, "description", text)}
            />
          </View>
          <View className="w-24 mr-2">
            <Text className="text-sm text-gray-600 mb-1">Price</Text>
            <TextInput
              className="text-right"
              keyboardType="numeric"
              value={item.price.toString()}
              onChangeText={(text) => handleUpdate(index, "price", text)}
            />
          </View>
          <TouchableOpacity
            className="bg-red-500 px-3 py-1 rounded-full"
            onPress={() => handleRemove(index)}
          >
            <Text className="text-white text-sm">×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};
