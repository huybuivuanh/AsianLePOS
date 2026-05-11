import {
  MenuPickerBody,
  buildItemScreenParams,
  getFirstCategoryItems,
  getVisibleMenuItemsInCategoryOrder,
  useDebouncedMenuSearch,
} from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enums";
import Header from "@/ui/Header";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function TakeOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const totalItems = useOrderStore((state) => state.getTotalItems());

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

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Take Order" onBack={() => router.back()} />
      <View className="flex-1 p-4">
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
              params: buildItemScreenParams(item, {
                orderType: OrderType.DineIn,
              }),
            })
          }
        />
      </View>

      <View className="absolute bottom-10 left-0 right-0 px-4">
        <TouchableOpacity
          className="bg-gray-800 py-3 rounded-lg items-center"
          onPress={() => {
            router.push({
              pathname: "/dinein/review-order/[tableNumber]",
              params: { tableNumber },
            });
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
