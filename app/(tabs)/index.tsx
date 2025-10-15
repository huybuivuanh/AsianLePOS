import { useMenuStore } from "@/stores/useMenuStore";
import { useModalStore } from "@/stores/useModalStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryList from "../../components/takeout/CategoryList";
import SearchResults from "../../components/takeout/SearchResults";

export default function TakeOut() {
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const { openModal } = useModalStore();
  const [query, setQuery] = useState("");
  const { addItem } = useOrderStore();
  const { getTotalItems, setEditingOrder } = useOrderStore();

  const visibleItems = useMemo(() => {
    const allowedIds = new Set<number | string>();
    categories.forEach((cat) =>
      cat.itemIds?.forEach((id) => allowedIds.add(id))
    );
    return menuItems.filter((item) => allowedIds.has(item.id!));
  }, [categories, menuItems]);

  const categoryItemsMap = useMemo(() => {
    const map = new Map<string, typeof visibleItems>();
    categories.forEach((cat) => {
      const items = visibleItems.filter((item) =>
        cat.itemIds?.includes(item.id!)
      );
      map.set(cat.id!, items);
    });
    return map;
  }, [categories, visibleItems]);

  if (loading) return <Text>Loading...</Text>;
  if (!categories.length) return <Text>No categories found</Text>;

  const handleSelectItem = (item: MenuItem) => {
    openModal("itemSheet", {
      item,
      onSubmit: (orderItem: OrderItem) => {
        addItem(orderItem);
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <TextInput
        placeholder="Search for an item..."
        value={query}
        onChangeText={setQuery}
        className="border border-gray-300 rounded-lg p-3 mb-4"
      />

      {query.trim() ? (
        <SearchResults
          items={visibleItems}
          query={query}
          onSelectItem={handleSelectItem}
        />
      ) : (
        <CategoryList
          categories={categories}
          categoryItemsMap={categoryItemsMap}
          onSelectItem={handleSelectItem}
        />
      )}

      <View className="absolute bottom-4 left-0 right-0 px-4">
        <TouchableOpacity
          className="bg-gray-800 py-3 rounded-lg items-center"
          onPress={() => {
            setEditingOrder(false);
            router.push("/takeout/revieworder");
          }}
        >
          <Text className="text-white font-bold text-lg">
            View Order {`(${getTotalItems()})`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
