import {
  MenuPickerBody,
  buildItemScreenParams,
  getFirstCategoryItems,
  getVisibleMenuItemsInCategoryOrder,
  useDebouncedMenuSearch,
} from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useMenuStore } from "@/stores/useMenuStore";
import { useCartStore } from "@/stores/useCartStore";
import { OrderType } from "@/types/enums";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function TakeOut() {
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const totalItems = useCartStore((state) => state.getTotalItems());

  useFocusEffect(
    useCallback(() => {
      if (useCartStore.getState().order.orderType === OrderType.DineIn) {
        useCartStore.getState().clearOrder();
      }
    }, []),
  );

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

  if (loading) return <Text>Loading Menu...</Text>;
  if (!categories.length) return <Text>No categories found</Text>;

  return (
    <SafeAreaViewWrapper className="flex-1" includeBottomInset={false}>
      <View className="flex-1 px-4 pt-4">
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
                orderType: OrderType.TakeOut,
              }),
            })
          }
        />
      </View>

      <View className="absolute bottom-4 left-0 right-0 px-4">
        <TouchableOpacity
          className="bg-gray-800 py-3 rounded-lg items-center"
          onPress={() => {
            router.push("/takeout/review-order");
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
