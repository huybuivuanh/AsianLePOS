import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import React, { useEffect } from "react";
import { FlatList, ListRenderItem, Pressable, Text, View } from "react-native";

export default function DineIn() {
  const { tables } = useTableStore();
  const router = useRouter();
  const { clearOrder } = useOrderStore();

  useEffect(() => {
    clearOrder();
  }, [clearOrder]);

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
          <Text className="text-sm mb-1">Guests: {item.guests}</Text>
          <View className="flex-row items-center space-x-1">
            <Text className="text-sm">Order:</Text>
            {item.currentOrderId ? (
              <Check size={16} color="green" />
            ) : (
              <X size={16} color="red" />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaViewWrapper className="p-4">
      {/* Table Grid */}
      <FlatList
        data={tables}
        renderItem={renderItem}
        keyExtractor={(item) => item.tableNumber}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </SafeAreaViewWrapper>
  );
}
