import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const NUM_COLUMNS = 3;
/** Matches SafeAreaViewWrapper `p-4` horizontal padding */
const OUTER_PADDING = 16;
const CELL_GAP = 8;

export default function Tables() {
  const { width: windowWidth } = useWindowDimensions();
  const { tables } = useTableStore();

  const contentWidth = windowWidth - OUTER_PADDING * 2;
  const cellWidth = (contentWidth - CELL_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const router = useRouter();
  const { clearOrder } = useOrderStore();
  const { activeDineInOrders } = useActiveDineInOrdersStore();

  useEffect(() => {
    clearOrder();
  }, [clearOrder]);

  const openTablePage = (tableNumber: string) => {
    const table = tables.find((t) => t.tableNumber === tableNumber);
    if (!table) return;
    router.push({
      pathname: "/dinein/table/[tableNumber]",
      params: { tableNumber },
    });
  };

  const getPrintedStatus = (orderId: string) => {
    const order = activeDineInOrders.find((o) => o.id === orderId);
    return order?.printed ?? false;
  };

  const renderItem: ListRenderItem<(typeof tables)[0]> = ({ item, index }) => {
    const bgColor =
      item.status === TableStatus.Open ? "bg-green-200" : "bg-red-200";
    const borderColor =
      item.status === TableStatus.Open ? "border-green-400" : "border-red-400";

    const isLastInRow = (index + 1) % NUM_COLUMNS === 0;

    return (
      <Pressable
        onPress={() => openTablePage(item.tableNumber)}
        className={`p-4 mt-2 rounded-xl border ${bgColor} ${borderColor} min-h-24`}
        style={{
          width: cellWidth,
          marginBottom: CELL_GAP,
          marginRight: isLastInRow ? 0 : CELL_GAP,
        }}
      >
        <View>
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
          <View className="flex-row items-center space-x-1">
            <View className="flex-row items-center space-x-1">
              <Text className="text-sm">Printed:</Text>
              {item.currentOrderId && getPrintedStatus(item.currentOrderId) ? (
                <Check size={16} color="green" />
              ) : (
                <X size={16} color="red" />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaViewWrapper className="p-4">
      <FlatList
        keyboardShouldPersistTaps="always"
        data={tables}
        renderItem={renderItem}
        keyExtractor={(item) => item.tableNumber}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{ paddingBottom: 16 }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
      />
    </SafeAreaViewWrapper>
  );
}
