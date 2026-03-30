import SafeAreaViewWrapper from "@/components/layout/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import {
  MenuPickerBody,
  buildItemScreenParams,
  getVisibleMenuItemsInCategoryOrder,
  useDebouncedMenuSearch,
} from "@/features/takeout";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enums";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function TakeOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const totalItems = useOrderStore((state) => state.getTotalItems());

  const {
    query,
    debouncedQuery,
    handleQueryChange,
    clearSearch,
    searching,
  } = useDebouncedMenuSearch();

  const searchItems = useMemo(
    () => getVisibleMenuItemsInCategoryOrder(categories, menuItems),
    [categories, menuItems]
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
          searching={searching}
          onQueryChange={handleQueryChange}
          onClearSearch={clearSearch}
          searchItems={searchItems}
          onSelectSearchItem={(item) =>
            router.push({
              pathname: "/item/[itemId]",
              params: buildItemScreenParams(item, {
                orderType: OrderType.DineIn,
                menuEntry: "search",
              }),
            })
          }
          categories={categories}
          onSelectCategory={(cat) =>
            router.push(
              `/dinein/take-order/${tableNumber}/category/${cat.id!}` as Href
            )
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
