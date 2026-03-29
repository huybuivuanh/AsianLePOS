import { useLiveOrdersStore } from "@/stores/useLiveOrdersStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface EditTableFormProps {
  tableNumber: string;
  onClose?: () => void;
}

export default function EditTableForm({
  tableNumber,
  onClose,
}: EditTableFormProps) {
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber)
  );
  const updateTable = useTableStore((state) => state.updateTable);
  const { updateOrderOnFirestore } = useOrderStore();
  const { dineInOrders } = useLiveOrdersStore();

  const [guests, setGuests] = useState<number>(0);
  const [status, setStatus] = useState<TableStatus>(TableStatus.Open);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (table) {
      setGuests(table.guests);
      setStatus(table.status);
    }
  }, [table]);

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
      const order = dineInOrders.find((o) => o.id === table.currentOrderId);
      if (order) {
        await updateOrderOnFirestore({ ...order, guests: guests });
      }
      onClose?.();
    } catch (error) {
      console.error("Failed to update table:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="mt-4 pt-4 border-t border-gray-200">
      <View className="flex-row items-center justify-center mb-4">
        <TouchableOpacity
          onPress={decreaseGuests}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full bg-white justify-center items-center shadow"
        >
          <Text className="text-2xl font-bold text-gray-700">−</Text>
        </TouchableOpacity>

        <Text className="mx-6 text-3xl font-bold text-gray-800">{guests}</Text>

        <TouchableOpacity
          onPress={increaseGuests}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full bg-white justify-center items-center shadow"
        >
          <Text className="text-2xl font-bold text-gray-700">＋</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons Row */}
      <View className="flex-row mt-4">
        {/* Cancel Button */}
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            disabled={submitting}
            className={`flex-1 bg-red-500 py-3 rounded-lg items-center ${
              submitting ? "opacity-50" : ""
            }`}
          >
            <Text className="text-white font-semibold text-base">Hide</Text>
          </TouchableOpacity>
        )}

        {/* Clear Table Button */}
        <TouchableOpacity
          onPress={handleClearTable}
          activeOpacity={0.7}
          disabled={submitting}
          className={`flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 ml-2 ${
            submitting ? "opacity-50" : ""
          }`}
        >
          <Text className="text-gray-700 font-semibold text-base text-center">
            Clear
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className={`flex-1 bg-blue-500 py-3 rounded-lg items-center ml-2 ${
            submitting ? "opacity-50" : ""
          }`}
        >
          <Text className="text-white font-bold text-base">
            {submitting ? "Saving..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
