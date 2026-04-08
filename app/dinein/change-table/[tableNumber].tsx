import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import FullScreenLoadingOverlay from "@/ui/FullScreenLoadingOverlay";
import Header from "@/ui/Header";
import { confirmAlert, showAlert } from "@/utils/helpers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";

export default function ChangeTableScreen() {
  const router = useRouter();
  const { tableNumber, orderId } = useLocalSearchParams<{
    tableNumber: string;
    orderId: string;
  }>();
  const fromTable =
    (Array.isArray(tableNumber) ? tableNumber[0] : tableNumber) ?? "";
  const orderIdStr = (Array.isArray(orderId) ? orderId[0] : orderId) ?? "";

  const { tables } = useTableStore();
  const { activeDineInOrders } = useActiveDineInOrdersStore();
  const { changeDineInOrderTable } = useOrderStore();

  const [submitting, setSubmitting] = useState(false);

  const order = useMemo(
    () => activeDineInOrders.find((o) => o.id === orderIdStr),
    [activeDineInOrders, orderIdStr],
  );

  const handleSelectTable = async (toTableNumber: string) => {
    if (submitting || !orderIdStr || !fromTable || !order) return;

    const ok = await confirmAlert(
      "Change table?",
      `\nMove this order from table ${fromTable} to table ${toTableNumber}?
    `,
    );
    if (!ok) return;

    try {
      setSubmitting(true);
      await changeDineInOrderTable({
        orderId: orderIdStr,
        fromTableNumber: fromTable,
        toTableNumber,
      });
      router.replace("/tables");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not change table.";
      showAlert("Change table failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!orderIdStr || !fromTable) {
    return (
      <SafeAreaViewWrapper className="flex-1 bg-gray-100 justify-center items-center p-6">
        <Text className="text-gray-600 text-center mb-4">
          Missing order or table.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-4 py-2 rounded-lg bg-gray-800"
        >
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper className="flex-1 bg-gray-100">
      <Header
        title="Change table"
        onBack={() => {
          if (!submitting) router.back();
        }}
      />
      {!order && (
        <View className="px-4 py-2 flex-row items-center">
          <ActivityIndicator size="small" color="#6b7280" />
          <Text className="ml-2 text-sm text-gray-500">Loading order…</Text>
        </View>
      )}

      <FlashList
        style={{ flex: 1, minHeight: 0, width: "100%", alignSelf: "stretch" }}
        data={tables}
        keyExtractor={(t, index) => t.id ?? `${t.tableNumber}-${index}`}
        numColumns={3}
        contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        extraData={{ submitting, orderIdStr, fromTable }}
        renderItem={({ item }) => {
          const isCurrent = item.tableNumber === fromTable;
          const isOtherOccupied =
            item.status === TableStatus.Occupied && !isCurrent;
          const selectable =
            item.status === TableStatus.Open && !isCurrent && !!order;

          return (
            <TouchableOpacity
              activeOpacity={selectable && !submitting ? 0.75 : 1}
              disabled={!selectable || submitting}
              onPress={() => void handleSelectTable(item.tableNumber)}
              className={`flex-1 m-1.5 p-3 rounded-xl border-2 min-h-[104px] ${
                isCurrent
                  ? "border-blue-500 bg-blue-50"
                  : isOtherOccupied
                    ? "border-red-400 bg-red-100"
                    : selectable
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200 bg-gray-100"
              }`}
            >
              <Text className="text-base font-bold text-gray-900">
                Table {item.tableNumber}
              </Text>
              {isCurrent && (
                <Text className="text-xs font-semibold text-blue-700 mt-1">
                  Current
                </Text>
              )}
              {isOtherOccupied && (
                <Text className="text-xs font-semibold text-red-700 mt-1">
                  Occupied
                </Text>
              )}
              {selectable && (
                <Text className="text-xs text-green-800 mt-1">Open</Text>
              )}
              {!order && item.status === TableStatus.Open && !isCurrent && (
                <Text className="text-xs text-gray-500 mt-1">Wait…</Text>
              )}
              <Text className="text-xs text-gray-600 mt-1">
                Guests: {item.guests}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FullScreenLoadingOverlay
        visible={submitting}
        title="Updating tables…"
        subtitle="This can take a few seconds."
      />
    </SafeAreaViewWrapper>
  );
}
