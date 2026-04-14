import { useTableStore } from "@/stores/useTableStore";
import { TableStatus } from "@/types/enums";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EditTableForm from "./EditTableForm";

const WEB_BACKDROP =
  Platform.OS === "web" ? ({ backdropFilter: "blur(8px)" } as object) : {};

export default function TableInfoCard({ tableNumber }: { tableNumber: string }) {
  const table = useTableStore((s) =>
    s.tables.find((t) => t.tableNumber === tableNumber),
  );
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  if (!table) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-4">
        <Text className="text-base font-semibold text-gray-600">Table not found</Text>
      </View>
    );
  }

  const statusColor =
    table.status === TableStatus.Open ? "text-green-600" : "text-orange-400";

  return (
    <View className="w-full px-4 py-2 pb-4">
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 shadow-md active:opacity-90"
        android_ripple={{ color: "#e5e7eb", borderless: false }}
      >
        <Text
          className={`shrink-0 text-base font-semibold ${statusColor}`}
          numberOfLines={1}
        >
          {table.status}
        </Text>
        <Text
          className="min-w-0 flex-1 text-center text-gray-500 text-base"
          numberOfLines={1}
        >
          Guests:{" "}
          <Text className="font-semibold text-gray-800">{table.guests}</Text>
        </Text>
        <View className="shrink-0 rounded-lg bg-blue-500 px-3.5 py-1.5">
          <Text className="text-center text-white text-sm font-semibold">
            Edit table
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setOpen(false)}
            style={{ backgroundColor: "rgba(0,0,0,0.5)", ...WEB_BACKDROP }}
          >
            <View
              className="flex-1 justify-start px-4 pb-5"
              style={{ paddingTop: insets.top + 16 }}
            >
              <TouchableOpacity
                activeOpacity={1}
                className="bg-white border border-gray-200 rounded-2xl p-4"
                onPress={(e) => e.stopPropagation?.()}
              >
                <EditTableForm
                  visible={open}
                  tableNumber={tableNumber}
                  onDismiss={() => setOpen(false)}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
