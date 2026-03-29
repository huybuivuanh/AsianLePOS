import React, { useMemo } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { sortCategoriesByOrder } from "../menuOrdering";

type Props = {
  categories: FoodCategory[];
  onSelectCategory: (category: FoodCategory) => void;
};

const GAP = 12;
const H_PADDING = 16;

export default function CategoryGrid({
  categories,
  onSelectCategory,
}: Props) {
  const { width } = useWindowDimensions();

  const numColumns = useMemo(() => {
    if (width < 420) return 2;
    if (width < 640) return 3;
    if (width < 900) return 4;
    return 5;
  }, [width]);

  const sorted = useMemo(
    () => sortCategoriesByOrder(categories),
    [categories]
  );

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
    <FlatList
      key={numColumns}
      data={sorted}
      keyExtractor={(c) => c.id ?? c.name}
      numColumns={numColumns}
      keyboardShouldPersistTaps="always"
      columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
      contentContainerStyle={{
        paddingBottom: 100,
        paddingHorizontal: H_PADDING,
      }}
      removeClippedSubviews={true}
      maxToRenderPerBatch={12}
      windowSize={7}
      initialNumToRender={12}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelectCategory(item)}
          style={{ width: itemWidth }}
          className="min-h-[88px] p-3 bg-gray-100 rounded-xl justify-center"
          activeOpacity={0.7}
        >
          <Text
            className="text-base font-semibold text-gray-900 text-center"
            numberOfLines={3}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}
