import { useMenuStore } from "@/stores/useMenuStore";
import { useMemo, useState } from "react";
import { Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryList from "../../../components/takeout/CategoryList";
import SearchResults from "../../../components/takeout/SearchResults";

export default function TakeOut() {
  const { categories, menuItems, loading } = useMenuStore();
  const [query, setQuery] = useState("");

  // --- Compute visible items (only those referenced by categories) ---
  const visibleItems = useMemo(() => {
    const allowedIds = new Set<number | string>();
    categories.forEach((cat) =>
      cat.itemIds?.forEach((id) => allowedIds.add(id))
    );
    return menuItems.filter((item) => allowedIds.has(item.id!));
  }, [categories, menuItems]);

  // --- Precompute items per category for default view ---
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

  // --- Early returns ---
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

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      {/* Search bar */}
      <TextInput
        placeholder="Search for an item..."
        value={query}
        onChangeText={setQuery}
        className="border border-gray-300 rounded-lg p-3 mb-4"
      />

      {/* Conditional rendering */}
      {query.trim() ? (
        <SearchResults items={visibleItems} query={query} />
      ) : (
        <CategoryList
          categories={categories}
          categoryItemsMap={categoryItemsMap}
        />
      )}
    </SafeAreaView>
  );
}
