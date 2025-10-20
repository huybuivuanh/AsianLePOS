import Header from "@/components/ui/Header";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enum";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditTable() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber)
  );
  const router = useRouter();

  const setGuestsLocal = useTableStore((state) => state.setGuestsLocal);
  const setTableStatusLocal = useTableStore(
    (state) => state.setTableStatusLocal
  );
  const updateTable = useTableStore((state) => state.updateTable);

  const [submitting, setSubmitting] = useState(false);

  if (!table) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-6">
        <Text className="text-lg font-bold text-gray-600">Table not found</Text>
      </View>
    );
  }

  const increaseGuests = () => {
    const newGuests = table.guests + 1;
    setGuestsLocal(tableNumber, newGuests);
    if (newGuests > 0) setTableStatusLocal(tableNumber, TableStatus.Occupied);
  };

  const decreaseGuests = () => {
    const newGuests = Math.max(0, table.guests - 1);
    setGuestsLocal(tableNumber, newGuests);
    if (newGuests === 0 && table.currentOrderId!)
      setTableStatusLocal(tableNumber, TableStatus.Open);
  };

  const handleClearTable = () => {
    setGuestsLocal(tableNumber, 0);
    setTableStatusLocal(tableNumber, TableStatus.Open);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await updateTable(tableNumber, {
        guests: table.guests,
        status: table.status,
      });
      router.back();
    } catch (error) {
      console.error("Failed to update table:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="w-full flex-1 bg-gray-100">
      <Header title="Edit Table" onBack={() => router.back()} />
      <View className="p-6 flex-1 justify-between">
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

          <View className="flex-row items-center mb-4">
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

          {/* Clear Table Button */}
          <TouchableOpacity
            onPress={handleClearTable}
            activeOpacity={0.7}
            disabled={submitting}
            className={`mt-2 px-6 py-3 rounded-lg border border-gray-300 bg-gray-50 ${
              submitting ? "opacity-50" : ""
            }`}
          >
            <Text className="text-gray-700 font-semibold text-base">
              Clear Table
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className={`mt-6 bg-blue-500 py-4 rounded-lg items-center ${
            submitting ? "opacity-50" : ""
          }`}
        >
          <Text className="text-white font-bold text-lg">
            {submitting ? "Saving..." : "Submit Changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
