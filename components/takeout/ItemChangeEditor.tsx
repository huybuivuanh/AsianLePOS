import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export const ItemChangeEditor = ({
  changes,
  onChange,
}: {
  changes: ItemChange[];
  onChange: (updated: ItemChange[]) => void;
}) => {
  const [newChange, setNewChange] = useState({ from: "", to: "", price: "" });

  const handleAdd = () => {
    if (newChange.from.trim() === "" && newChange.to.trim() === "") return;
    const price = parseFloat(newChange.price) || 0;

    onChange([
      ...changes,
      { from: newChange.from.trim(), to: newChange.to.trim(), price },
    ]);

    setNewChange({ from: "", to: "", price: "" });
  };

  const handleRemove = (index: number) => {
    onChange(changes.filter((_, i) => i !== index));
  };

  const isAddDisabled =
    newChange.from.trim() === "" && newChange.to.trim() === "";

  return (
    <View className="mt-4 mb-6">
      <Text className="text-xl font-semibold mb-2">Item Changes</Text>

      {/* New Change Input */}
      <View className="flex-row items-end mb-3 space-x-2">
        <View className="flex-1">
          <Text className="text-sm text-gray-600 mb-1">From</Text>
          <TextInput
            className="border border-gray-300 rounded-xl p-3"
            placeholder="Original item"
            value={newChange.from}
            onChangeText={(text) =>
              setNewChange((prev) => ({ ...prev, from: text }))
            }
          />
        </View>

        <View className="flex-1">
          <Text className="text-sm text-gray-600 mb-1">To</Text>
          <TextInput
            className="border border-gray-300 rounded-xl p-3"
            placeholder="Replacement item"
            value={newChange.to}
            onChangeText={(text) =>
              setNewChange((prev) => ({ ...prev, to: text }))
            }
          />
        </View>

        <View className="w-24">
          <Text className="text-sm text-gray-600 mb-1">Price</Text>
          <TextInput
            className="border border-gray-300 rounded-xl p-3 text-right"
            placeholder="0.00"
            keyboardType="numeric"
            value={newChange.price}
            onChangeText={(text) =>
              setNewChange((prev) => ({ ...prev, price: text }))
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
      {changes.map((item, index) => (
        <View
          key={index}
          className="flex-row items-center mb-2 border border-gray-300 rounded-xl p-3 bg-gray-50"
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-700">From</Text>
            <Text className="text-gray-800">{item.from}</Text>
          </View>

          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-700">To</Text>
            <Text className="text-gray-800">{item.to}</Text>
          </View>

          <View className="w-20">
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
};
