import SafeAreaViewWrapper from "@/components/layout/SafeAreaViewWrapper";
import Header from "@/components/ui/Header";
import {
  CategoryGrid,
  SearchResults,
  getVisibleMenuItemsInCategoryOrder,
} from "@/features/takeout";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { OrderType } from "@/types/enums";
import { debounce } from "@/utils/memory-utils";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  type Href,
} from "expo-router";
import { X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function TakeOrder() {
  const { tableNumber } = useLocalSearchParams<{ tableNumber: string }>();
  const router = useRouter();
  const { categories, menuItems, loading } = useMenuStore();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const totalItems = useOrderStore((state) => state.getTotalItems());

  const debouncedSetQuery = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value);
      }, 300),
    [],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      debouncedSetQuery(value);
    },
    [debouncedSetQuery],
  );

  const searchItems = useMemo(
    () => getVisibleMenuItemsInCategoryOrder(categories, menuItems),
    [categories, menuItems],
  );

  useFocusEffect(
    useCallback(() => {
      setQuery("");
      setDebouncedQuery("");
    }, []),
  );

  if (loading) return <Text>Loading...</Text>;
  if (!categories.length) return <Text>No categories found</Text>;

  const handleSelectItem = (item: MenuItem) => {
    router.push({
      pathname: "/item/[itemId]",
      params: {
        itemId: item.id!,
        orderType: OrderType.DineIn,
        menuEntry: "search",
      },
    });
  };

  const searching = debouncedQuery.trim().length > 0;

  return (
    <SafeAreaViewWrapper className="flex-1 bg-white">
      <Header title="Take Order" onBack={() => router.back()} />
      <View className="flex-1 p-4">
        <View className="relative mb-4">
          <TextInput
            placeholder="Search menu items..."
            value={query}
            onChangeText={handleQueryChange}
            className="border border-gray-300 rounded-lg p-3 pr-12"
            returnKeyLabel="Hide"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            autoCorrect={false}
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

        <View className="flex-1 -mx-4">
          {searching ? (
            <SearchResults
              items={searchItems}
              query={debouncedQuery}
              onSelectItem={handleSelectItem}
            />
          ) : (
            <CategoryGrid
              categories={categories}
              onSelectCategory={(cat) =>
                router.push(
                  `/dinein/take-order/${tableNumber}/category/${cat.id!}` as Href,
                )
              }
            />
          )}
        </View>
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
