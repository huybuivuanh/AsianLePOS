import { useStaffStore } from "@/stores/useStaffStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onConfirm: (staffName: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function StaffPickerModal({
  visible,
  onConfirm,
  onCancel,
  submitting,
}: Props) {
  const insets = useSafeAreaInsets();
  const staff = useStaffStore((s) => s.staff);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (visible) {
      setSearch("");
      setSelected(null);
    }
  }, [visible]);

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        className="flex-1 justify-center px-5"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {/* Backdrop */}
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onCancel}
          accessibilityLabel="Close staff picker"
        />

        {/* Card */}
        <View
          className="relative z-10 w-full max-w-md self-center rounded-2xl border border-stone-200 bg-white px-5 py-6 shadow-2xl"
          style={{ maxHeight: "80%" }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-stone-900">
              Who's taking this order?
            </Text>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <Ionicons name="close" size={22} color="#78716c" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search staff…"
            autoFocus={Platform.OS !== "web"}
            className="border border-gray-200 rounded-lg px-3 py-2 mb-3 text-base"
          />

          {/* Staff list */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id ?? item.name}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelected(item)}
                className={`py-3 px-4 rounded-xl mb-2 border ${
                  selected?.id === item.id
                    ? "bg-blue-50 border-blue-400"
                    : "bg-gray-50 border-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-medium text-base ${
                    selected?.id === item.id ? "text-blue-800" : "text-gray-900"
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Confirm button */}
          <TouchableOpacity
            onPress={() => selected && onConfirm(selected.name)}
            disabled={!selected || submitting}
            className={`mt-3 py-3.5 rounded-xl items-center ${
              !selected || submitting ? "bg-gray-300" : "bg-gray-800"
            }`}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base">
              {submitting ? "Submitting…" : "Confirm & Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
