import { FlatList, Text, TouchableOpacity } from "react-native";

type Props = {
  items: MenuItem[];
  query: string;
  onSelectItem: (item: MenuItem) => void;
};

export default function SearchResults({ items, query, onSelectItem }: Props) {
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
        <TouchableOpacity
          className="mb-3 p-3 bg-gray-100 rounded-lg"
          onPress={() => onSelectItem(item)} // open sheet
        >
          <Text className="text-lg font-medium text-gray-800">{item.name}</Text>
          <Text className="text-gray-600">${item.price.toFixed(2)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
