import { useMenuStore } from "@/stores/useMenuStore";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TakeOut() {
  const { categories, menuItems, loading } = useMenuStore();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg font-medium">Loading menu...</Text>
      </SafeAreaView>
    );
  }

  if (!categories.length) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg font-medium">No categories found</Text>
      </SafeAreaView>
    );
  }

  // Helper to get items for a category
  function getItemsForCategory(category: FoodCategory) {
    if (!category.itemIds?.length) return [];
    return menuItems.filter((item) => category.itemIds?.includes(item.id!));
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={categories}
        keyExtractor={(cat) => cat.id!}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item: category }) => {
          const items = getItemsForCategory(category);

          return (
            <View className="mb-8">
              <Text className="text-2xl font-semibold text-gray-900 mb-3">
                {category.name}
              </Text>

              {items.length ? (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id!}
                  scrollEnabled={false} // important so nested list doesn't scroll
                  renderItem={({ item }) => (
                    <View className="mb-2 p-3 bg-gray-100 rounded-xl">
                      <Text className="text-lg font-medium text-gray-800">
                        {item.name}
                      </Text>
                      <Text className="text-gray-600">
                        ${item.price.toFixed(2)}
                      </Text>
                    </View>
                  )}
                />
              ) : (
                <Text className="text-gray-500">No items in this category</Text>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
