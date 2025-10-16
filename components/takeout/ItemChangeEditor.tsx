import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export const ItemChangeEditor = ({
  changes,
  onChange,
}: {
  changes: ItemChange[];
  onChange: (updated: ItemChange[]) => void;
}) => {
  const [newChange, setNewChange] = useState({ from: "", to: "", price: "0" });

  const handleAdd = () => {
    // Only add if at least 'from' or 'to' is filled
    if (newChange.from.trim() === "" && newChange.to.trim() === "") return;

    onChange([
      ...changes,
      {
        from: newChange.from.trim(),
        to: newChange.to.trim(),
        price: parseFloat(newChange.price) || 0,
      },
    ]);

    // Reset fields, default price to 0
    setNewChange({ from: "", to: "", price: "0" });
  };

  const handleUpdate = (
    index: number,
    key: keyof ItemChange,
    value: string
  ) => {
    const updated = [...changes];
    updated[index] = {
      ...updated[index],
      [key]: key === "price" ? parseFloat(value) || 0 : value,
    };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(changes.filter((_, i) => i !== index));
  };

  // Disable Add button if both 'from' and 'to' are empty
  const isAddDisabled =
    newChange.from.trim() === "" || newChange.to.trim() === "";

  return (
    <View className="mt-4 mb-6">
      <Text className="text-xl font-semibold mb-2">Item Changes</Text>

      {/* New Change Input */}
      <View className="flex-row items-end mb-3">
        <View className="flex-1 mr-2">
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

        <View className="flex-1 mr-2">
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

        <View className="w-24 mr-2">
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

      {/* Editable List */}
      {changes.map((item, index) => (
        <View
          key={index}
          className="flex-row items-center mb-3 border border-gray-300 rounded-xl p-2"
        >
          <View className="flex-1 mr-2">
            <Text className="text-sm text-gray-600 mb-1">From</Text>
            <TextInput
              value={item.from}
              onChangeText={(text) => handleUpdate(index, "from", text)}
            />
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-sm text-gray-600 mb-1">To</Text>
            <TextInput
              value={item.to}
              onChangeText={(text) => handleUpdate(index, "to", text)}
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
