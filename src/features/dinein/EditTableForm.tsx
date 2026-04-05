import { useActiveDineInOrdersStore } from "@/stores/useActiveDineInOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
  const updateTable = useTableStore((state) => state.updateTable);
  const { updateOrderOnFirestore } = useOrderStore();
  const { activeDineInOrders } = useActiveDineInOrdersStore();

  const [guests, setGuests] = useState<number>(0);
  const [status, setStatus] = useState<TableStatus>(TableStatus.Open);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !table) return;
    setGuests(table.guests);
    setStatus(table.status);
  }, [visible, table]);

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
    if (newGuests === 0) setStatus(TableStatus.Open);
  };

  const handleClearTable = () => {
    setGuests(0);
    if (table.currentOrderId === null) setStatus(TableStatus.Open);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await updateTable(tableNumber, {
        guests,
        status,
      });
      const order = activeDineInOrders.find(
        (o) => o.id === table.currentOrderId,
      );
      if (order) {
        await updateOrderOnFirestore({ ...order, guests: guests });
      }
      onDismiss();
    } catch (error) {
      console.error("Failed to update table:", error);
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
          className="flex-1 mr-2 py-3 rounded-xl bg-red-500"
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
          <Text className="text-white text-center font-semibold">
            {submitting ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
