import {
  MenuPickerBody,
  buildItemScreenParams,
  getVisibleMenuItemsInCategoryOrder,
  useDebouncedMenuSearch,
} from "@/features/takeout";
import SafeAreaViewWrapper from "@/layout/SafeAreaViewWrapper";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enums";
import { useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function TakeOut() {
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const totalItems = useOrderStore((state) => state.getTotalItems());

  const { query, debouncedQuery, handleQueryChange, clearSearch, searching } =
    useDebouncedMenuSearch();

  const searchItems = useMemo(
    () => getVisibleMenuItemsInCategoryOrder(categories, menuItems),
    [categories, menuItems],
  );

  if (loading) return <Text>Loading...</Text>;
  if (!categories.length) return <Text>No categories found</Text>;

  return (
    <SafeAreaViewWrapper className="flex-1">
      <View className="flex-1 px-4 pt-4">
        <MenuPickerBody
          query={query}
          debouncedQuery={debouncedQuery}
          searching={searching}
          onQueryChange={handleQueryChange}
          onClearSearch={clearSearch}
          searchItems={searchItems}
          onSelectSearchItem={(item) =>
            router.push({
              pathname: "/item/[itemId]",
              params: buildItemScreenParams(item, {
                orderType: OrderType.TakeOut,
              }),
            })
          }
          categories={categories}
          onSelectCategory={(cat) =>
            router.push(`/takeout/category/${cat.id!}` as Href)
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
