import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Example dummy data
const orders = [
  { id: "1", name: "Burger x2" },
  { id: "2", name: "Pizza x1" },
  { id: "3", name: "Soda x3" },
];

export default function OrderHistory() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100 p-5">
      <Text className="text-xl font-bold mb-4">Order History</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-lg mb-3 shadow">
            <Text className="text-gray-800 font-medium">{item.name}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
