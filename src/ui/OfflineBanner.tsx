import { useNetworkStore } from "@/stores/useNetworkStore";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, View } from "react-native";

export default function OfflineBanner() {
  const isConnected = useNetworkStore((s) => s.isConnected);

  if (isConnected) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black/45 justify-center items-center px-8">
        <View className="w-full max-w-sm rounded-2xl bg-white px-8 py-7 items-center border border-gray-200 shadow-lg">
          <Ionicons name="wifi-outline" size={40} color="#EF4444" />
          <Text className="mt-4 text-base font-semibold text-gray-800 text-center">
            No Internet Connection
          </Text>
          <Text className="mt-2 text-sm text-gray-500 text-center">
            Check your connection. The app will resume automatically when restored.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
