import SafeAreaViewWrapper from "@/components/SafeAreaViewWrapper";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enum";
import { debounce } from "@/utils/memoryUtils";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CategoryList from "../../components/takeout/CategoryList";
import SearchResults from "../../components/takeout/SearchResults";

export default function TakeOut() {
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const totalItems = useOrderStore((state) => state.getTotalItems());
  const setEditingOrder = useOrderStore((state) => state.setEditingOrder);

  // Debounce search input to prevent excessive re-renders
  const debouncedSetQuery = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
      }, 300),
    []
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      debouncedSetQuery(value);
    },
    [debouncedSetQuery]
  );

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
      params: { itemId: item.id!, orderType: OrderType.TakeOut },
    });
  };

  return (
    <SafeAreaViewWrapper className="p-4">
      <View className="relative mb-4">
        <TextInput
          placeholder="Search for an item..."
          value={query}
          onChangeText={handleQueryChange}
          className="border border-gray-300 rounded-lg p-3 pr-12"
          returnKeyLabel="Hide"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <TouchableOpacity
          onPress={() => {
            setQuery("");
            setDebouncedQuery("");
          }}
          disabled={query.length === 0}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
            query.length === 0 ? "opacity-30" : ""
          }`}
        >
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {debouncedQuery.trim() ? (
        <SearchResults
          items={visibleItems}
          query={debouncedQuery}
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
            View Order {`(${totalItems})`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaViewWrapper>
  );
}
