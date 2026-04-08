import { FlashList } from "@shopify/flash-list";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { sortCategoriesByOrder } from "../../../utils/menuOrdering";

type Props = {
  categories: FoodCategory[];
  onSelectCategory: (category: FoodCategory) => void;
};

const GAP = 12;
const H_PADDING = 16;

export default function CategoryGrid({ categories, onSelectCategory }: Props) {
  const { width } = useWindowDimensions();

  const numColumns = useMemo(() => {
    if (width < 420) return 2;
    if (width < 640) return 3;
    if (width < 900) return 4;
    return 5;
  }, [width]);

  const sorted = useMemo(() => sortCategoriesByOrder(categories), [categories]);

  const itemWidth = useMemo(() => {
    const totalGap = GAP * (numColumns - 1);
    return (width - H_PADDING * 2 - totalGap) / numColumns;
  }, [width, numColumns]);

  if (!sorted.length) {
    return (
      <Text className="text-center text-gray-500 mt-4">No categories</Text>
    );
  }

  return (
    <FlashList
      key={numColumns}
      style={{ flex: 1, minHeight: 0, width: "100%", alignSelf: "stretch" }}
      data={sorted}
      keyExtractor={(c, index) => c.id ?? `${c.name}-${index}`}
      numColumns={numColumns}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{
        paddingBottom: 100,
        paddingHorizontal: H_PADDING,
      }}
      extraData={{ numColumns, itemWidth }}
      renderItem={({ item, index }) => {
        const isLastInRow = (index + 1) % numColumns === 0;
        return (
          <TouchableOpacity
            onPress={() => onSelectCategory(item)}
            style={{
              width: itemWidth,
              marginRight: isLastInRow ? 0 : GAP,
              marginBottom: GAP,
            }}
            className="min-h-[88px] p-3 bg-gray-100 rounded-xl justify-center bg-sky-300"
            activeOpacity={0.7}
          >
            <Text
              className="text-base font-semibold text-gray-900 text-center"
              numberOfLines={3}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
