import { useMenuStore } from "@/stores/useMenuStore";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TakeOut() {
  const { categories } = useMenuStore();

  return (
    <SafeAreaView>
      <Text>Take Order</Text>
    </SafeAreaView>
  );
}
