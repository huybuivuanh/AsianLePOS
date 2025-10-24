import { FlatList } from "react-native";
import CategoryItem from "./CategoryItem";

type Props = {
  categories: FoodCategory[];
  categoryItemsMap: Map<string, MenuItem[]>;
  onSelectItem: (item: MenuItem) => void; // pass only ID
};

export default function CategoryList({
  categories,
  categoryItemsMap,
  onSelectItem,
}: Props) {
  return (
    <FlatList
      keyboardShouldPersistTaps="always"
      data={categories}
      keyExtractor={(cat) => cat.id!}
      contentContainerStyle={{ paddingBottom: 100 }}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={10}
      initialNumToRender={5}
      updateCellsBatchingPeriod={50}
      renderItem={({ item: category }) => {
        const items = categoryItemsMap.get(category.id!) ?? [];
        return (
          <CategoryItem
            category={category}
            items={items}
            onSelectItem={onSelectItem}
          />
        );
      }}
    />
  );
}
