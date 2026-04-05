import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import EditTableForm from "./EditTableForm";

export default function TableInfoCard({
  tableNumber,
}: {
  tableNumber: string;
}) {
  const table = useTableStore((state) =>
    state.tables.find((t) => t.tableNumber === tableNumber),
  );
  const [modalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const openModal = () => setModalVisible(true);

  if (!table) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-6">
        <Text className="text-lg font-bold text-gray-600">Table not found</Text>
      </View>
    );
  }

  const statusColor =
    table.status === TableStatus.Open ? "text-green-600" : "text-orange-400";

  return (
    <View className="w-full px-4 pt-2 pb-4">
      <Pressable
        onPress={openModal}
        className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 active:opacity-90"
        android_ripple={{ color: "#e5e7eb", borderless: false }}
      >
        <View className="items-center justify-center">
          <Text
            className={`text-lg font-semibold mb-3 text-center ${statusColor}`}
          >
            {table.status}
          </Text>

          <Text className="text-gray-500 text-base text-center mb-4">
            Number of Guests:{" "}
            <Text className="font-bold text-gray-800">{table.guests}</Text>
          </Text>

          <View className="px-4 py-2 rounded-md bg-blue-500">
            <Text className="text-white font-semibold text-center">
              Edit table
            </Text>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={closeModal}
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            ...(Platform.OS === "web"
              ? ({ backdropFilter: "blur(8px)" } as object)
              : {}),
          }}
        >
          <View className="flex-1 justify-center px-4 pb-6">
            <TouchableOpacity
              activeOpacity={1}
              className="bg-white border border-gray-200 rounded-2xl p-4"
              onPress={(e: any) => e?.stopPropagation?.()}
            >
              <EditTableForm
                visible={modalVisible}
                tableNumber={tableNumber}
                onDismiss={closeModal}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
