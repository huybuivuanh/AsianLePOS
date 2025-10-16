import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function TableInfoCard({
  tableNumber,
}: {
  tableNumber: string;
}) {
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber)
  );

  const setGuests = useTableStore((state) => state.setGuests);
  const setTableStatus = useTableStore((state) => state.setTableStatus);

  if (!table) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-6">
        <Text className="text-lg font-bold text-gray-600">Table not found</Text>
      </View>
    );
  }

  const increaseGuests = () => {
    setGuests(tableNumber, table.guests + 1);

    // Optional: automatically mark table as Occupied if guests > 0
    if (table.guests + 1 > 0) {
      setTableStatus(tableNumber, TableStatus.Occupied);
    }
  };

  const decreaseGuests = () => {
    const newGuests = Math.max(0, table.guests - 1);
    setGuests(tableNumber, newGuests);

    // Optional: mark table as Open if guests become 0
    if (newGuests === 0) {
      setTableStatus(tableNumber, TableStatus.Open);
    }
  };

  return (
    <View className="w-full px-4 pt-2 pb-4">
      <View className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 items-center">
        {/* Status */}
        <Text
          className={`text-xl font-bold mb-4 ${
            table.status === TableStatus.Open
              ? "text-green-600"
              : "text-orange-400"
          }`}
        >
          {table.status}
        </Text>

        {/* Guest Counter */}
        <Text className="text-gray-500 text-base mb-3 font-medium">
          Number of Guests
        </Text>

        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={decreaseGuests}
            activeOpacity={0.7}
            className="w-12 h-12 rounded-full bg-white justify-center items-center shadow"
          >
            <Text className="text-2xl font-bold text-gray-700">−</Text>
          </TouchableOpacity>

          <Text className="mx-6 text-3xl font-bold text-gray-800">
            {table.guests}
          </Text>

          <TouchableOpacity
            onPress={increaseGuests}
            activeOpacity={0.7}
            className="w-12 h-12 rounded-full bg-white justify-center items-center shadow"
          >
            <Text className="text-2xl font-bold text-gray-700">＋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
