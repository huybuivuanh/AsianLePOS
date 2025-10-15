import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import React from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DineIn() {
  const { tables, addTable, removeTable, updateTable } = useTableStore();

  // Add a new table with next table number
  const handleAddTable = () => {
    const nextNumber = (tables.length + 1).toString();
    addTable({ tableNumber: nextNumber, status: TableStatus.Open, guests: 0 });
  };

  // Remove the last table
  const handleRemoveTable = () => {
    if (tables.length === 0) return;
    const lastNumber = tables[tables.length - 1].tableNumber;
    removeTable(lastNumber);
  };

  // Toggle table status
  const toggleStatus = (tableNumber: string) => {
    const table = tables.find((t) => t.tableNumber === tableNumber);
    if (!table) return;

    const newStatus =
      table.status === TableStatus.Open
        ? TableStatus.Occupied
        : TableStatus.Open;

    updateTable(tableNumber, { status: newStatus });
  };

  const renderItem: ListRenderItem<(typeof tables)[0]> = ({ item }) => {
    const bgColor =
      item.status === TableStatus.Open ? "bg-green-200" : "bg-red-200";
    const borderColor =
      item.status === TableStatus.Open ? "border-green-400" : "border-red-400";

    return (
      <Pressable
        onPress={() => toggleStatus(item.tableNumber)}
        className={`flex-1 m-2 p-4 rounded-xl border ${bgColor} ${borderColor} min-h-24`}
      >
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold">Table {item.tableNumber}</Text>
          </View>
          <Text className="text-sm">Guests: {item.guests}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 p-4 bg-gray-100">
      {/* Add / Remove Table Buttons */}
      <View className="flex-row justify-between mb-4">
        <TouchableOpacity
          onPress={handleAddTable}
          className="bg-blue-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">+ Add Table</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRemoveTable}
          className="bg-red-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">Remove Table</Text>
        </TouchableOpacity>
      </View>

      {/* Table Grid */}
      <FlatList
        data={tables}
        renderItem={renderItem}
        keyExtractor={(item) => item.tableNumber}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </SafeAreaView>
  );
}
