import {
  CategoryItemsView,
  buildItemScreenParams,
  getMenuItemsForCategory,
} from "@/features/takeout";
import { useMenuStore } from "@/stores/useMenuStore";
import { OrderType } from "@/types/enums";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Text } from "react-native";

export default function DineInCategoryItems() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{
    tableNumber: string;
    categoryId: string;
  }>();
  const { categories, menuItems, loading } = useMenuStore();

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const items = useMemo(
    () => (category ? getMenuItemsForCategory(category, menuItems) : []),
    [category, menuItems],
  );

  if (loading) return <Text>Loading...</Text>;
  if (!category) return <Text>Category not found</Text>;

  return (
    <CategoryItemsView
      title={category.name}
      items={items}
      onBack={() => router.back()}
      onSelectItem={(item) =>
        router.push({
          pathname: "/item/[itemId]",
          params: buildItemScreenParams(item, {
            orderType: OrderType.DineIn,
            menuEntry: "category",
          }),
        })
      }
    />
  );
}
