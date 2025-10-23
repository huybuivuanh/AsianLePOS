// components/ui/Header.tsx
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

export default function Header({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-gray-400">
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={40} color="white" />
      </TouchableOpacity>
      <Text className="text-white text-xl font-semibold">{title}</Text>
      {/* spacer */}
      <View style={{ width: 30 }} />
    </View>
  );
}
