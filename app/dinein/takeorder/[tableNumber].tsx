import Header from "@/components/ui/Header";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enum";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryList from "../../../components/takeout/CategoryList";
import SearchResults from "../../../components/takeout/SearchResults";

export default function TakeOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const [query, setQuery] = useState("");
  const totalItems = useOrderStore((state) => state.getTotalItems());
  const setEditingOrder = useOrderStore((state) => state.setEditingOrder);

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
    router.push({
      pathname: "/item/[itemId]",
      params: { itemId: item.id, orderType: OrderType.DineIn },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Take Order" onBack={() => router.back()} />
      <View className="p-4">
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
      </View>

      <View className="absolute bottom-10 left-0 right-0 px-4">
        <TouchableOpacity
          className="bg-gray-800 py-3 rounded-lg items-center"
          onPress={() => {
            setEditingOrder(false);
            router.push({
              pathname: "/dinein/reviewdineinorder/[tableNumber]",
              params: { tableNumber },
            });
          }}
        >
          <Text className="text-white font-bold text-lg">
            View Order {`(${totalItems})`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
