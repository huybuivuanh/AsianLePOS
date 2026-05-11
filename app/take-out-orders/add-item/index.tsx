import {
  MenuPickerBody,
  buildItemScreenParams,
  getFirstCategoryItems,
  getVisibleMenuItemsInCategoryOrder,
  useDebouncedMenuSearch,
} from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { OrderType } from "@/types/enums";
import Header from "@/ui/Header";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function AddItemPage() {
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const { order } = useCartStore();

  const { query, debouncedQuery, handleQueryChange, clearSearch } =
    useDebouncedMenuSearch();

  const items = useMemo(
    () => getVisibleMenuItemsInCategoryOrder(categories, menuItems),
    [categories, menuItems],
  );

  const browseItems = useMemo(
    () => getFirstCategoryItems(categories, menuItems),
    [categories, menuItems],
  );

  if (loading) return <Text>Loading...</Text>;
  if (!categories.length) return <Text>No categories found</Text>;

  const orderType = order.orderType ?? OrderType.TakeOut;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Add Item" onBack={() => router.back()} />
      <View className="flex-1 bg-white p-4 pt-6">
        <MenuPickerBody
          query={query}
          debouncedQuery={debouncedQuery}
          onQueryChange={handleQueryChange}
          onClearSearch={clearSearch}
          items={items}
          browseItems={browseItems}
          onSelectItem={(item) =>
            router.push({
              pathname: "/item/[itemId]",
              params: buildItemScreenParams(item, { orderType }),
            })
          }
        />
        <View className="absolute bottom-4 left-0 right-0 px-4">
          <TouchableOpacity
            className="bg-gray-800 py-3 rounded-lg items-center"
            onPress={() => {
              router.back();
            }}
          >
            <Text className="text-white font-bold text-lg">
              Back to Order {`(${order.orderItems?.length ?? 0})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaViewWrapper>
  );
}
