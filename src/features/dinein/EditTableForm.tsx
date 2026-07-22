import { updateTableGuestsAndStatus } from "@/services/tableService";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";

interface EditTableFormProps {
  tableNumber: string;
  /** When true, draft guests/status reset from the live table row. */
  visible: boolean;
  onDismiss: () => void;
}

export default function EditTableForm({
  tableNumber,
  visible,
  onDismiss,
}: EditTableFormProps) {
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );
  const upsertTable = useTableStore((state) => state.upsertTable);

  const [guests, setGuests] = useState<number>(0);
  const [status, setStatus] = useState<TableStatus>(TableStatus.Open);
  const [submitting, setSubmitting] = useState(false);

  // Keep a ref to the latest table so the open-effect can read it
  // without being re-triggered by every Firestore snapshot.
  const tableRef = useRef(table);
  useEffect(() => { tableRef.current = table; }, [table]);

  // Only reset local draft when the modal opens, not on every live update.
  useEffect(() => {
    if (!visible || !tableRef.current) return;
    setGuests(tableRef.current.guests);
    setStatus(tableRef.current.status);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!table) {
    return null;
  }

  const increaseGuests = () => {
    const newGuests = guests + 1;
    setGuests(newGuests);
    if (newGuests > 0 && status === TableStatus.Open)
      setStatus(TableStatus.Occupied);
  };

  const decreaseGuests = () => {
    const newGuests = Math.max(0, guests - 1);
    setGuests(newGuests);
    if (newGuests === 0 && table.currentOrderId === null)
      setStatus(TableStatus.Open);
  };

  const handleClearTable = () => {
    setGuests(0);
    if (table.currentOrderId === null) setStatus(TableStatus.Open);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const result = await updateTableGuestsAndStatus(table.id, table.currentOrderId, {
        guests,
        status,
      });

      if (result.conflict) {
        if (result.liveTable) upsertTable(result.liveTable);
        Alert.alert(
          "Table Updated",
          "This table already has an order in progress. Showing the latest info.",
        );
      }

      onDismiss();
    } catch (error) {
      console.error("Failed to update table:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="items-center w-full">
      <View className="flex-row justify-between items-center mb-4 w-full">
        <Text className="text-gray-900 font-bold text-lg">Edit table</Text>
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.7}
          className="px-3 py-2 rounded-full bg-gray-200 border border-gray-300"
        >
          <Text className="text-gray-800 font-semibold text-sm">Close</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-center mb-4 w-full">
        <TouchableOpacity
          onPress={decreaseGuests}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full bg-gray-100 justify-center items-center border border-gray-200"
        >
          <Text className="text-2xl font-bold text-gray-700">−</Text>
        </TouchableOpacity>

        <Text className="mx-6 text-3xl font-bold text-gray-800">{guests}</Text>

        <TouchableOpacity
          onPress={increaseGuests}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full bg-gray-100 justify-center items-center border border-gray-200"
        >
          <Text className="text-2xl font-bold text-gray-700">＋</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleClearTable}
        activeOpacity={0.7}
        disabled={submitting}
        className={`mb-4 py-3 rounded-xl border border-gray-300 bg-gray-50 w-full max-w-xs self-center ${
          submitting ? "opacity-50" : ""
        }`}
      >
        <Text className="text-gray-700 font-semibold text-base text-center">
          Clear
        </Text>
      </TouchableOpacity>

      <View className="flex-row justify-center w-full max-w-sm self-center">
        <TouchableOpacity
          onPress={onDismiss}
          disabled={submitting}
          className={`flex-1 mr-2 py-3 rounded-xl bg-red-500 ${submitting ? "opacity-50" : ""}`}
        >
          <Text className="text-gray-800 text-center font-semibold">
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className={`flex-1 ml-2 py-3 rounded-xl bg-gray-900 ${
            submitting ? "opacity-50" : ""
          }`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white text-center font-semibold">Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
