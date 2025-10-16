import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, ListRenderItem, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DineIn() {
  const { tables } = useTableStore();
  const router = useRouter();

  // Toggle table status
  const openTablePage = (tableNumber: string) => {
    const table = tables.find((t) => t.tableNumber === tableNumber);
    if (!table) return;
    router.push({
      pathname: "/dinein/table/[tableNumber]",
      params: { tableNumber },
    });
  };

  const renderItem: ListRenderItem<(typeof tables)[0]> = ({ item }) => {
    const bgColor =
      item.status === TableStatus.Open ? "bg-green-200" : "bg-red-200";
    const borderColor =
      item.status === TableStatus.Open ? "border-green-400" : "border-red-400";

    return (
      <Pressable
        onPress={() => openTablePage(item.tableNumber)}
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
