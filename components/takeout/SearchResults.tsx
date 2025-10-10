import { FlatList, Text, View } from "react-native";

type Props = {
  items: MenuItem[];
  query: string;
};

export default function SearchResults({ items, query }: Props) {
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!filteredItems.length) {
    return (
      <Text className="text-center text-gray-500 mt-4">No items found</Text>
    );
  }

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => item.id!}
      renderItem={({ item }) => (
        <View className="mb-3 p-3 bg-gray-100 rounded-lg">
          <Text className="text-lg font-medium text-gray-800">{item.name}</Text>
          <Text className="text-gray-600">${item.price.toFixed(2)}</Text>
        </View>
      )}
    />
  );
}
