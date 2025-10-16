import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function TableInfoCard({
  tableNumber,
}: {
  tableNumber: string;
}) {
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber)
  );
  const router = useRouter();

  const handleEditTable = () =>
    router.push({
      pathname: "/dinein/edittable/[tableNumber]",
      params: { tableNumber },
    });

  if (!table) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-6">
        <Text className="text-lg font-bold text-gray-600">Table not found</Text>
      </View>
    );
  }

  // Determine status color
  const statusColor =
    table.status === TableStatus.Open ? "text-green-600" : "text-orange-400";

  return (
    <View className="w-full px-4 pt-2 pb-4">
      <View className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        {/* Table Number */}

        {/* Status */}
        <Text className={`text-lg font-semibold mb-4 ${statusColor}`}>
          {table.status}
        </Text>

        {/* Guest Counter */}
        <Text className="text-gray-500 text-base mb-4">
          Number of Guests: <Text className="font-bold">{table.guests}</Text>
        </Text>

        {/* Edit Button */}
        <Pressable
          onPress={handleEditTable}
          className="w-full bg-blue-500 py-3 rounded-lg items-center shadow"
          android_ripple={{ color: "#2563eb" }}
        >
          <Text className="text-white font-semibold text-lg">Edit Table</Text>
        </Pressable>
      </View>
    </View>
  );
}
