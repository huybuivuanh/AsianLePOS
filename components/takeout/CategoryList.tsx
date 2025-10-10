import { FlatList } from "react-native";
import CategoryItem from "./CategoryItem";

type Props = {
  categories: FoodCategory[];
  categoryItemsMap: Map<string, MenuItem[]>;
};

export default function CategoryList({ categories, categoryItemsMap }: Props) {
  return (
    <FlatList
      data={categories}
      keyExtractor={(cat) => cat.id!}
      contentContainerStyle={{ paddingBottom: 100 }}
      renderItem={({ item: category }) => {
        const items = categoryItemsMap.get(category.id!) ?? [];
        return <CategoryItem category={category} items={items} />;
      }}
    />
  );
}
