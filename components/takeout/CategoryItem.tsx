import { FlatList, Text, View } from "react-native";

type Props = {
  category: FoodCategory;
  items: MenuItem[];
};

export default function CategoryItem({ category, items }: Props) {
  return (
    <View className="mb-8">
      <Text className="text-2xl font-semibold text-gray-900 mb-3">
        {category.name}
      </Text>

      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id!}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="mb-2 p-3 bg-gray-100 rounded-xl">
              <Text className="text-lg font-medium text-gray-800">
                {item.name}
              </Text>
              <Text className="text-gray-600">${item.price.toFixed(2)}</Text>
            </View>
          )}
        />
      ) : (
        <Text className="text-gray-500">No items in this category</Text>
      )}
    </View>
  );
}
