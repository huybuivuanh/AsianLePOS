import { CategoryItemsView, getMenuItemsForCategory } from "@/features/takeout";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Text } from "react-native";

export default function LiveOrdersCategoryItems() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { categories, menuItems, loading } = useMenuStore();
  const { order } = useOrderStore();

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  const items = useMemo(
    () =>
      category ? getMenuItemsForCategory(category, menuItems) : [],
    [category, menuItems]
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
          params: { itemId: item.id!, orderType: order.orderType },
        })
      }
    />
  );
}
