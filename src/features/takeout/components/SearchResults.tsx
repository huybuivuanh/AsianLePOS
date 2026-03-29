import { FlatList, Text, TouchableOpacity, View } from "react-native";

type Props = {
  items: MenuItem[];
  query: string;
  onSelectItem: (item: MenuItem) => void;
};

export default function SearchResults({ items, query, onSelectItem }: Props) {
  const q = query.trim();
  const displayItems = q
    ? items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()))
    : items;

  if (!items.length) {
    return (
      <Text className="text-center text-gray-500 mt-4">No menu items</Text>
    );
  }

  if (q && !displayItems.length) {
    return (
      <Text className="text-center text-gray-500 mt-4">No items found</Text>
    );
  }

  return (
    <View className="pl-4 pr-4">
      <FlatList
        keyboardShouldPersistTaps="always"
        data={displayItems}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={{ paddingBottom: 80 }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={12}
        updateCellsBatchingPeriod={50}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mb-3 p-3 bg-gray-100 rounded-lg"
            onPress={() => onSelectItem(item)}
          >
            <Text className="text-lg font-medium text-gray-800">
              {item.name}
            </Text>
            <Text className="text-gray-600">${item.price.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
