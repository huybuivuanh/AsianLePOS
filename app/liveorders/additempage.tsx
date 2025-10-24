import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CategoryList from "../../components/takeout/CategoryList";
import SearchResults from "../../components/takeout/SearchResults";

export default function AddItemPage() {
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const [query, setQuery] = useState("");
  const { order } = useOrderStore();

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
      params: { itemId: item.id!, orderType: order.orderType },
    });
  };

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Add Item" onBack={() => router.back()} />
      <View className="flex-1 bg-white p-4 pt-6">
        <View className="relative mb-4">
          <TextInput
            placeholder="Search for an item..."
            value={query}
            onChangeText={setQuery}
            className="border border-gray-300 rounded-lg p-3 pr-12"
            returnKeyLabel="Hide"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TouchableOpacity
            onPress={() => setQuery("")}
            disabled={query.length === 0}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
              query.length === 0 ? "opacity-30" : ""
            }`}
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

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
    </SafeAreaViewWrapper>
  );
}
